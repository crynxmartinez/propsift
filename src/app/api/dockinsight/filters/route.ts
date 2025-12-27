/**
 * DockInsight 3.0 - Filter Options API
 * 
 * GET /api/dockinsight/filters
 * Returns available filter options (markets, assignees, tags)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    // Get unique markets (states) from records
    const recordsWithStates = await prisma.record.findMany({
      where: {
        createdById: authUser.ownerId,
        propertyState: { not: null }
      },
      select: {
        propertyState: true
      },
      distinct: ['propertyState']
    })
    
    const markets = recordsWithStates
      .filter(r => r.propertyState)
      .map(r => ({ id: r.propertyState!, name: r.propertyState! }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Get team members (assignees)
    const assigneesResult = await prisma.user.findMany({
      where: {
        OR: [
          { id: authUser.ownerId },
          { accountOwnerId: authUser.ownerId }
        ],
        status: 'active'
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    })
    
    const assignees = assigneesResult.map(u => ({
      id: u.id,
      name: u.name
    }))

    // Get tags
    const tagsResult = await prisma.tag.findMany({
      where: {
        createdById: authUser.ownerId
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    })
    
    const tags = tagsResult.map(t => ({
      id: t.id,
      name: t.name
    }))

    return NextResponse.json({
      markets,
      assignees,
      tags
    })
    
  } catch (error) {
    console.error('Filters API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
