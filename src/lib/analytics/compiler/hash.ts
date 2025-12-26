/**
 * DockInsight 2.2.2 Query Hash Compiler
 * 
 * Computes deterministic cache keys for widget queries.
 * 
 * v2.2.2 Contract:
 * - Hash includes resolved ISO timestamps (not presets)
 * - Hash includes timezone for preset resolution consistency
 * - Hash includes permission hash
 * - All arrays sorted for stability
 */

import type { WidgetQueryInput, CompileCtx } from '../registry/types'
import { stableStringify, normalizeGlobalFilters, sortFilters } from './utils'
import { getResolvedDateRangeForHash } from './dates'

/**
 * Compute deterministic query hash for caching.
 * 
 * v2.2.2 Contract:
 * - Include resolved dateRange (ISO strings, not presets)
 * - Include ctx.timezone for preset resolution
 * - Include ctx.permissionHash
 * - Sort all arrays for stability
 */
export function computeQueryHash(
  input: WidgetQueryInput,
  ctx: CompileCtx
): string {
  // Effective date range: widget override or global
  const effectiveDateRange = input.dateRange ?? input.globalFilters.dateRange
  
  // Resolve to ISO strings for deterministic hash
  const resolvedDateRange = getResolvedDateRangeForHash(effectiveDateRange, ctx.timezone)
  
  // Build hash input object
  const hashInput = {
    // Entity and segment
    entityKey: input.entityKey,
    segmentKey: input.segmentKey ?? null,
    
    // Metric
    metric: {
      key: input.metric.key,
      field: input.metric.field ?? null,
      filter: input.metric.filter ? sortFilters(input.metric.filter) : null
    },
    
    // Dimension
    dimension: input.dimension ?? null,
    
    // Widget filters (sorted)
    filters: sortFilters(input.filters),
    
    // Global filters (normalized, dateRange excluded)
    globalFilters: normalizeGlobalFilters(
      Object.fromEntries(
        Object.entries(input.globalFilters).filter(([k]) => k !== 'dateRange')
      )
    ),
    
    // v2.2.2: Resolved date range (ISO strings)
    dateRange: resolvedDateRange,
    dateMode: input.dateMode ?? null,
    
    // Granularity for time series
    granularity: input.granularity ?? null,
    
    // Sort and limit
    sort: input.sort ?? null,
    limit: input.limit ?? null,
    
    // v2.2.2: Context for cache key
    tenantId: ctx.tenantId,
    timezone: ctx.timezone,
    permissionHash: ctx.permissionHash
  }
  
  return stableStringify(hashInput)
}

/**
 * Compute a short hash for display/debugging.
 * Uses first 16 chars of full hash.
 */
export function computeShortHash(
  input: WidgetQueryInput,
  ctx: CompileCtx
): string {
  const fullHash = computeQueryHash(input, ctx)
  // Simple hash function for short display
  let hash = 0
  for (let i = 0; i < fullHash.length; i++) {
    const char = fullHash.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(8, '0')
}
