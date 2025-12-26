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
      case 'gauge':
      case 'progress':
        result = await getGaugeData(config, whereClause, authUser.ownerId)
        break
      case 'leaderboard':
        result = await getLeaderboardData(config, whereClause, authUser.ownerId)
        break
      case 'funnel':
        result = await getFunnelData(config, whereClause, authUser.ownerId)
        break
      case 'table':
        result = await getTableData(config, whereClause, authUser.ownerId)
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

    case 'tags':
      value = await prisma.tag.count({ where: { createdById: ownerId } })
      break

    case 'motivations':
      value = await prisma.motivation.count({ where: { createdById: ownerId } })
      break

    case 'statuses':
      value = await prisma.status.count({ where: { createdById: ownerId } })
      break

    case 'boards':
      value = await prisma.board.count({ where: { createdById: ownerId } })
      break

    case 'automations':
      value = await prisma.automation.count({ where: { createdById: ownerId } })
      break

    case 'automations_active':
      value = await prisma.automation.count({ where: { createdById: ownerId, isActive: true } })
      break

    case 'team':
      value = await prisma.user.count({
        where: {
          OR: [{ id: ownerId }, { accountOwnerId: ownerId }],
        },
      })
      break

    case 'phones':
      value = await prisma.recordPhoneNumber.count({
        where: { record: { createdById: ownerId } },
      })
      break

    case 'emails':
      value = await prisma.recordEmail.count({
        where: { record: { createdById: ownerId } },
      })
      break

    case 'custom_fields':
      value = await prisma.customFieldDefinition.count({ where: { createdById: ownerId } })
      break

    case 'activity':
      value = await prisma.activityLog.count({
        where: dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {},
      })
      break

    default:
      // Default to records count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: whereClause as any })
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

    case 'tags':
      // Get all tags with record count
      const allTags = await prisma.tag.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      for (const tag of allTags) {
        data.push({ label: tag.name, value: tag.records.length })
      }
      break

    case 'motivations':
      // Get all motivations with record count
      const allMotivations = await prisma.motivation.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      for (const motivation of allMotivations) {
        data.push({ label: motivation.name, value: motivation.records.length })
      }
      break

    case 'statuses':
      // Get all statuses with record count
      const allStatuses = await prisma.status.findMany({
        where: { createdById: ownerId },
        orderBy: { order: 'asc' },
      })
      for (const status of allStatuses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = await prisma.record.count({
          where: { createdById: ownerId, statusId: status.id } as any,
        })
        data.push({ label: status.name, value: count, color: status.color })
      }
      break

    case 'team':
      // Get team members with their record/task counts
      const teamMembers = await prisma.user.findMany({
        where: {
          OR: [{ id: ownerId }, { accountOwnerId: ownerId }],
        },
      })
      for (const member of teamMembers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recordCount = await prisma.record.count({
          where: { assignedToId: member.id } as any,
        })
        data.push({ label: member.name || member.email, value: recordCount })
      }
      break

    case 'automations':
      // Get automations by status
      const activeCount = await prisma.automation.count({
        where: { createdById: ownerId, isActive: true },
      })
      const inactiveCount = await prisma.automation.count({
        where: { createdById: ownerId, isActive: false },
      })
      data.push({ label: 'Active', value: activeCount, color: '#10B981' })
      data.push({ label: 'Inactive', value: inactiveCount, color: '#9CA3AF' })
      break

    case 'phones':
      // Get phone numbers by type
      const phoneTypes = ['mobile', 'landline', 'voip', 'unknown']
      for (const phoneType of phoneTypes) {
        const count = await prisma.recordPhoneNumber.count({
          where: { 
            record: { createdById: ownerId },
            type: phoneType,
          },
        })
        if (count > 0) {
          data.push({ label: phoneType.charAt(0).toUpperCase() + phoneType.slice(1), value: count })
        }
      }
      break

    case 'emails':
      // Get emails - primary vs secondary
      const primaryEmails = await prisma.recordEmail.count({
        where: { record: { createdById: ownerId }, isPrimary: true },
      })
      const secondaryEmails = await prisma.recordEmail.count({
        where: { record: { createdById: ownerId }, isPrimary: false },
      })
      data.push({ label: 'Primary', value: primaryEmails, color: '#3B82F6' })
      data.push({ label: 'Secondary', value: secondaryEmails, color: '#9CA3AF' })
      break

    case 'boards':
      // Get boards with record count
      const boards = await prisma.board.findMany({
        where: { createdById: ownerId },
        include: {
          columns: {
            include: {
              records: true,
            },
          },
        },
      })
      for (const board of boards) {
        const recordCount = board.columns.reduce((sum, col) => sum + col.records.length, 0)
        data.push({ label: board.name, value: recordCount })
      }
      break

    case 'custom_fields':
      // Get custom field definitions by type
      const fields = await prisma.customFieldDefinition.findMany({
        where: { createdById: ownerId },
      })
      const fieldsByType: Record<string, number> = {}
      for (const field of fields) {
        fieldsByType[field.fieldType] = (fieldsByType[field.fieldType] || 0) + 1
      }
      for (const [type, count] of Object.entries(fieldsByType)) {
        data.push({ label: type.charAt(0).toUpperCase() + type.slice(1), value: count })
      }
      break

    default:
      // Default: try to get records by status
      const defaultStatuses = await prisma.status.findMany({
        where: { createdById: ownerId },
        orderBy: { order: 'asc' },
      })
      for (const status of defaultStatuses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = await prisma.record.count({
          where: { createdById: ownerId, statusId: status.id } as any,
        })
        data.push({ label: status.name, value: count, color: status.color })
      }
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

// Get data for gauge/progress widget
async function getGaugeData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  let value = 0

  switch (config.dataSource) {
    case 'records':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: whereClause as any })
      break
    case 'tasks':
      value = await prisma.task.count({ where: { createdById: ownerId } })
      break
    case 'tasks_completed':
      value = await prisma.task.count({ where: { createdById: ownerId, status: 'COMPLETED' } })
      break
    case 'automations':
      value = await prisma.automation.count({ where: { createdById: ownerId } })
      break
    case 'automations_active':
      value = await prisma.automation.count({ where: { createdById: ownerId, isActive: true } })
      break
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: whereClause as any })
  }

  return { value }
}

// Get data for leaderboard widget
async function getLeaderboardData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  const data: Array<{ name: string; value: number; avatar?: string }> = []
  const limit = config.limit || 10

  switch (config.dataSource) {
    case 'tags':
      // Leaderboard of tags by record count
      const tags = await prisma.tag.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      for (const tag of tags) {
        data.push({ name: tag.name, value: tag.records.length })
      }
      break

    case 'motivations':
      // Leaderboard of motivations by record count
      const motivations = await prisma.motivation.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      for (const motivation of motivations) {
        data.push({ name: motivation.name, value: motivation.records.length })
      }
      break

    case 'statuses':
      // Leaderboard of statuses by record count
      const statuses = await prisma.status.findMany({
        where: { createdById: ownerId },
        orderBy: { order: 'asc' },
      })
      for (const status of statuses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = await prisma.record.count({
          where: { createdById: ownerId, statusId: status.id } as any,
        })
        data.push({ name: status.name, value: count })
      }
      break

    case 'automations':
      // Leaderboard of automations by run count
      const automations = await prisma.automation.findMany({
        where: { createdById: ownerId },
        orderBy: { runCount: 'desc' },
        take: limit,
      })
      for (const automation of automations) {
        data.push({ name: automation.name, value: automation.runCount })
      }
      break

    case 'boards':
      // Leaderboard of boards by record count
      const boards = await prisma.board.findMany({
        where: { createdById: ownerId },
        include: {
          columns: {
            include: { records: true },
          },
        },
      })
      for (const board of boards) {
        const recordCount = board.columns.reduce((sum, col) => sum + col.records.length, 0)
        data.push({ name: board.name, value: recordCount })
      }
      break

    case 'team':
    case 'records':
    case 'tasks':
    case 'tasks_completed':
    case 'activity':
    default:
      // Get team members for user-based leaderboards
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: ownerId },
            { accountOwnerId: ownerId },
          ],
        },
        select: { id: true, name: true, email: true },
      })

      if (config.dataSource === 'tasks' || config.dataSource === 'tasks_completed') {
        for (const user of users) {
          const count = await prisma.task.count({
            where: {
              createdById: ownerId,
              assignedToId: user.id,
              ...(config.dataSource === 'tasks_completed' ? { status: 'COMPLETED' } : {}),
            },
          })
          data.push({ name: user.name || user.email, value: count })
        }
      } else if (config.dataSource === 'activity') {
        for (const user of users) {
          const count = await prisma.activityLog.count({
            where: { userId: user.id },
          })
          data.push({ name: user.name || user.email, value: count })
        }
      } else {
        // Default: records per user
        for (const user of users) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({
            where: {
              ...whereClause,
              assignedToId: user.id,
            } as any,
          })
          data.push({ name: user.name || user.email, value: count })
        }
      }
  }

  // Sort by value descending and limit
  data.sort((a, b) => b.value - a.value)
  return { data: data.slice(0, limit) }
}

// Get data for funnel widget
async function getFunnelData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  const data: Array<{ name: string; value: number }> = []

  switch (config.dataSource) {
    case 'records':
      // Funnel by status (pipeline stages)
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
        data.push({ name: status.name, value: count })
      }
      break

    case 'tasks':
      // Funnel by task status
      const taskStatuses = [
        { key: 'PENDING', label: 'Pending' },
        { key: 'IN_PROGRESS', label: 'In Progress' },
        { key: 'COMPLETED', label: 'Completed' },
      ]

      for (const status of taskStatuses) {
        const count = await prisma.task.count({
          where: {
            createdById: ownerId,
            status: status.key,
          },
        })
        data.push({ name: status.label, value: count })
      }
      break

    default:
      // Default: temperature funnel
      const temps = [
        { key: 'cold', label: 'Cold' },
        { key: 'warm', label: 'Warm' },
        { key: 'hot', label: 'Hot' },
      ]

      for (const temp of temps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const count = await prisma.record.count({
          where: {
            ...whereClause,
            temperature: temp.key,
          } as any,
        })
        data.push({ name: temp.label, value: count })
      }
  }

  return { data }
}

// Get data for table widget
async function getTableData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string
) {
  const limit = config.limit || 10
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[] = []

  switch (config.dataSource) {
    case 'records':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: any[] = await prisma.record.findMany({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: whereClause as any,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          status: { select: { name: true, color: true } },
          assignedTo: { select: { name: true, email: true } },
        },
      })
      data = records.map(r => ({
        id: r.id,
        name: r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : r.propertyAddress || 'Unknown',
        status: r.status?.name || 'No Status',
        temperature: r.temperature || 'cold',
        assignedTo: r.assignedTo?.name || r.assignedTo?.email || 'Unassigned',
        createdAt: r.createdAt,
      }))
      break

    case 'tasks':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks: any[] = await prisma.task.findMany({
        where: { createdById: ownerId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true, email: true } },
          record: true,
        },
      })
      data = tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?.name || t.assignedTo?.email || 'Unassigned',
        dueDate: t.dueDate,
        record: t.record ? `${t.record.firstName || ''} ${t.record.lastName || ''}`.trim() || t.record.propertyAddress : null,
      }))
      break

    case 'activity':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activities: any[] = await prisma.activityLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      })
      data = activities.map(a => ({
        id: a.id,
        action: a.action,
        type: a.type,
        user: a.user?.name || a.user?.email || 'System',
        createdAt: a.createdAt,
      }))
      break

    case 'automations':
      const automations = await prisma.automation.findMany({
        where: { createdById: ownerId },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      data = automations.map(a => ({
        id: a.id,
        name: a.name,
        isActive: a.isActive,
        runCount: a.runCount,
        lastRunAt: a.lastRunAt,
      }))
      break

    default:
      data = []
  }

  return { data }
}
