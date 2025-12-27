/**
 * DockInsight 3.0 - Tables API
 * 
 * GET /api/dockinsight/tables
 * Returns table data for recent activity and top assignees
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const isExecutiveView = searchParams.get('executive') === 'true'
    const market = searchParams.get('market') || undefined
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const temperature = searchParams.get('temperature')?.split(',').filter(Boolean) || undefined
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || undefined
    const motivationIds = searchParams.get('motivationIds')?.split(',').filter(Boolean) || undefined
    const callReady = searchParams.get('callReady')
    
    // Build base where clause - include legacy records with null createdById
    const baseWhere: any = {
      OR: [
        { createdById: authUser.ownerId },
        { createdById: null }
      ]
    }
    
    // Apply filters
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }
    
    if (market) {
      baseWhere.propertyState = market
    }
    
    if (temperature && temperature.length > 0) {
      baseWhere.temperature = { in: temperature }
    }
    
    if (tagIds && tagIds.length > 0) {
      baseWhere.recordTags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }
    
    if (motivationIds && motivationIds.length > 0) {
      baseWhere.recordMotivations = {
        some: {
          motivationId: { in: motivationIds }
        }
      }
    }
    
    if (callReady === 'true') {
      baseWhere.isComplete = true
    } else if (callReady === 'false') {
      baseWhere.isComplete = false
    }

    // Fetch table data in parallel
    const [recentActivity, topAssignees] = await Promise.all([
      getRecentActivity(authUser.ownerId, baseWhere, isExecutiveView, authUser.id),
      getTopAssignees(authUser.ownerId, baseWhere, isExecutiveView)
    ])

    return NextResponse.json({
      recentActivity,
      topAssignees
    })
    
  } catch (error) {
    console.error('Tables API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getRecentActivity(
  ownerId: string, 
  baseWhere: any, 
  isExecutiveView: boolean,
  userId: string
) {
  // Get recent records with activity
  const records = await prisma.record.findMany({
    where: baseWhere,
    select: {
      id: true,
      ownerFullName: true,
      updatedAt: true,
      createdAt: true,
      assignedToId: true,
      temperature: true,
      assignedTo: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  })

  return records.map(r => {
    // Determine activity type based on timestamps
    const createdTime = r.createdAt.getTime()
    const updatedTime = r.updatedAt.getTime()
    const timeDiff = Math.abs(updatedTime - createdTime)
    
    // If created and updated are within 1 second, it's a new record
    let activityType = timeDiff < 1000 ? 'Created' : 'Updated'
    
    return {
      id: r.id,
      recordName: r.ownerFullName || 'Unknown',
      assigneeId: r.assignedToId,
      assigneeName: r.assignedTo?.name || null,
      lastActivityAt: r.updatedAt.toISOString(),
      activityType,
      temperature: r.temperature
    }
  })
}

async function getTopAssignees(ownerId: string, baseWhere: any, isExecutiveView: boolean) {
  if (!isExecutiveView) {
    return []
  }

  // Get assignee counts
  const assigneeCounts = await prisma.record.groupBy({
    by: ['assignedToId'],
    where: {
      ...baseWhere,
      assignedToId: { not: null }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  })

  if (assigneeCounts.length === 0) return []

  // Get assignee names
  const assigneeIds = assigneeCounts
    .map(a => a.assignedToId)
    .filter((id): id is string => id !== null)
  
  const assignees = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, name: true }
  })

  const assigneeMap = new Map(assignees.map(a => [a.id, a.name]))

  return assigneeCounts.map(ac => ({
    id: ac.assignedToId || '',
    name: ac.assignedToId ? assigneeMap.get(ac.assignedToId) || 'Unknown' : 'Unknown',
    recordCount: ac._count.id
  }))
}
