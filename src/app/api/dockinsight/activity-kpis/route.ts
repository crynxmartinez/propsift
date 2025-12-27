/**
 * DockInsight 3.0 - Activity KPIs API
 * 
 * GET /api/dockinsight/activity-kpis
 * Returns activity KPIs with source breakdown
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// Activity source mapping
const SOURCE_GROUPS = {
  'Property Details Page': 'CRM',
  'Conversation Board': 'Comments',
  'Bulk Actions': 'Bulk Actions',
  'Bulk Import': 'Bulk Import',
  'Board': 'Board',
  'Automation': 'Automation'
} as const

function getDateRanges(preset: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let currentStart: Date
  let currentEnd: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  let previousStart: Date
  let previousEnd: Date

  switch (preset) {
    case 'today':
      currentStart = today
      previousStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      previousEnd = today
      break
    case 'yesterday':
      currentStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      currentEnd = today
      previousStart = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'last_7_days':
      currentStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      previousStart = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'last_30_days':
    default:
      currentStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      previousStart = new Date(today.getTime() - 59 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  }
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

    // Calculate date ranges
    const { current, previous } = getDateRanges(preset)

    // Build base where clause for records
    const recordWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      recordWhere.OR = [
        { assignedToId: authUser.id },
        { createdById: authUser.id }
      ]
    } else if (assigneeIds && assigneeIds.length > 0) {
      recordWhere.OR = [
        { assignedToId: { in: assigneeIds } },
        { createdById: { in: assigneeIds } }
      ]
    }

    // Build base where clause for activity logs
    const activityLogWhere: any = {
      record: {
        createdById: authUser.ownerId
      }
    }
    
    if (!isExecutiveView) {
      activityLogWhere.OR = [
        { userId: authUser.id },
        { record: { assignedToId: authUser.id } }
      ]
    } else if (assigneeIds && assigneeIds.length > 0) {
      activityLogWhere.OR = [
        { userId: { in: assigneeIds } },
        { record: { assignedToId: { in: assigneeIds } } }
      ]
    }

    // Build base where clause for tasks
    const taskWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      taskWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      taskWhere.assignedToId = { in: assigneeIds }
    }

    // Fetch KPIs in parallel
    const [
      // Total Activities - current period
      totalActivitiesCurrent,
      totalActivitiesPrevious,
      // Record Updates - current period
      recordUpdatesCurrent,
      recordUpdatesPrevious,
      // Tasks Completed - current period
      tasksCompletedCurrent,
      tasksCompletedPrevious,
      // Records Created - current period
      recordsCreatedCurrent,
      recordsCreatedPrevious,
      // Activity by source - current period
      activityBySource
    ] = await Promise.all([
      // Total Activities Current
      prisma.recordActivityLog.count({
        where: {
          ...activityLogWhere,
          createdAt: { gte: current.start, lt: current.end }
        }
      }),
      // Total Activities Previous
      prisma.recordActivityLog.count({
        where: {
          ...activityLogWhere,
          createdAt: { gte: previous.start, lt: previous.end }
        }
      }),
      // Record Updates Current
      prisma.recordActivityLog.count({
        where: {
          ...activityLogWhere,
          action: 'updated',
          createdAt: { gte: current.start, lt: current.end }
        }
      }),
      // Record Updates Previous
      prisma.recordActivityLog.count({
        where: {
          ...activityLogWhere,
          action: 'updated',
          createdAt: { gte: previous.start, lt: previous.end }
        }
      }),
      // Tasks Completed Current
      prisma.task.count({
        where: {
          ...taskWhere,
          status: 'COMPLETED',
          completedAt: { gte: current.start, lt: current.end }
        }
      }),
      // Tasks Completed Previous
      prisma.task.count({
        where: {
          ...taskWhere,
          status: 'COMPLETED',
          completedAt: { gte: previous.start, lt: previous.end }
        }
      }),
      // Records Created Current
      prisma.record.count({
        where: {
          ...recordWhere,
          createdAt: { gte: current.start, lt: current.end }
        }
      }),
      // Records Created Previous
      prisma.record.count({
        where: {
          ...recordWhere,
          createdAt: { gte: previous.start, lt: previous.end }
        }
      }),
      // Activity by Source
      prisma.recordActivityLog.groupBy({
        by: ['source'],
        where: {
          ...activityLogWhere,
          createdAt: { gte: current.start, lt: current.end }
        },
        _count: { id: true }
      })
    ])

    // Map sources to groups
    const sourceBreakdown = activityBySource.map(item => ({
      source: item.source || 'Other',
      group: SOURCE_GROUPS[item.source as keyof typeof SOURCE_GROUPS] || 'Other',
      count: item._count.id
    }))

    return NextResponse.json({
      totalActivities: {
        current: totalActivitiesCurrent,
        previous: totalActivitiesPrevious
      },
      recordUpdates: {
        current: recordUpdatesCurrent,
        previous: recordUpdatesPrevious
      },
      tasksCompleted: {
        current: tasksCompletedCurrent,
        previous: tasksCompletedPrevious
      },
      recordsCreated: {
        current: recordsCreatedCurrent,
        previous: recordsCreatedPrevious
      },
      sourceBreakdown
    })
    
  } catch (error) {
    console.error('Activity KPIs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
