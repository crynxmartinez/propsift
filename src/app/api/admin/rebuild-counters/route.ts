/**
 * DockInsight 2.2.2 Admin API - Rebuild Counters
 * 
 * POST /api/admin/rebuild-counters
 * 
 * Triggers counter reconciliation for the current tenant.
 * Only accessible by owners.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { reconcileTenant } from '@/lib/analytics/counters'

/**
 * POST handler - Rebuild counters for tenant
 */
export async function POST(request: NextRequest) {
  try {
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
    
    // Only owners can rebuild counters
    if (authUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only account owners can rebuild counters' },
        { status: 403 }
      )
    }
    
    // Run reconciliation
    const result = await reconcileTenant(authUser.ownerId, {
      batchSize: 100
    })
    
    return NextResponse.json({
      success: true,
      message: 'Counter reconciliation completed',
      result: {
        processed: result.processed,
        fixed: result.fixed,
        errors: result.errors
      }
    })
    
  } catch (error) {
    console.error('Rebuild counters error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
