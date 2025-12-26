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
  // Cross-filtering options
  filterByTag?: string
  filterByMotivation?: string
  filterByStatus?: string
  filterByAssignee?: string
  filterByTemperature?: string
  // Calculated metrics
  calculatedMetric?: {
    formula: string // e.g., "A / B * 100"
    sources: Array<{
      variable: string // e.g., "A", "B"
      dataSource: string
      metric?: string
    }>
  }
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
    let whereClause = applyFilters(baseWhere, config.filters || [])
    
    // Apply cross-filters from config
    whereClause = applyCrossFilters(config, whereClause, authUser.ownerId)

    let result

    // Handle calculated metrics first
    if (config.calculatedMetric && config.calculatedMetric.sources.length > 0) {
      result = await getCalculatedMetric(config, authUser.ownerId, dateRange)
      return NextResponse.json(result)
    }

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
      // Cross-filtering: Tags
      case 'tag':
        if (filter.operator === 'equals' || filter.operator === 'has') {
          where.recordTags = { some: { tagId: filter.value } }
        } else if (filter.operator === 'not_equals' || filter.operator === 'not_has') {
          where.recordTags = { none: { tagId: filter.value } }
        } else if (filter.operator === 'has_any') {
          // Multiple tags (comma-separated)
          const tagIds = filter.value.split(',').map(t => t.trim())
          where.recordTags = { some: { tagId: { in: tagIds } } }
        } else if (filter.operator === 'has_all') {
          // Must have all tags
          const allTagIds = filter.value.split(',').map(t => t.trim())
          where.AND = allTagIds.map(tagId => ({ recordTags: { some: { tagId } } }))
        }
        break
      // Cross-filtering: Motivations
      case 'motivation':
        if (filter.operator === 'equals' || filter.operator === 'has') {
          where.recordMotivations = { some: { motivationId: filter.value } }
        } else if (filter.operator === 'not_equals' || filter.operator === 'not_has') {
          where.recordMotivations = { none: { motivationId: filter.value } }
        } else if (filter.operator === 'has_any') {
          const motivationIds = filter.value.split(',').map(m => m.trim())
          where.recordMotivations = { some: { motivationId: { in: motivationIds } } }
        } else if (filter.operator === 'has_all') {
          const allMotivationIds = filter.value.split(',').map(m => m.trim())
          where.AND = allMotivationIds.map(motivationId => ({ recordMotivations: { some: { motivationId } } }))
        }
        break
      // Cross-filtering: Property location
      case 'propertyState':
        if (filter.operator === 'equals') {
          where.propertyState = filter.value
        } else if (filter.operator === 'not_equals') {
          where.propertyState = { not: filter.value }
        } else if (filter.operator === 'in') {
          where.propertyState = { in: filter.value.split(',').map(s => s.trim()) }
        }
        break
      case 'propertyCity':
        if (filter.operator === 'equals') {
          where.propertyCity = filter.value
        } else if (filter.operator === 'contains') {
          where.propertyCity = { contains: filter.value, mode: 'insensitive' }
        }
        break
      case 'propertyZip':
        if (filter.operator === 'equals') {
          where.propertyZip = filter.value
        } else if (filter.operator === 'starts_with') {
          where.propertyZip = { startsWith: filter.value }
        }
        break
      // Cross-filtering: Property attributes
      case 'bedrooms':
        if (filter.operator === 'equals') {
          where.bedrooms = parseInt(filter.value)
        } else if (filter.operator === 'gte') {
          where.bedrooms = { gte: parseInt(filter.value) }
        } else if (filter.operator === 'lte') {
          where.bedrooms = { lte: parseInt(filter.value) }
        }
        break
      case 'bathrooms':
        if (filter.operator === 'equals') {
          where.bathrooms = parseFloat(filter.value)
        } else if (filter.operator === 'gte') {
          where.bathrooms = { gte: parseFloat(filter.value) }
        } else if (filter.operator === 'lte') {
          where.bathrooms = { lte: parseFloat(filter.value) }
        }
        break
      case 'sqft':
        if (filter.operator === 'gte') {
          where.sqft = { gte: parseInt(filter.value) }
        } else if (filter.operator === 'lte') {
          where.sqft = { lte: parseInt(filter.value) }
        } else if (filter.operator === 'between') {
          const [min, max] = filter.value.split(',').map(v => parseInt(v.trim()))
          where.sqft = { gte: min, lte: max }
        }
        break
      case 'estimatedValue':
        if (filter.operator === 'gte') {
          where.estimatedValue = { gte: parseFloat(filter.value) }
        } else if (filter.operator === 'lte') {
          where.estimatedValue = { lte: parseFloat(filter.value) }
        } else if (filter.operator === 'between') {
          const [minVal, maxVal] = filter.value.split(',').map(v => parseFloat(v.trim()))
          where.estimatedValue = { gte: minVal, lte: maxVal }
        }
        break
      case 'yearBuilt':
        if (filter.operator === 'equals') {
          where.yearBuilt = parseInt(filter.value)
        } else if (filter.operator === 'gte') {
          where.yearBuilt = { gte: parseInt(filter.value) }
        } else if (filter.operator === 'lte') {
          where.yearBuilt = { lte: parseInt(filter.value) }
        }
        break
      // Cross-filtering: Attempts
      case 'callAttempts':
        if (filter.operator === 'equals') {
          where.callAttempts = parseInt(filter.value)
        } else if (filter.operator === 'gte') {
          where.callAttempts = { gte: parseInt(filter.value) }
        } else if (filter.operator === 'lte') {
          where.callAttempts = { lte: parseInt(filter.value) }
        }
        break
      case 'totalAttempts':
        // This requires a computed filter - handled separately
        break
    }
  }

  return where
}

// Apply cross-filtering from config options
function applyCrossFilters(
  config: WidgetConfig,
  baseWhere: Record<string, unknown>,
  ownerId: string
): Record<string, unknown> {
  const where = { ...baseWhere }

  // Filter by specific tag
  if (config.filterByTag) {
    where.recordTags = { some: { tagId: config.filterByTag } }
  }

  // Filter by specific motivation
  if (config.filterByMotivation) {
    where.recordMotivations = { some: { motivationId: config.filterByMotivation } }
  }

  // Filter by specific status
  if (config.filterByStatus) {
    where.statusId = config.filterByStatus
  }

  // Filter by specific assignee
  if (config.filterByAssignee) {
    if (config.filterByAssignee === 'unassigned') {
      where.assignedToId = null
    } else {
      where.assignedToId = config.filterByAssignee
    }
  }

  // Filter by temperature
  if (config.filterByTemperature) {
    where.temperature = config.filterByTemperature
  }

  return where
}

// Get data for number widget - COMPREHENSIVE IMPLEMENTATION
async function getNumberData(
  config: WidgetConfig,
  whereClause: Record<string, unknown>,
  ownerId: string,
  dateRange: { start: Date; end: Date } | null
) {
  let value = 0
  let previousValue: number | undefined
  let total: number | undefined // For percentage calculations

  // ==========================================
  // METRIC HANDLERS FOR RECORDS
  // ==========================================
  const getRecordMetric = async (where: Record<string, unknown>) => {
    switch (config.metric) {
      case 'count':
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await prisma.record.count({ where: where as any })
      
      case 'sum_estimated_value':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumEV = await prisma.record.aggregate({ where: where as any, _sum: { estimatedValue: true } })
        return Number(sumEV._sum.estimatedValue) || 0
      
      case 'avg_estimated_value':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgEV = await prisma.record.aggregate({ where: where as any, _avg: { estimatedValue: true } })
        return Number(avgEV._avg.estimatedValue) || 0
      
      case 'sum_sqft':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumSqft = await prisma.record.aggregate({ where: where as any, _sum: { sqft: true } })
        return sumSqft._sum.sqft || 0
      
      case 'avg_sqft':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgSqft = await prisma.record.aggregate({ where: where as any, _avg: { sqft: true } })
        return Math.round(avgSqft._avg.sqft || 0)
      
      case 'sum_call_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumCalls = await prisma.record.aggregate({ where: where as any, _sum: { callAttempts: true } })
        return sumCalls._sum.callAttempts || 0
      
      case 'avg_call_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgCalls = await prisma.record.aggregate({ where: where as any, _avg: { callAttempts: true } })
        return Math.round((avgCalls._avg.callAttempts || 0) * 10) / 10
      
      case 'sum_sms_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumSms = await prisma.record.aggregate({ where: where as any, _sum: { smsAttempts: true } })
        return sumSms._sum.smsAttempts || 0
      
      case 'avg_sms_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgSms = await prisma.record.aggregate({ where: where as any, _avg: { smsAttempts: true } })
        return Math.round((avgSms._avg.smsAttempts || 0) * 10) / 10
      
      case 'sum_direct_mail_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumDM = await prisma.record.aggregate({ where: where as any, _sum: { directMailAttempts: true } })
        return sumDM._sum.directMailAttempts || 0
      
      case 'sum_rvm_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sumRvm = await prisma.record.aggregate({ where: where as any, _sum: { rvmAttempts: true } })
        return sumRvm._sum.rvmAttempts || 0
      
      case 'sum_total_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalAttempts = await prisma.record.aggregate({
          where: where as any,
          _sum: { callAttempts: true, smsAttempts: true, directMailAttempts: true, rvmAttempts: true }
        })
        return (totalAttempts._sum.callAttempts || 0) + 
               (totalAttempts._sum.smsAttempts || 0) + 
               (totalAttempts._sum.directMailAttempts || 0) + 
               (totalAttempts._sum.rvmAttempts || 0)
      
      case 'count_zero_attempts':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await prisma.record.count({
          where: {
            ...where,
            callAttempts: 0,
            smsAttempts: 0,
            directMailAttempts: 0,
            rvmAttempts: 0,
          } as any
        })
      
      case 'count_high_attempts':
        // Records with 5+ total attempts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({
          where: where as any,
          select: { callAttempts: true, smsAttempts: true, directMailAttempts: true, rvmAttempts: true }
        })
        return records.filter(r => 
          (r.callAttempts || 0) + (r.smsAttempts || 0) + (r.directMailAttempts || 0) + (r.rvmAttempts || 0) >= 5
        ).length
    }
  }

  // ==========================================
  // RECORDS DATA SOURCES
  // ==========================================
  switch (config.dataSource) {
    case 'records':
      value = await getRecordMetric(whereClause)
      if (config.comparison === 'previous_period' && dateRange) {
        const duration = dateRange.end.getTime() - dateRange.start.getTime()
        const prevStart = new Date(dateRange.start.getTime() - duration)
        const prevEnd = new Date(dateRange.start.getTime() - 1)
        previousValue = await getRecordMetric({ createdById: ownerId, createdAt: { gte: prevStart, lte: prevEnd } })
      }
      break

    case 'records_hot':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, temperature: 'hot' } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_warm':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, temperature: 'warm' } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_cold':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, temperature: 'cold' } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_contacts':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, isContact: true } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_non_contacts':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, isContact: false } as any })
      break

    case 'records_completed':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, isComplete: true } as any })
      break

    case 'records_unassigned':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: { ...whereClause, assignedToId: null } as any })
      break

    // ==========================================
    // TASKS DATA SOURCES
    // ==========================================
    case 'tasks':
      value = await prisma.task.count({
        where: {
          createdById: ownerId,
          ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
        },
      })
      break

    case 'tasks_pending':
      value = await prisma.task.count({ where: { createdById: ownerId, status: 'PENDING' } })
      total = await prisma.task.count({ where: { createdById: ownerId } })
      break

    case 'tasks_in_progress':
      value = await prisma.task.count({ where: { createdById: ownerId, status: 'IN_PROGRESS' } })
      total = await prisma.task.count({ where: { createdById: ownerId } })
      break

    case 'tasks_completed':
      value = await prisma.task.count({
        where: {
          createdById: ownerId,
          status: 'COMPLETED',
          ...(dateRange ? { completedAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
        },
      })
      total = await prisma.task.count({ where: { createdById: ownerId } })
      break

    case 'tasks_overdue':
      value = await prisma.task.count({
        where: { createdById: ownerId, status: { not: 'COMPLETED' }, dueDate: { lt: new Date() } },
      })
      break

    case 'tasks_due_today':
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)
      value = await prisma.task.count({
        where: { createdById: ownerId, status: { not: 'COMPLETED' }, dueDate: { gte: todayStart, lte: todayEnd } },
      })
      break

    case 'tasks_due_this_week':
      const weekStart = new Date()
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 7)
      value = await prisma.task.count({
        where: { createdById: ownerId, status: { not: 'COMPLETED' }, dueDate: { gte: weekStart, lte: weekEnd } },
      })
      break

    case 'tasks_unassigned':
      value = await prisma.task.count({ where: { createdById: ownerId, assignedToId: null } })
      break

    case 'tasks_recurring':
      value = await prisma.task.count({ where: { createdById: ownerId, recurrence: { not: null } } })
      break

    // ==========================================
    // TAGS DATA SOURCES
    // ==========================================
    case 'tags':
      value = await prisma.tag.count({ where: { createdById: ownerId } })
      break

    case 'tags_most_used':
      const tagsWithRecords = await prisma.tag.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      value = tagsWithRecords.filter(t => t.records.length > 0).length
      break

    case 'tags_unused':
      const allTagsForUnused = await prisma.tag.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      value = allTagsForUnused.filter(t => t.records.length === 0).length
      break

    case 'records_with_tags':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordsWithTags: any[] = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { recordTags: true },
      })
      value = recordsWithTags.filter(r => r.recordTags && r.recordTags.length > 0).length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_without_tags':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordsForTagCheck: any[] = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { recordTags: true },
      })
      value = recordsForTagCheck.filter(r => !r.recordTags || r.recordTags.length === 0).length
      break

    case 'records_multiple_tags':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordsMultiTags: any[] = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { recordTags: true },
      })
      value = recordsMultiTags.filter(r => r.recordTags && r.recordTags.length > 1).length
      break

    // ==========================================
    // MOTIVATIONS DATA SOURCES
    // ==========================================
    case 'motivations':
      value = await prisma.motivation.count({ where: { createdById: ownerId } })
      break

    case 'motivations_most_used':
      const motivationsWithRecords = await prisma.motivation.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      value = motivationsWithRecords.filter(m => m.records.length > 0).length
      break

    case 'motivations_unused':
      const allMotivationsForUnused = await prisma.motivation.findMany({
        where: { createdById: ownerId },
        include: { records: true },
      })
      value = allMotivationsForUnused.filter(m => m.records.length === 0).length
      break

    case 'records_with_motivations':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordsWithMotivations: any[] = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { recordMotivations: true },
      })
      value = recordsWithMotivations.filter(r => r.recordMotivations && r.recordMotivations.length > 0).length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_without_motivations':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordsForMotivationCheck: any[] = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { recordMotivations: true },
      })
      value = recordsForMotivationCheck.filter(r => !r.recordMotivations || r.recordMotivations.length === 0).length
      break

    // ==========================================
    // STATUSES DATA SOURCES
    // ==========================================
    case 'statuses':
      value = await prisma.status.count({ where: { createdById: ownerId } })
      break

    case 'statuses_active':
      value = await prisma.status.count({ where: { createdById: ownerId, isActive: true } })
      break

    case 'statuses_inactive':
      value = await prisma.status.count({ where: { createdById: ownerId, isActive: false } })
      break

    // ==========================================
    // PHONES DATA SOURCES
    // ==========================================
    case 'phones':
      value = await prisma.recordPhoneNumber.count({ where: { record: { createdById: ownerId } } })
      break

    case 'phones_mobile':
      value = await prisma.recordPhoneNumber.count({ where: { record: { createdById: ownerId }, type: 'mobile' } })
      break

    case 'phones_landline':
      value = await prisma.recordPhoneNumber.count({ where: { record: { createdById: ownerId }, type: 'landline' } })
      break

    case 'phones_voip':
      value = await prisma.recordPhoneNumber.count({ where: { record: { createdById: ownerId }, type: 'voip' } })
      break

    case 'phones_dnc':
      // DNC phones have 'DNC' in their statuses array
      const allPhones = await prisma.recordPhoneNumber.findMany({ where: { record: { createdById: ownerId } } })
      value = allPhones.filter(p => p.statuses.includes('DNC')).length
      break

    case 'records_with_phones':
      const recordsWithPhones = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { phoneNumbers: true },
      })
      value = recordsWithPhones.filter(r => r.phoneNumbers.length > 0).length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_without_phones':
      const recordsForPhoneCheck = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { phoneNumbers: true },
      })
      value = recordsForPhoneCheck.filter(r => r.phoneNumbers.length === 0).length
      break

    case 'records_multiple_phones':
      const recordsMultiPhones = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { phoneNumbers: true },
      })
      value = recordsMultiPhones.filter(r => r.phoneNumbers.length > 1).length
      break

    // ==========================================
    // EMAILS DATA SOURCES
    // ==========================================
    case 'emails':
      value = await prisma.recordEmail.count({ where: { record: { createdById: ownerId } } })
      break

    case 'emails_primary':
      value = await prisma.recordEmail.count({ where: { record: { createdById: ownerId }, isPrimary: true } })
      break

    case 'records_with_emails':
      const recordsWithEmails = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { emails: true },
      })
      value = recordsWithEmails.filter(r => r.emails.length > 0).length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total = await prisma.record.count({ where: whereClause as any })
      break

    case 'records_without_emails':
      const recordsForEmailCheck = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { emails: true },
      })
      value = recordsForEmailCheck.filter(r => r.emails.length === 0).length
      break

    case 'records_multiple_emails':
      const recordsMultiEmails = await prisma.record.findMany({
        where: { createdById: ownerId },
        include: { emails: true },
      })
      value = recordsMultiEmails.filter(r => r.emails.length > 1).length
      break

    // ==========================================
    // BOARDS DATA SOURCES
    // ==========================================
    case 'boards':
      value = await prisma.board.count({ where: { createdById: ownerId } })
      break

    case 'board_columns':
      value = await prisma.boardColumn.count({ where: { board: { createdById: ownerId } } })
      break

    case 'records_on_boards':
      value = await prisma.recordBoardPosition.count({ where: { column: { board: { createdById: ownerId } } } })
      break

    case 'records_not_on_boards':
      const totalRecordsForBoards = await prisma.record.count({ where: { createdById: ownerId } })
      const recordsOnBoardsList = await prisma.recordBoardPosition.findMany({
        where: { column: { board: { createdById: ownerId } } },
        select: { recordId: true },
        distinct: ['recordId'],
      })
      value = totalRecordsForBoards - recordsOnBoardsList.length
      break

    // ==========================================
    // AUTOMATIONS DATA SOURCES
    // ==========================================
    case 'automations':
      value = await prisma.automation.count({ where: { createdById: ownerId } })
      break

    case 'automations_active':
      value = await prisma.automation.count({ where: { createdById: ownerId, isActive: true } })
      total = await prisma.automation.count({ where: { createdById: ownerId } })
      break

    case 'automations_inactive':
      value = await prisma.automation.count({ where: { createdById: ownerId, isActive: false } })
      break

    case 'automation_runs':
      const automationsForRuns = await prisma.automation.findMany({
        where: { createdById: ownerId },
        select: { runCount: true },
      })
      value = automationsForRuns.reduce((sum, a) => sum + a.runCount, 0)
      break

    case 'automation_runs_completed':
      value = await prisma.automationLog.count({
        where: { automation: { createdById: ownerId }, status: 'COMPLETED' },
      })
      break

    case 'automation_runs_failed':
      value = await prisma.automationLog.count({
        where: { automation: { createdById: ownerId }, status: 'FAILED' },
      })
      break

    case 'automation_runs_running':
      value = await prisma.automationLog.count({
        where: { automation: { createdById: ownerId }, status: 'RUNNING' },
      })
      break

    // ==========================================
    // TEAM DATA SOURCES
    // ==========================================
    case 'team':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }] } })
      break

    case 'team_owners':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }], role: 'OWNER' } })
      break

    case 'team_admins':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }], role: 'ADMIN' } })
      break

    case 'team_members':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }], role: 'MEMBER' } })
      break

    case 'team_active':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }], status: 'active' } })
      break

    case 'team_inactive':
      value = await prisma.user.count({ where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }], status: 'inactive' } })
      break

    // ==========================================
    // ACTIVITY DATA SOURCES
    // ==========================================
    case 'activity':
      value = await prisma.activityLog.count({
        where: dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {},
      })
      break

    case 'activity_record':
      value = await prisma.activityLog.count({
        where: {
          type: 'RECORD',
          ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
        },
      })
      break

    case 'activity_imports':
      value = await prisma.activityLog.count({
        where: {
          action: { contains: 'import' },
          ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
        },
      })
      break

    // ==========================================
    // CUSTOM FIELDS DATA SOURCES
    // ==========================================
    case 'custom_fields':
      value = await prisma.customFieldDefinition.count({ where: { createdById: ownerId } })
      break

    case 'custom_field_values':
      value = await prisma.customFieldValue.count({ where: { field: { createdById: ownerId } } })
      break

    // ==========================================
    // DEFAULT
    // ==========================================
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value = await prisma.record.count({ where: whereClause as any })
  }

  const change = previousValue !== undefined ? value - previousValue : undefined
  const changePercent = previousValue && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : undefined
  const percentage = total && total > 0 ? (value / total) * 100 : undefined

  return { value, previousValue, change, changePercent, total, percentage }
}

// ==========================================
// CALCULATED METRICS - Formula-based calculations
// ==========================================
async function getCalculatedMetric(
  config: WidgetConfig,
  ownerId: string,
  dateRange: { start: Date; end: Date } | null
) {
  if (!config.calculatedMetric) {
    return { value: 0 }
  }

  const { formula, sources } = config.calculatedMetric
  const values: Record<string, number> = {}

  // Get value for each source variable
  for (const source of sources) {
    const sourceConfig: WidgetConfig = {
      dataSource: source.dataSource,
      metric: source.metric || 'count',
      timePeriod: config.timePeriod,
    }
    
    const baseWhere = {
      createdById: ownerId,
      ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
    }
    
    const result = await getNumberData(sourceConfig, baseWhere, ownerId, dateRange)
    values[source.variable] = result.value
  }

  // Evaluate the formula
  let calculatedValue = 0
  try {
    // Replace variables with values in the formula
    let evalFormula = formula
    for (const [variable, val] of Object.entries(values)) {
      evalFormula = evalFormula.replace(new RegExp(variable, 'g'), String(val))
    }
    
    // Safe evaluation (only allow numbers and basic operators)
    if (/^[\d\s+\-*/().]+$/.test(evalFormula)) {
      calculatedValue = eval(evalFormula)
    }
    
    // Handle NaN and Infinity
    if (!isFinite(calculatedValue)) {
      calculatedValue = 0
    }
  } catch {
    calculatedValue = 0
  }

  return {
    value: Math.round(calculatedValue * 100) / 100, // Round to 2 decimal places
    sourceValues: values,
    formula,
  }
}

// ==========================================
// PRESET CALCULATED METRICS
// ==========================================
async function getPresetCalculatedMetric(
  preset: string,
  ownerId: string,
  dateRange: { start: Date; end: Date } | null
) {
  const baseWhere = {
    createdById: ownerId,
    ...(dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {}),
  }

  switch (preset) {
    case 'hot_lead_percentage': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hotLeads = await prisma.record.count({ where: { ...baseWhere, temperature: 'hot' } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecords = await prisma.record.count({ where: baseWhere as any })
      return {
        value: totalRecords > 0 ? Math.round((hotLeads / totalRecords) * 100 * 10) / 10 : 0,
        label: 'Hot Lead %',
        sourceValues: { hotLeads, totalRecords },
      }
    }
    
    case 'contact_rate': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await prisma.record.count({ where: { ...baseWhere, isContact: true } as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecords = await prisma.record.count({ where: baseWhere as any })
      return {
        value: totalRecords > 0 ? Math.round((contacts / totalRecords) * 100 * 10) / 10 : 0,
        label: 'Contact Rate %',
        sourceValues: { contacts, totalRecords },
      }
    }
    
    case 'task_completion_rate': {
      const completedTasks = await prisma.task.count({ where: { createdById: ownerId, status: 'COMPLETED' } })
      const totalTasks = await prisma.task.count({ where: { createdById: ownerId } })
      return {
        value: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0,
        label: 'Task Completion Rate %',
        sourceValues: { completedTasks, totalTasks },
      }
    }
    
    case 'avg_tasks_per_record': {
      const totalTasks = await prisma.task.count({ where: { createdById: ownerId } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecords = await prisma.record.count({ where: baseWhere as any })
      return {
        value: totalRecords > 0 ? Math.round((totalTasks / totalRecords) * 100) / 100 : 0,
        label: 'Avg Tasks per Record',
        sourceValues: { totalTasks, totalRecords },
      }
    }
    
    case 'automation_success_rate': {
      const successfulRuns = await prisma.automationLog.count({
        where: { automation: { createdById: ownerId }, status: 'COMPLETED' },
      })
      const totalRuns = await prisma.automationLog.count({
        where: { automation: { createdById: ownerId } },
      })
      return {
        value: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100 * 10) / 10 : 0,
        label: 'Automation Success Rate %',
        sourceValues: { successfulRuns, totalRuns },
      }
    }
    
    case 'records_per_team_member': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRecords = await prisma.record.count({ where: baseWhere as any })
      const teamMembers = await prisma.user.count({
        where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }] },
      })
      return {
        value: teamMembers > 0 ? Math.round((totalRecords / teamMembers) * 10) / 10 : 0,
        label: 'Records per Team Member',
        sourceValues: { totalRecords, teamMembers },
      }
    }
    
    default:
      return { value: 0, label: 'Unknown', sourceValues: {} }
  }
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
          const count = await prisma.record.count({ where: { ...whereClause, statusId: status.id } as any })
          data.push({ label: status.name, value: count, color: status.color })
        }
      } else if (config.groupBy === 'temperature') {
        const temps = ['hot', 'warm', 'cold']
        const tempColors: Record<string, string> = { hot: '#EF4444', warm: '#F59E0B', cold: '#3B82F6' }
        for (const temp of temps) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({ where: { ...whereClause, temperature: temp } as any })
          data.push({ label: temp.charAt(0).toUpperCase() + temp.slice(1), value: count, color: tempColors[temp] })
        }
      } else if (config.groupBy === 'tag') {
        const tags = await prisma.tag.findMany({ where: { createdById: ownerId }, include: { records: true } })
        for (const tag of tags) {
          data.push({ label: tag.name, value: tag.records.length })
        }
      } else if (config.groupBy === 'motivation') {
        const motivations = await prisma.motivation.findMany({ where: { createdById: ownerId }, include: { records: true } })
        for (const motivation of motivations) {
          data.push({ label: motivation.name, value: motivation.records.length })
        }
      } else if (config.groupBy === 'assignedTo' || config.groupBy === 'createdBy') {
        const users = await prisma.user.findMany({
          where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }] },
          select: { id: true, name: true, email: true },
        })
        const field = config.groupBy === 'assignedTo' ? 'assignedToId' : 'createdById'
        for (const user of users) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({ where: { ...whereClause, [field]: user.id } as any })
          data.push({ label: user.name || user.email, value: count })
        }
        if (config.groupBy === 'assignedTo') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unassigned = await prisma.record.count({ where: { ...whereClause, assignedToId: null } as any })
          if (unassigned > 0) data.push({ label: 'Unassigned', value: unassigned, color: '#9CA3AF' })
        }
      } else if (config.groupBy === 'propertyState') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { propertyState: true } })
        const stateCounts: Record<string, number> = {}
        for (const r of records) {
          const state = r.propertyState || 'Unknown'
          stateCounts[state] = (stateCounts[state] || 0) + 1
        }
        for (const [state, count] of Object.entries(stateCounts).sort((a, b) => b[1] - a[1])) {
          data.push({ label: state, value: count })
        }
      } else if (config.groupBy === 'propertyCity') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { propertyCity: true } })
        const cityCounts: Record<string, number> = {}
        for (const r of records) {
          const city = r.propertyCity || 'Unknown'
          cityCounts[city] = (cityCounts[city] || 0) + 1
        }
        for (const [city, count] of Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
          data.push({ label: city, value: count })
        }
      } else if (config.groupBy === 'structureType') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { structureType: true } })
        const typeCounts: Record<string, number> = {}
        for (const r of records) {
          const type = r.structureType || 'Unknown'
          typeCounts[type] = (typeCounts[type] || 0) + 1
        }
        for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
          data.push({ label: type, value: count })
        }
      } else if (config.groupBy === 'yearBuilt') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { yearBuilt: true } })
        const yearCounts: Record<string, number> = {}
        for (const r of records) {
          const decade = r.yearBuilt ? `${Math.floor(r.yearBuilt / 10) * 10}s` : 'Unknown'
          yearCounts[decade] = (yearCounts[decade] || 0) + 1
        }
        for (const [decade, count] of Object.entries(yearCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
          data.push({ label: decade, value: count })
        }
      } else if (config.groupBy === 'bedrooms') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { bedrooms: true } })
        const bedCounts: Record<string, number> = {}
        for (const r of records) {
          const beds = r.bedrooms !== null ? `${r.bedrooms} BR` : 'Unknown'
          bedCounts[beds] = (bedCounts[beds] || 0) + 1
        }
        for (const [beds, count] of Object.entries(bedCounts).sort((a, b) => {
          const aNum = parseInt(a[0]) || 999
          const bNum = parseInt(b[0]) || 999
          return aNum - bNum
        })) {
          data.push({ label: beds, value: count })
        }
      } else if (config.groupBy === 'bathrooms') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { bathrooms: true } })
        const bathCounts: Record<string, number> = {}
        for (const r of records) {
          const baths = r.bathrooms !== null ? `${Number(r.bathrooms)} BA` : 'Unknown'
          bathCounts[baths] = (bathCounts[baths] || 0) + 1
        }
        for (const [baths, count] of Object.entries(bathCounts).sort((a, b) => {
          const aNum = parseFloat(a[0]) || 999
          const bNum = parseFloat(b[0]) || 999
          return aNum - bNum
        })) {
          data.push({ label: baths, value: count })
        }
      } else if (config.groupBy === 'day' || config.groupBy === 'week' || config.groupBy === 'month' || config.groupBy === 'quarter' || config.groupBy === 'year') {
        // Time-based grouping - delegate to time series logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records: any[] = await prisma.record.findMany({ where: whereClause as any, select: { createdAt: true } })
        const timeCounts: Record<string, number> = {}
        for (const r of records) {
          const date = new Date(r.createdAt)
          let key: string
          if (config.groupBy === 'day') key = date.toISOString().split('T')[0]
          else if (config.groupBy === 'week') {
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = `Week of ${weekStart.toISOString().split('T')[0]}`
          }
          else if (config.groupBy === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          else if (config.groupBy === 'quarter') key = `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`
          else key = `${date.getFullYear()}`
          timeCounts[key] = (timeCounts[key] || 0) + 1
        }
        for (const [time, count] of Object.entries(timeCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
          data.push({ label: time, value: count })
        }
      } else {
        // Default: group by status
        const defaultStatuses = await prisma.status.findMany({ where: { createdById: ownerId }, orderBy: { order: 'asc' } })
        for (const status of defaultStatuses) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const count = await prisma.record.count({ where: { ...whereClause, statusId: status.id } as any })
          data.push({ label: status.name, value: count, color: status.color })
        }
      }
      break

    case 'tasks':
      if (config.groupBy === 'status') {
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED']
        const statusColors: Record<string, string> = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', COMPLETED: '#10B981' }
        for (const status of statuses) {
          const count = await prisma.task.count({ where: { createdById: ownerId, status } })
          data.push({ label: status.replace('_', ' '), value: count, color: statusColors[status] })
        }
      } else if (config.groupBy === 'priority') {
        const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
        const priorityColors: Record<string, string> = { LOW: '#9CA3AF', MEDIUM: '#3B82F6', HIGH: '#F59E0B', URGENT: '#EF4444' }
        for (const priority of priorities) {
          const count = await prisma.task.count({ where: { createdById: ownerId, priority } })
          data.push({ label: priority, value: count, color: priorityColors[priority] })
        }
      } else if (config.groupBy === 'assignedTo') {
        const users = await prisma.user.findMany({
          where: { OR: [{ id: ownerId }, { accountOwnerId: ownerId }] },
          select: { id: true, name: true, email: true },
        })
        for (const user of users) {
          const count = await prisma.task.count({ where: { createdById: ownerId, assignedToId: user.id } })
          data.push({ label: user.name || user.email, value: count })
        }
        const unassigned = await prisma.task.count({ where: { createdById: ownerId, assignedToId: null } })
        if (unassigned > 0) data.push({ label: 'Unassigned', value: unassigned, color: '#9CA3AF' })
      } else if (config.groupBy === 'day' || config.groupBy === 'week' || config.groupBy === 'month') {
        const tasks = await prisma.task.findMany({ where: { createdById: ownerId }, select: { createdAt: true } })
        const timeCounts: Record<string, number> = {}
        for (const t of tasks) {
          const date = new Date(t.createdAt)
          let key: string
          if (config.groupBy === 'day') key = date.toISOString().split('T')[0]
          else if (config.groupBy === 'week') {
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = `Week of ${weekStart.toISOString().split('T')[0]}`
          }
          else key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          timeCounts[key] = (timeCounts[key] || 0) + 1
        }
        for (const [time, count] of Object.entries(timeCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
          data.push({ label: time, value: count })
        }
      } else {
        // Default: group by status
        const defaultStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED']
        const defaultColors: Record<string, string> = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', COMPLETED: '#10B981' }
        for (const status of defaultStatuses) {
          const count = await prisma.task.count({ where: { createdById: ownerId, status } })
          data.push({ label: status.replace('_', ' '), value: count, color: defaultColors[status] })
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
