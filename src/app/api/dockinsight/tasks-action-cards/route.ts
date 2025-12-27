/**
 * DockInsight 3.0 - Tasks Action Cards API
 * 
 * GET /api/dockinsight/tasks-action-cards
 * Returns action card counts:
 * - Open + Overdue
 * - Overdue
 * - Due Tomorrow
 * - Due Next 7 Days
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
    const priority = searchParams.get('priority')?.split(',').filter(Boolean) || undefined
    const taskStatus = searchParams.get('taskStatus')?.split(',').filter(Boolean) || undefined

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }

    if (priority && priority.length > 0) {
      baseWhere.priority = { in: priority }
    }
    if (taskStatus && taskStatus.length > 0) {
      baseWhere.status = { in: taskStatus }
    }

    // Calculate date boundaries
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Fetch action card counts in parallel
    const [
      openTasks,
      overdueTasks,
      dueTomorrow,
      dueNext7Days,
      completedTasks
    ] = await Promise.all([
      // Open Tasks (not completed, not cancelled)
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Overdue Tasks
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Due Tomorrow
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { gte: tomorrow, lt: dayAfterTomorrow },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Due Next 7 Days (including today)
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { gte: today, lt: next7Days },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Completed Tasks (all time)
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED'
        }
      })
    ])

    // Open + Overdue = all open tasks (which includes overdue)
    const openPlusOverdue = openTasks

    return NextResponse.json({
      openPlusOverdue: {
        count: openPlusOverdue,
        filterKey: 'open_overdue'
      },
      overdue: {
        count: overdueTasks,
        filterKey: 'overdue'
      },
      dueTomorrow: {
        count: dueTomorrow,
        filterKey: 'due_tomorrow'
      },
      dueNext7Days: {
        count: dueNext7Days,
        filterKey: 'due_next_7_days'
      },
      completed: {
        count: completedTasks,
        filterKey: 'completed'
      }
    })
    
  } catch (error) {
    console.error('Tasks Action Cards API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
