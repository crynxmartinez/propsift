/**
 * DockInsight 3.0 - KPIs API
 * 
 * GET /api/dockinsight/kpis
 * Returns KPI metrics with current and previous period values
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

interface DateRange {
  start: Date
  end: Date
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
    const market = searchParams.get('market') || undefined
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const temperature = searchParams.get('temperature')?.split(',').filter(Boolean) || undefined
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || undefined
    const callReady = searchParams.get('callReady')
    
    // Calculate date ranges
    const { current, previous } = getDateRanges(preset)
    
    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
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
      baseWhere.tags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }
    
    if (callReady === 'true') {
      baseWhere.isComplete = true
    } else if (callReady === 'false') {
      baseWhere.isComplete = false
    }

    // Fetch KPIs in parallel
    const [
      totalRecordsCurrent,
      totalRecordsPrevious,
      hotRecordsCurrent,
      hotRecordsPrevious,
      callReadyCurrent,
      callReadyPrevious,
      tasksDueCurrent,
      tasksDuePrevious
    ] = await Promise.all([
      // Total Records - current period
      prisma.record.count({
        where: {
          ...baseWhere,
          createdAt: { gte: current.start, lte: current.end }
        }
      }),
      // Total Records - previous period
      prisma.record.count({
        where: {
          ...baseWhere,
          createdAt: { gte: previous.start, lte: previous.end }
        }
      }),
      // Hot Records - current period
      prisma.record.count({
        where: {
          ...baseWhere,
          temperature: 'hot',
          createdAt: { gte: current.start, lte: current.end }
        }
      }),
      // Hot Records - previous period
      prisma.record.count({
        where: {
          ...baseWhere,
          temperature: 'hot',
          createdAt: { gte: previous.start, lte: previous.end }
        }
      }),
      // Call Ready (complete) - current period
      prisma.record.count({
        where: {
          ...baseWhere,
          isComplete: true,
          createdAt: { gte: current.start, lte: current.end }
        }
      }),
      // Call Ready - previous period
      prisma.record.count({
        where: {
          ...baseWhere,
          isComplete: true,
          createdAt: { gte: previous.start, lte: previous.end }
        }
      }),
      // Tasks Due - current period (tasks due within the period, not completed)
      prisma.task.count({
        where: {
          createdById: authUser.ownerId,
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {}),
          dueDate: { gte: current.start, lte: current.end },
          status: { not: 'COMPLETED' }
        }
      }),
      // Tasks Due - previous period
      prisma.task.count({
        where: {
          createdById: authUser.ownerId,
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {}),
          dueDate: { gte: previous.start, lte: previous.end },
          status: { not: 'COMPLETED' }
        }
      })
    ])

    return NextResponse.json({
      totalRecords: {
        current: totalRecordsCurrent,
        previous: totalRecordsPrevious
      },
      hotRecords: {
        current: hotRecordsCurrent,
        previous: hotRecordsPrevious
      },
      callReady: {
        current: callReadyCurrent,
        previous: callReadyPrevious
      },
      tasksDue: {
        current: tasksDueCurrent,
        previous: tasksDuePrevious
      },
      dateRange: {
        current: { start: current.start.toISOString(), end: current.end.toISOString() },
        previous: { start: previous.start.toISOString(), end: previous.end.toISOString() }
      }
    })
    
  } catch (error) {
    console.error('KPIs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDateRanges(preset: string): { current: DateRange; previous: DateRange } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let currentStart: Date
  let currentEnd: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
  let periodDays: number
  
  switch (preset) {
    case 'today':
      currentStart = today
      periodDays = 1
      break
    case 'yesterday':
      currentStart = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      currentEnd = new Date(today.getTime() - 1)
      periodDays = 1
      break
    case 'last_7_days':
      currentStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      periodDays = 7
      break
    case 'last_30_days':
      currentStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      periodDays = 30
      break
    case 'this_week':
      const dayOfWeek = today.getDay()
      currentStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      periodDays = dayOfWeek + 1
      break
    case 'this_month':
      currentStart = new Date(today.getFullYear(), today.getMonth(), 1)
      periodDays = today.getDate()
      break
    case 'this_quarter':
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3
      currentStart = new Date(today.getFullYear(), quarterMonth, 1)
      periodDays = Math.floor((today.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
      break
    case 'this_year':
      currentStart = new Date(today.getFullYear(), 0, 1)
      periodDays = Math.floor((today.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
      break
    default:
      currentStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      periodDays = 30
  }
  
  // Previous period is the same duration before the current period
  const previousEnd = new Date(currentStart.getTime() - 1)
  const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000)
  
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  }
}
