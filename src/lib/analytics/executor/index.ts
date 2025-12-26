/**
 * DockInsight 2.2.2 Query Executor
 * 
 * Executes compiled queries against Prisma and returns results.
 */

import { prisma } from '../../prisma'
import type { CompiledQuery, MetricConfig, MetricType } from '../registry/types'
import { getMetric } from '../registry'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get Prisma delegate by name
 * Using 'any' to avoid complex Prisma type issues while maintaining runtime safety
 */
function getDelegate(delegateName: string): any {
  const delegates: Record<string, any> = {
    record: prisma.record,
    task: prisma.task,
    recordTag: prisma.recordTag,
    recordMotivation: prisma.recordMotivation,
    recordPhoneNumber: prisma.recordPhoneNumber,
    recordEmail: prisma.recordEmail,
    recordActivityLog: prisma.recordActivityLog,
    tag: prisma.tag,
    motivation: prisma.motivation
  }
  
  const delegate = delegates[delegateName]
  if (!delegate) {
    throw new Error(`Unknown delegate: ${delegateName}`)
  }
  return delegate
}

/**
 * Execute count query
 */
export async function executeCount(compiled: CompiledQuery): Promise<number> {
  const delegate = getDelegate(compiled.delegate)
  return delegate.count({ where: compiled.where })
}

/**
 * Execute sum query
 */
export async function executeSum(
  compiled: CompiledQuery,
  field: string
): Promise<number> {
  const delegate = getDelegate(compiled.delegate)
  
  const result = await delegate.aggregate({
    where: compiled.where,
    _sum: { [field]: true }
  })
  
  return result._sum?.[field] ?? 0
}

/**
 * Execute avg query
 */
export async function executeAvg(
  compiled: CompiledQuery,
  field: string
): Promise<number> {
  const delegate = getDelegate(compiled.delegate)
  
  const result = await delegate.aggregate({
    where: compiled.where,
    _avg: { [field]: true }
  })
  
  return result._avg?.[field] ?? 0
}

/**
 * Execute distinct count query
 */
export async function executeDistinctCount(
  compiled: CompiledQuery,
  field: string
): Promise<number> {
  const delegate = getDelegate(compiled.delegate)
  
  const result = await delegate.findMany({
    where: compiled.where,
    select: { [field]: true },
    distinct: [field]
  })
  
  return result.length
}

/**
 * Execute metric query based on metric type
 */
export async function executeMetric(
  compiled: CompiledQuery,
  metric: MetricConfig
): Promise<number> {
  const metricDef = getMetric(metric.key)
  if (!metricDef) {
    throw new Error(`Unknown metric: ${metric.key}`)
  }
  
  const field = metric.field ?? metricDef.field
  
  switch (metricDef.type) {
    case 'count':
      return executeCount(compiled)
    
    case 'sum':
      if (!field) throw new Error(`Metric ${metric.key} requires a field`)
      return executeSum(compiled, field)
    
    case 'avg':
      if (!field) throw new Error(`Metric ${metric.key} requires a field`)
      return executeAvg(compiled, field)
    
    case 'distinct_count':
      if (!field) throw new Error(`Metric ${metric.key} requires a field`)
      return executeDistinctCount(compiled, field)
    
    case 'rate':
      // Rate requires numerator and denominator
      if (!metricDef.numerator || !metricDef.denominator) {
        throw new Error(`Rate metric ${metric.key} requires numerator and denominator`)
      }
      
      // For now, execute as count / count
      const numerator = await executeCount(compiled)
      const denominator = await executeCount(compiled)
      
      if (denominator === 0) return 0
      return (numerator / denominator) * 100
    
    default:
      throw new Error(`Unknown metric type: ${metricDef.type}`)
  }
}

/**
 * Execute grouped query for dimension breakdown
 */
export async function executeGroupedCount(
  compiled: CompiledQuery,
  groupByField: string
): Promise<{ value: string | null; count: number }[]> {
  const delegate = getDelegate(compiled.delegate)
  
  const result = await delegate.groupBy({
    by: [groupByField],
    where: compiled.where,
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } }
  })
  
  return result.map((row: any) => ({
    value: row[groupByField] as string | null,
    count: row._count._all
  }))
}

/**
 * Execute drilldown query with pagination
 */
export async function executeDrilldown(
  compiled: CompiledQuery,
  page: number,
  pageSize: number,
  searchWhere?: Record<string, unknown>
): Promise<{ rows: unknown[]; total: number }> {
  // v2.2.2 FIX: Clamp page >= 1
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(100, Math.max(1, pageSize))
  const skip = (safePage - 1) * safePageSize
  
  // Combine compiled where with search
  const where = searchWhere 
    ? { AND: [compiled.where, searchWhere] }
    : compiled.where
  
  const delegate = getDelegate(compiled.delegate)
  
  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      skip,
      take: safePageSize,
      orderBy: compiled.orderBy
    }),
    delegate.count({ where })
  ])
  
  return { rows, total }
}
