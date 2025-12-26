/**
 * DockInsight 2.2.2 Drilldown API
 * 
 * POST /api/analytics/drilldown
 * 
 * Returns paginated rows for a widget query with optional search.
 * 
 * v2.2.2 Contract:
 * - Recompile query server-side (never trust client)
 * - Rate limit: 10 requests/second/user
 * - Max pageSize: 100
 * - Page clamped to >= 1
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
import { executeDrilldown } from '@/lib/analytics/executor'
import { compileSearch } from '@/lib/analytics/executor/search'
import { cacheGet, cacheSet, cacheIncr } from '@/lib/analytics/cache'
import type { 
  WidgetQueryInput, 
  CompileCtx,
  PermissionSet 
} from '@/lib/analytics/registry/types'

const RATE_LIMIT_WINDOW = 1  // 1 second
const RATE_LIMIT_MAX = 10    // 10 requests per window
const MAX_PAGE_SIZE = 100

/**
 * Check rate limit for user
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:drilldown:${userId}:${Math.floor(Date.now() / 1000)}`
  const count = await cacheIncr(key)
  
  // Set expiry on first request
  if (count === 1) {
    await cacheSet(key, count, RATE_LIMIT_WINDOW + 1)
  }
  
  return count <= RATE_LIMIT_MAX
}

/**
 * Build CompileCtx from authenticated user
 */
async function buildCompileCtx(
  userId: string,
  ownerId: string,
  role: string
): Promise<CompileCtx> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true }
  })
  
  const timezone = user?.timezone || 'America/Chicago'
  
  const permissions: PermissionSet = {
    entities: buildDefaultPermissions(role)
  }
  
  const ctx: CompileCtx = {
    tenantId: ownerId,
    userId,
    role: role as 'owner' | 'super_admin' | 'admin' | 'member',
    timezone,
    permissions,
    permissionHash: ''
  }
  
  ctx.permissionHash = computePermissionHash(ctx)
  
  return ctx
}

/**
 * Drilldown request body
 */
interface DrilldownRequest {
  query: WidgetQueryInput
  page?: number
  pageSize?: number
  search?: string
}

/**
 * POST handler for drilldown queries
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
    
    // Check rate limit
    const allowed = await checkRateLimit(authUser.id)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 requests per second.' },
        { status: 429 }
      )
    }
    
    // Parse request body
    const body: DrilldownRequest = await request.json()
    const { query, page = 1, pageSize = 20, search } = body
    
    // Validate required fields
    if (!query?.entityKey) {
      return NextResponse.json(
        { error: 'Missing required field: query.entityKey' },
        { status: 400 }
      )
    }
    
    // Ensure filters and globalFilters exist
    if (!query.filters) query.filters = []
    if (!query.globalFilters) query.globalFilters = {}
    if (!query.metric) query.metric = { key: 'count' }
    
    // v2.2.2: Clamp page and pageSize
    const safePage = Math.max(1, page)
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize))
    
    // Build compile context
    const ctx = await buildCompileCtx(authUser.id, authUser.ownerId, authUser.role)
    
    // Recompile query server-side (never trust client)
    const compiled = compileQuery(query, ctx)
    
    // Compile search if provided
    const searchWhere = search ? compileSearch(query.entityKey, search) : undefined
    
    // Execute drilldown
    const { rows, total } = await executeDrilldown(
      compiled,
      safePage,
      safePageSize,
      searchWhere ?? undefined
    )
    
    return NextResponse.json({
      success: true,
      rows,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
      meta: {
        entityKey: compiled.entityKey,
        search: search || null
      }
    })
    
  } catch (error) {
    console.error('Drilldown API error:', error)
    
    if (error instanceof Error) {
      if (error.name === 'QueryCompileError' || 
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
