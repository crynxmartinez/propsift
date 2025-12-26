/**
 * DockInsight 2.2.2 Widget API
 * 
 * POST /api/analytics/widget
 * 
 * Executes widget queries with caching and returns aggregated data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { 
  compileQuery, 
  computePermissionHash,
  buildDefaultPermissions 
} from '@/lib/analytics/compiler'
import { 
  fetchWithCache 
} from '@/lib/analytics/cache'
import { 
  executeMetric,
  executeGroupedCount 
} from '@/lib/analytics/executor'
import { getDimension } from '@/lib/analytics/registry'
import type { 
  WidgetQueryInput, 
  CompileCtx,
  PermissionSet 
} from '@/lib/analytics/registry/types'

/**
 * Build CompileCtx from authenticated user
 */
async function buildCompileCtx(
  userId: string,
  ownerId: string,
  role: string
): Promise<CompileCtx> {
  // Get user timezone
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true }
  })
  
  const timezone = user?.timezone || 'America/Chicago'
  
  // Build permissions
  const permissions: PermissionSet = {
    entities: buildDefaultPermissions(role)
  }
  
  // Compute permission hash
  const ctx: CompileCtx = {
    tenantId: ownerId,
    userId,
    role: role as 'owner' | 'super_admin' | 'admin' | 'member',
    timezone,
    permissions,
    permissionHash: ''  // Will be computed below
  }
  
  ctx.permissionHash = computePermissionHash(ctx)
  
  return ctx
}

/**
 * POST handler for widget queries
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }
    
    // Parse request body
    const body = await request.json()
    const input: WidgetQueryInput = body
    
    // Validate required fields
    if (!input.entityKey || !input.metric?.key) {
      return NextResponse.json(
        { error: 'Missing required fields: entityKey, metric.key' },
        { status: 400 }
      )
    }
    
    // Ensure filters is an array
    if (!input.filters) {
      input.filters = []
    }
    
    // Ensure globalFilters exists
    if (!input.globalFilters) {
      input.globalFilters = {}
    }
    
    // Build compile context
    const ctx = await buildCompileCtx(authUser.id, authUser.ownerId, authUser.role)
    
    // Compile query
    const compiled = compileQuery(input, ctx)
    
    // Execute with caching
    const result = await fetchWithCache(
      ctx.tenantId,
      compiled.deps,
      ctx.permissionHash,
      compiled.hash,
      async () => {
        // Check if we need grouped data (dimension specified)
        if (input.dimension) {
          const dimension = getDimension(input.dimension)
          if (dimension) {
            const grouped = await executeGroupedCount(compiled, dimension.field)
            return {
              type: 'grouped' as const,
              dimension: input.dimension,
              data: grouped,
              total: grouped.reduce((sum, g) => sum + g.count, 0)
            }
          }
        }
        
        // Single metric value
        const value = await executeMetric(compiled, input.metric)
        return {
          type: 'single' as const,
          value
        }
      }
    )
    
    return NextResponse.json({
      success: true,
      ...result,
      meta: {
        hash: compiled.hash,
        deps: compiled.deps,
        entityKey: compiled.entityKey
      }
    })
    
  } catch (error) {
    console.error('Widget API error:', error)
    
    // Handle known error types
    if (error instanceof Error) {
      if (error.name === 'QueryCompileError' || 
          error.name === 'DimensionGroupByError' ||
          error.name === 'UnknownEntityError') {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      
      if (error.name === 'PermissionDeniedError') {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
