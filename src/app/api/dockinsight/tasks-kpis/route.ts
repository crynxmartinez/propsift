/**
 * DockInsight 3.0 - Tasks KPIs API
 * 
 * GET /api/dockinsight/tasks-kpis
 * Returns task KPIs with period comparison:
 * - Total Tasks
 * - Overdue Tasks
 * - Due Today
 * - Completed Tasks
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

function getDateRanges(preset: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date
  let previousEnd: Date
  
  switch (preset) {
    case 'today':
      currentStart = today
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      previousEnd = today
      break
    case 'yesterday':
      currentStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      currentEnd = today
      previousStart = new Date(today.getTime() - 48 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'last_7_days':
      currentStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'last_30_days':
    default:
      currentStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'this_week':
      const dayOfWeek = today.getDay()
      currentStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      previousEnd = currentStart
      break
    case 'this_month':
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      previousEnd = currentStart
      break
    case 'this_quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      currentStart = new Date(now.getFullYear(), quarter * 3, 1)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
      previousEnd = currentStart
      break
    case 'this_year':
      currentStart = new Date(now.getFullYear(), 0, 1)
      currentEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      previousStart = new Date(now.getFullYear() - 1, 0, 1)
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
    const priority = searchParams.get('priority') || undefined
    const status = searchParams.get('status') || undefined
    const taskType = searchParams.get('taskType') || undefined

    // Calculate date ranges
    const { current, previous } = getDateRanges(preset)

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }

    // Apply additional filters
    if (priority) {
      baseWhere.priority = priority
    }
    if (status) {
      baseWhere.status = status
    }

    // Calculate date boundaries
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // Fetch KPIs in parallel
    const [
      // Total Tasks - current period
      totalTasksCurrent,
      // Total Tasks - previous period
      totalTasksPrevious,
      // Overdue Tasks - current (all overdue, no date filter)
      overdueTasks,
      // Overdue Tasks - previous period snapshot
      overdueTasksPrevious,
      // Due Today
      dueToday,
      // Due Today - previous (yesterday)
      dueTodayPrevious,
      // Completed Tasks - current period
      completedTasksCurrent,
      // Completed Tasks - previous period
      completedTasksPrevious
    ] = await Promise.all([
      // Total Tasks - current period
      prisma.task.count({
        where: {
          ...baseWhere,
          createdAt: { gte: current.start, lte: current.end }
        }
      }),
      // Total Tasks - previous period
      prisma.task.count({
        where: {
          ...baseWhere,
          createdAt: { gte: previous.start, lte: previous.end }
        }
      }),
      // Overdue Tasks - all overdue tasks
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Overdue Tasks - previous period (tasks that were overdue at start of current period)
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: current.start },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          createdAt: { lt: current.start }
        }
      }),
      // Due Today
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { gte: today, lt: tomorrow },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Due Today - previous (yesterday)
      prisma.task.count({
        where: {
          ...baseWhere,
          dueDate: { gte: new Date(today.getTime() - 24 * 60 * 60 * 1000), lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Completed Tasks - current period
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: current.start, lte: current.end }
        }
      }),
      // Completed Tasks - previous period
      prisma.task.count({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { gte: previous.start, lte: previous.end }
        }
      })
    ])

    return NextResponse.json({
      totalTasks: {
        current: totalTasksCurrent,
        previous: totalTasksPrevious
      },
      overdueTasks: {
        current: overdueTasks,
        previous: overdueTasksPrevious
      },
      dueToday: {
        current: dueToday,
        previous: dueTodayPrevious
      },
      completedTasks: {
        current: completedTasksCurrent,
        previous: completedTasksPrevious
      }
    })
    
  } catch (error) {
    console.error('Tasks KPIs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
