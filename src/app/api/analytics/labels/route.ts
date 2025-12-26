/**
 * DockInsight 2.2.2 Labels API
 * 
 * GET /api/analytics/labels
 * 
 * Returns label data (name, color) for entity IDs.
 * Uses separate labelVersion for caching.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { getLabels } from '@/lib/analytics/cache'

/**
 * GET handler for label lookups
 * 
 * Query params:
 * - entity: Entity type (tags, motivations, statuses, users)
 * - ids: Comma-separated list of IDs
 */
export async function GET(request: NextRequest) {
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
    
    // Parse query params
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const idsParam = searchParams.get('ids')
    
    if (!entity) {
      return NextResponse.json(
        { error: 'Missing required param: entity' },
        { status: 400 }
      )
    }
    
    // Validate entity type
    const validEntities = ['tags', 'motivations', 'statuses', 'users']
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Invalid entity. Must be one of: ${validEntities.join(', ')}` },
        { status: 400 }
      )
    }
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing required param: ids' },
        { status: 400 }
      )
    }
    
    // Parse IDs
    const ids = idsParam.split(',').filter(id => id.trim())
    
    if (ids.length === 0) {
      return NextResponse.json({ labels: {} })
    }
    
    // Limit to 100 IDs per request
    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 IDs per request' },
        { status: 400 }
      )
    }
    
    // Get labels
    const labels = await getLabels(authUser.ownerId, entity, ids)
    
    return NextResponse.json({
      success: true,
      labels
    })
    
  } catch (error) {
    console.error('Labels API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
