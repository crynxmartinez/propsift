/**
 * DockInsight 3.0 - Activity API
 * 
 * GET /api/dockinsight/activity
 * Returns activity feed and activity statistics
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
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // Calculate date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.OR = [
        { assignedToId: authUser.id },
        { createdById: authUser.id }
      ]
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.OR = [
        { assignedToId: { in: assigneeIds } },
        { createdById: { in: assigneeIds } }
      ]
    }

    // Fetch activity data in parallel
    const [
      recordsCreatedToday,
      recordsCreatedThisWeek,
      tasksCompletedToday,
      tasksCompletedThisWeek,
      recentRecords,
      recentTasks,
      activityByDay
    ] = await Promise.all([
      // Records Created Today
      prisma.record.count({
        where: {
          createdById: authUser.ownerId,
          createdAt: { gte: today },
          ...(isExecutiveView ? {} : { OR: [{ assignedToId: authUser.id }, { createdById: authUser.id }] }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { OR: [{ assignedToId: { in: assigneeIds } }, { createdById: { in: assigneeIds } }] } : {})
        }
      }),
      // Records Created This Week
      prisma.record.count({
        where: {
          createdById: authUser.ownerId,
          createdAt: { gte: weekAgo },
          ...(isExecutiveView ? {} : { OR: [{ assignedToId: authUser.id }, { createdById: authUser.id }] }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { OR: [{ assignedToId: { in: assigneeIds } }, { createdById: { in: assigneeIds } }] } : {})
        }
      }),
      // Tasks Completed Today
      prisma.task.count({
        where: {
          createdById: authUser.ownerId,
          status: 'COMPLETED',
          completedAt: { gte: today },
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {})
        }
      }),
      // Tasks Completed This Week
      prisma.task.count({
        where: {
          createdById: authUser.ownerId,
          status: 'COMPLETED',
          completedAt: { gte: weekAgo },
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {})
        }
      }),
      // Recent Records (for activity feed)
      prisma.record.findMany({
        where: {
          createdById: authUser.ownerId,
          createdAt: { gte: weekAgo },
          ...(isExecutiveView ? {} : { OR: [{ assignedToId: authUser.id }, { createdById: authUser.id }] }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { OR: [{ assignedToId: { in: assigneeIds } }, { createdById: { in: assigneeIds } }] } : {})
        },
        select: {
          id: true,
          ownerFullName: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      // Recent Tasks (for activity feed)
      prisma.task.findMany({
        where: {
          createdById: authUser.ownerId,
          OR: [
            { createdAt: { gte: weekAgo } },
            { completedAt: { gte: weekAgo } }
          ],
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {})
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true,
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          record: { select: { id: true, ownerFullName: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      // Activity by Day (last 7 days)
      getActivityByDay(authUser.ownerId, weekAgo, isExecutiveView, authUser.id, assigneeIds)
    ])

    // Build activity feed
    const activityFeed = buildActivityFeed(recentRecords, recentTasks)

    return NextResponse.json({
      kpis: {
        recordsCreatedToday,
        recordsCreatedThisWeek,
        tasksCompletedToday,
        tasksCompletedThisWeek
      },
      activityByDay,
      activityFeed: activityFeed.slice(0, pageSize)
    })
    
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getActivityByDay(
  ownerId: string, 
  startDate: Date, 
  isExecutiveView: boolean, 
  userId: string,
  assigneeIds?: string[]
) {
  const days: { date: string; records: number; tasks: number }[] = []
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    date.setHours(0, 0, 0, 0)
    nextDate.setHours(0, 0, 0, 0)

    const [recordCount, taskCount] = await Promise.all([
      prisma.record.count({
        where: {
          createdById: ownerId,
          createdAt: { gte: date, lt: nextDate },
          ...(isExecutiveView ? {} : { OR: [{ assignedToId: userId }, { createdById: userId }] }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { OR: [{ assignedToId: { in: assigneeIds } }, { createdById: { in: assigneeIds } }] } : {})
        }
      }),
      prisma.task.count({
        where: {
          createdById: ownerId,
          status: 'COMPLETED',
          completedAt: { gte: date, lt: nextDate },
          ...(isExecutiveView ? {} : { assignedToId: userId }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {})
        }
      })
    ])

    days.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      records: recordCount,
      tasks: taskCount
    })
  }

  return days
}

function buildActivityFeed(
  records: any[], 
  tasks: any[]
): { id: string; type: string; title: string; description: string; timestamp: string; userId: string; userName: string }[] {
  const feed: any[] = []

  // Add record activities
  records.forEach(r => {
    feed.push({
      id: `record-${r.id}`,
      type: 'record_created',
      title: 'Record Created',
      description: r.ownerFullName || 'Unknown',
      timestamp: r.createdAt.toISOString(),
      userId: r.createdBy?.id || '',
      userName: r.createdBy?.name || 'Unknown'
    })
  })

  // Add task activities
  tasks.forEach(t => {
    if (t.status === 'COMPLETED' && t.completedAt) {
      feed.push({
        id: `task-completed-${t.id}`,
        type: 'task_completed',
        title: 'Task Completed',
        description: t.title,
        timestamp: t.completedAt.toISOString(),
        userId: t.assignedTo?.id || t.createdBy?.id || '',
        userName: t.assignedTo?.name || t.createdBy?.name || 'Unknown'
      })
    } else {
      feed.push({
        id: `task-created-${t.id}`,
        type: 'task_created',
        title: 'Task Created',
        description: t.title,
        timestamp: t.createdAt.toISOString(),
        userId: t.createdBy?.id || '',
        userName: t.createdBy?.name || 'Unknown'
      })
    }
  })

  // Sort by timestamp descending
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return feed
}
