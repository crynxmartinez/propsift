import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

interface WidgetConfig {
  dataSource: string
  metric: string
  field?: string
  groupBy?: string
  filters?: Array<{ field: string; operator: string; value: string }>
  sortBy?: string
  sortOrder?: string
  limit?: number
  timePeriod?: string
  granularity?: string
  comparison?: string
}

// POST /api/analytics-data - Get data for a widget
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { type, config } = body as { type: string; config: WidgetConfig }

    // Get date range based on time period
    const dateRange = getDateRange(config.timePeriod)

    // Build base where clause for records
    const baseWhere = {
      createdById: authUser.ownerId,
      ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
    }

    // Apply filters
    const whereClause = applyFilters(baseWhere, config.filters || [])

    let result

    switch (type) {
      case 'number':
        result = await getNumberData(config, whereClause, authUser.ownerId, dateRange)
        break
      case 'bar_chart':
      case 'horizontal_bar':
      case 'pie_chart':
      case 'donut_chart':
        result = await getGroupedData(config, whereClause, authUser.ownerId)
        break
      case 'line_chart':
      case 'area_chart':
        result = await getTimeSeriesData(config, whereClause, authUser.ownerId)
        break
      default:
        result = { value: 0 }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

// Get date range based on time period
function getDateRange(timePeriod?: string): { start: Date; end: Date } | null {
  if (!timePeriod || timePeriod === 'all_time') return null

  const now = new Date()
  let end = new Date(now)
  let start = new Date(now)

  switch (timePeriod) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'last_7_days':
      start.setDate(start.getDate() - 7)
      break
    case 'last_30_days':
      start.setDate(start.getDate() - 30)
      break
    case 'last_90_days':
      start.setDate(start.getDate() - 90)
      break
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return null
  }

  return { start, end }
}

// Apply filters to where clause
function applyFilters(
  baseWhere: Record<string, unknown>,
  filters: Array<{ field: string; operator: string; value: string }>
): Record<string, unknown> {
  const where = { ...baseWhere }

  for (const filter of filters) {
    switch (filter.field) {
      case 'status':
        if (filter.operator === 'equals') {
          where.statusId = filter.value
        } else if (filter.operator === 'not_equals') {
          where.statusId = { not: filter.value }
        }
        break
      case 'temperature':
        if (filter.operator === 'equals') {
          where.temperature = filter.value
        } else if (filter.operator === 'not_equals') {
          where.temperature = { not: filter.value }
        }
        break
      case 'isComplete':
        where.isComplete = filter.value === 'true'
        break
      case 'isContact':
        where.isContact = filter.value === 'true'
        break
      case 'assignedTo':
        if (filter.value === 'assigned') {
          where.assignedToId = { not: null }
        } else if (filter.value === 'unassigned') {
          where.assignedToId = null
        } else {
          where.assignedToId = filter.value
        }
        break
    }
  }

  return where
}

// Get data for number widget
async function getNumberData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string,
  dateRange: { start: Date; end: Date } | null
) {
  let value = 0
  let previousValue: number | undefined

  switch (config.dataSource) {
    case 'records':
      if (config.metric === 'count') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value = await prisma.record.count({ where: whereClause as any })
        
        // Get previous period for comparison
        if (config.comparison === 'previous_period' && dateRange) {
          const duration = dateRange.end.getTime() - dateRange.start.getTime()
          const prevStart = new Date(dateRange.start.getTime() - duration)
          const prevEnd = new Date(dateRange.start.getTime() - 1)
          
          previousValue = await prisma.record.count({
            where: {
              ...whereClause,
              createdAt: { gte: prevStart, lte: prevEnd },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          })
        }
      } else if (config.metric === 'sum' && config.field) {
        const result = await prisma.record.aggregate({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: whereClause as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _sum: { [config.field]: true } as any,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value = (result._sum as any)[config.field] || 0
      }
      break

    case 'tasks':
      if (config.metric === 'count') {
        value = await prisma.task.count({
          where: {
            createdById: ownerId,
            ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
          },
        })
      }
      break

    case 'tasks_pending':
      value = await prisma.task.count({
        where: {
          createdById: ownerId,
          status: 'PENDING',
        },
      })
      break

    case 'tasks_completed':
      value = await prisma.task.count({
        where: {
          createdById: ownerId,
          status: 'COMPLETED',
          ...(dateRange ? { completedAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
        },
      })
      break

    case 'tasks_overdue':
      value = await prisma.task.count({
        where: {
          createdById: ownerId,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() },
        },
      })
      break

    case 'hot_leads':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({
        where: {
          ...whereClause,
          temperature: 'hot',
        } as any,
      })
      break

    case 'contacts':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({
        where: {
          ...whereClause,
          isContact: true,
        } as any,
      })
      break
  }

  const change = previousValue !== undefined ? value - previousValue : undefined
  const changePercent = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : undefined

  return { value, previousValue, change, changePercent }
}

// Get grouped data for bar/pie charts
async function getGroupedData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  const data: Array<{ label: string; value: number; color?: string }> = []

  switch (config.dataSource) {
    case 'records':
      if (config.groupBy === 'status') {
        const statuses = await prisma.status.findMany({
          where: { createdById: ownerId },
          orderBy: { order: 'asc' },
        })

        for (const status of statuses) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({
            where: {
              ...whereClause,
              statusId: status.id,
            } as any,
          })
          data.push({ label: status.name, value: count, color: status.color })
        }
      } else if (config.groupBy === 'temperature') {
        const temps = ['hot', 'warm', 'cold']
        const tempColors: Record<string, string> = {
          hot: '#EF4444',
          warm: '#F59E0B',
          cold: '#3B82F6',
        }

        for (const temp of temps) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({
            where: {
              ...whereClause,
              temperature: temp,
            } as any,
          })
          data.push({
            label: temp.charAt(0).toUpperCase() + temp.slice(1),
            value: count,
            color: tempColors[temp],
          })
        }
      } else if (config.groupBy === 'tag') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = await prisma.tag.findMany({
          where: { createdById: ownerId },
          include: {
            records: true,
          },
        })

        for (const tag of tags) {
          data.push({ label: tag.name, value: tag.records.length })
        }
      } else if (config.groupBy === 'assignedTo') {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { id: ownerId },
              { accountOwnerId: ownerId },
            ],
          },
          select: { id: true, name: true, email: true },
        })

        for (const user of users) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({
            where: {
              ...whereClause,
              assignedToId: user.id,
            } as any,
          })
          data.push({ label: user.name || user.email, value: count })
        }

        // Add unassigned
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unassigned = await prisma.record.count({
          where: {
            ...whereClause,
            assignedToId: null,
          } as any,
        })
        if (unassigned > 0) {
          data.push({ label: 'Unassigned', value: unassigned, color: '#9CA3AF' })
        }
      }
      break

    case 'tasks':
      if (config.groupBy === 'status') {
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED']
        const statusColors: Record<string, string> = {
          PENDING: '#F59E0B',
          IN_PROGRESS: '#3B82F6',
          COMPLETED: '#10B981',
        }

        for (const status of statuses) {
          const count = await prisma.task.count({
            where: {
              createdById: ownerId,
              status,
            },
          })
          data.push({
            label: status.replace('_', ' '),
            value: count,
            color: statusColors[status],
          })
        }
      } else if (config.groupBy === 'priority') {
        const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
        const priorityColors: Record<string, string> = {
          LOW: '#9CA3AF',
          MEDIUM: '#3B82F6',
          HIGH: '#F59E0B',
          URGENT: '#EF4444',
        }

        for (const priority of priorities) {
          const count = await prisma.task.count({
            where: {
              createdById: ownerId,
              priority,
            },
          })
          data.push({
            label: priority,
            value: count,
            color: priorityColors[priority],
          })
        }
      }
      break
  }

  // Sort data
  if (config.sortBy === 'value') {
    data.sort((a, b) =>
      config.sortOrder === 'asc' ? a.value - b.value : b.value - a.value
    )
  }

  // Limit results
  const limit = config.limit || 10
  return { data: data.slice(0, limit) }
}

// Get time series data for line/area charts
async function getTimeSeriesData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  const data: Array<{ date: string; value: number }> = []
  const granularity = config.granularity || 'daily'
  const dateRange = getDateRange(config.timePeriod || 'last_30_days')

  if (!dateRange) {
    return { data: [] }
  }

  // Generate date buckets
  const buckets: Date[] = []
  const current = new Date(dateRange.start)

  while (current <= dateRange.end) {
    buckets.push(new Date(current))
    
    if (granularity === 'daily') {
      current.setDate(current.getDate() + 1)
    } else if (granularity === 'weekly') {
      current.setDate(current.getDate() + 7)
    } else if (granularity === 'monthly') {
      current.setMonth(current.getMonth() + 1)
    }
  }

  // Get counts for each bucket
  for (let i = 0; i < buckets.length; i++) {
    const start = buckets[i]
    const end = buckets[i + 1] || dateRange.end

    let count = 0

    if (config.dataSource === 'records') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count = await prisma.record.count({
        where: {
          ...whereClause,
          createdAt: { gte: start, lt: end },
        } as any,
      })
    } else if (config.dataSource === 'tasks') {
      count = await prisma.task.count({
        where: {
          createdById: ownerId,
          createdAt: { gte: start, lt: end },
        },
      })
    }

    data.push({
      date: start.toISOString().split('T')[0],
      value: count,
    })
  }

  return { data }
}
