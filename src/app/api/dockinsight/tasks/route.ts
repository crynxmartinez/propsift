/**
 * DockInsight 3.0 - Tasks API
 * 
 * GET /api/dockinsight/tasks
 * Returns task KPIs, charts, and upcoming tasks list
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

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }

    // Calculate date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Fetch task data in parallel
    const [
      tasksDueToday,
      overdueTasks,
      completedThisWeek,
      tasksByStatus,
      tasksByAssignee,
      upcomingTasks
    ] = await Promise.all([
      // Tasks Due Today
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { gte: today, lt: tomorrow },
          status: { not: 'COMPLETED' }
        }
      }),
      // Overdue Tasks
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: today },
          status: { not: 'COMPLETED' }
        }
      }),
      // Completed This Week
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      // Tasks by Status
      prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true }
      }),
      // Tasks by Assignee (only for executive view)
      isExecutiveView ? prisma.task.groupBy({
        by: ['assignedToId'],
        where: {
          ...baseWhere,
          assignedToId: { not: null },
          status: { not: 'COMPLETED' }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }) : Promise.resolve([]),
      // Upcoming Tasks
      prisma.task.findMany({
        where: {
          ...baseWhere,
          status: { not: 'COMPLETED' },
          dueDate: { gte: today }
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          assignedToId: true,
          assignedTo: {
            select: { id: true, name: true }
          },
          record: {
            select: { id: true, ownerFullName: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 20
      })
    ])

    // Format tasks by status
    const statusColors: Record<string, string> = {
      PENDING: '#f59e0b',
      IN_PROGRESS: '#3b82f6',
      COMPLETED: '#22c55e',
      CANCELLED: '#6b7280'
    }
    
    const formattedTasksByStatus = tasksByStatus.map(ts => ({
      label: ts.status.replace('_', ' '),
      value: ts._count.id,
      color: statusColors[ts.status] || '#6b7280'
    }))

    // Get assignee names for tasks by assignee
    let formattedTasksByAssignee: { id: string; name: string; taskCount: number }[] = []
    if (isExecutiveView && tasksByAssignee.length > 0) {
      const assigneeIdsList = tasksByAssignee
        .map(ta => ta.assignedToId)
        .filter((id): id is string => id !== null)
      
      const assignees = await prisma.user.findMany({
        where: { id: { in: assigneeIdsList } },
        select: { id: true, name: true }
      })
      
      const assigneeMap = new Map(assignees.map(a => [a.id, a.name]))
      
      formattedTasksByAssignee = tasksByAssignee.map(ta => ({
        id: ta.assignedToId || '',
        name: ta.assignedToId ? assigneeMap.get(ta.assignedToId) || 'Unknown' : 'Unknown',
        taskCount: ta._count.id
      }))
    }

    // Format upcoming tasks
    const formattedUpcomingTasks = upcomingTasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate?.toISOString() || null,
      priority: t.priority,
      status: t.status,
      assigneeId: t.assignedToId,
      assigneeName: t.assignedTo?.name || null,
      recordId: t.record?.id || null,
      recordName: t.record?.ownerFullName || null
    }))

    return NextResponse.json({
      kpis: {
        tasksDueToday,
        overdueTasks,
        completedThisWeek
      },
      tasksByStatus: formattedTasksByStatus,
      tasksByAssignee: formattedTasksByAssignee,
      upcomingTasks: formattedUpcomingTasks
    })
    
  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
