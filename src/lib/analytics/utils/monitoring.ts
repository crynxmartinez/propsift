/**
 * DockInsight 2.2.2 Monitoring
 * 
 * Logging and monitoring utilities for analytics system.
 */

export interface QueryMetrics {
  entityKey: string
  duration: number
  cached: boolean
  error?: string
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
}

/**
 * Log query execution
 */
export function logQuery(metrics: QueryMetrics): void {
  const level = metrics.error ? 'error' : metrics.duration > 1000 ? 'warn' : 'info'
  
  const message = {
    type: 'analytics_query',
    entityKey: metrics.entityKey,
    duration: metrics.duration,
    cached: metrics.cached,
    error: metrics.error,
    timestamp: new Date().toISOString()
  }
  
  if (level === 'error') {
    console.error('[Analytics]', JSON.stringify(message))
  } else if (level === 'warn') {
    console.warn('[Analytics]', JSON.stringify(message))
  } else {
    console.log('[Analytics]', JSON.stringify(message))
  }
}

/**
 * Log cache operation
 */
export function logCacheOp(
  operation: 'hit' | 'miss' | 'set' | 'invalidate',
  key: string,
  duration?: number
): void {
  console.log('[Cache]', JSON.stringify({
    operation,
    key: key.slice(0, 50),  // Truncate for readability
    duration,
    timestamp: new Date().toISOString()
  }))
}

/**
 * Log rate limit event
 */
export function logRateLimit(
  userId: string,
  endpoint: string,
  allowed: boolean
): void {
  if (!allowed) {
    console.warn('[RateLimit]', JSON.stringify({
      userId,
      endpoint,
      allowed,
      timestamp: new Date().toISOString()
    }))
  }
}

/**
 * Log reconciliation event
 */
export function logReconciliation(
  tenantId: string,
  processed: number,
  fixed: number,
  errors: number
): void {
  console.log('[Reconciliation]', JSON.stringify({
    tenantId,
    processed,
    fixed,
    errors,
    timestamp: new Date().toISOString()
  }))
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  if (label) {
    console.log(`[Timing] ${label}: ${duration.toFixed(2)}ms`)
  }
  
  return { result, duration }
}
