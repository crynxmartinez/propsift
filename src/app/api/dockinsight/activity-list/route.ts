/**
 * DockInsight 3.0 - Activity List API
 * 
 * GET /api/dockinsight/activity-list
 * Returns paginated activity list with search and source filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// Source group mapping
const SOURCE_TO_GROUP: Record<string, string> = {
  'Property Details Page': 'CRM',
  'Conversation Board': 'Comments',
  'Bulk Actions': 'Bulk Actions',
  'Bulk Import': 'Bulk Import',
  'Board': 'Board',
  'Automation': 'Automation'
}

function getDateRange(preset: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date
  let endDate: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  switch (preset) {
    case 'today':
      startDate = today
      break
    case 'yesterday':
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      endDate = today
      break
    case 'last_7_days':
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      break
    case 'last_30_days':
    default:
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      break
  }

  return { startDate, endDate }
}

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
    const preset = searchParams.get('preset') || 'last_30_days'
    const isExecutiveView = searchParams.get('executive') === 'true'
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const sourceGroup = searchParams.get('sourceGroup') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const { startDate, endDate } = getDateRange(preset)

    // Build where clause
    const where: any = {
      record: {
        createdById: authUser.ownerId
      },
      createdAt: { gte: startDate, lt: endDate }
    }
    
    if (!isExecutiveView) {
      where.OR = [
        { userId: authUser.id },
        { record: { assignedToId: authUser.id } }
      ]
    } else if (assigneeIds && assigneeIds.length > 0) {
      where.OR = [
        { userId: { in: assigneeIds } },
        { record: { assignedToId: { in: assigneeIds } } }
      ]
    }

    // Filter by source group
    if (sourceGroup) {
      const sourcesInGroup = Object.entries(SOURCE_TO_GROUP)
        .filter(([_, group]) => group === sourceGroup)
        .map(([source]) => source)
      
      if (sourcesInGroup.length > 0) {
        where.source = { in: sourcesInGroup }
      } else {
        // If no mapping found, filter by the group name directly
        where.source = sourceGroup
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { field: { contains: search, mode: 'insensitive' } },
        { newValue: { contains: search, mode: 'insensitive' } },
        { record: { ownerFullName: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Get total count
    const total = await prisma.recordActivityLog.count({ where })

    // Fetch activities
    const activities = await prisma.recordActivityLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        field: true,
        oldValue: true,
        newValue: true,
        source: true,
        createdAt: true,
        user: {
          select: { id: true, name: true }
        },
        record: {
          select: { 
            id: true, 
            ownerFullName: true,
            propertyStreet: true,
            propertyCity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.action,
      field: activity.field,
      oldValue: activity.oldValue,
      newValue: activity.newValue,
      source: activity.source,
      sourceGroup: SOURCE_TO_GROUP[activity.source || ''] || 'Other',
      createdAt: activity.createdAt.toISOString(),
      agentId: activity.user?.id || null,
      agentName: activity.user?.name || 'System',
      recordId: activity.record.id,
      recordName: activity.record.ownerFullName || 'Unknown',
      recordAddress: activity.record.propertyStreet 
        ? `${activity.record.propertyStreet}, ${activity.record.propertyCity || ''}`
        : null
    }))

    return NextResponse.json({
      activities: formattedActivities,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
    
  } catch (error) {
    console.error('Activity List API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
