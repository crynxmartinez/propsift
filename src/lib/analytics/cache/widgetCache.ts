/**
 * DockInsight 2.2.2 Widget Cache
 * 
 * Caches widget query results with dependency-version keys.
 * 
 * v2.2.2 Contract:
 * - Cache key includes REGISTRY_VERSION, tenantId, depsHash, permissionHash, queryHash
 * - TTL: 5 minutes for widget data
 * - Automatic invalidation via dependency versions
 */

import { cacheGet, cacheSet } from './client'
import { computeDepsHash } from './versions'
import { REGISTRY_VERSION } from '../registry'

const WIDGET_CACHE_TTL = 60 * 5  // 5 minutes

/**
 * Widget cache result structure
 */
export interface WidgetCacheResult<T> {
  data: T
  cachedAt: string
  hash: string
}

/**
 * Build widget cache key
 * 
 * v2.2.2 Contract:
 * - Include REGISTRY_VERSION for schema changes
 * - Include depsHash for dependency-version invalidation
 * - Include permissionHash for permission-scoped caching
 * - Include queryHash for query-specific caching
 */
export async function buildWidgetCacheKey(
  tenantId: string,
  deps: string[],
  permissionHash: string,
  queryHash: string
): Promise<string> {
  const depsHash = await computeDepsHash(tenantId, deps)
  
  // Use a shorter hash for the key
  const shortQueryHash = hashString(queryHash).toString(36)
  const shortPermHash = hashString(permissionHash).toString(36)
  
  return `w:${REGISTRY_VERSION}:${tenantId}:${depsHash}:${shortPermHash}:${shortQueryHash}`
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Get cached widget data
 */
export async function getWidgetCache<T>(
  tenantId: string,
  deps: string[],
  permissionHash: string,
  queryHash: string
): Promise<WidgetCacheResult<T> | null> {
  const key = await buildWidgetCacheKey(tenantId, deps, permissionHash, queryHash)
  return cacheGet<WidgetCacheResult<T>>(key)
}

/**
 * Set widget data in cache
 */
export async function setWidgetCache<T>(
  tenantId: string,
  deps: string[],
  permissionHash: string,
  queryHash: string,
  data: T
): Promise<void> {
  const key = await buildWidgetCacheKey(tenantId, deps, permissionHash, queryHash)
  
  const result: WidgetCacheResult<T> = {
    data,
    cachedAt: new Date().toISOString(),
    hash: queryHash
  }
  
  await cacheSet(key, result, WIDGET_CACHE_TTL)
}

/**
 * Fetch widget data with caching
 * 
 * Flow:
 * 1. Build cache key with current dependency versions
 * 2. Check cache
 * 3. If miss, execute query and store result
 * 4. Return data with cache metadata
 */
export async function fetchWithCache<T>(
  tenantId: string,
  deps: string[],
  permissionHash: string,
  queryHash: string,
  fetchFn: () => Promise<T>
): Promise<{ data: T; cached: boolean; cachedAt?: string }> {
  // Try cache first
  const cached = await getWidgetCache<T>(tenantId, deps, permissionHash, queryHash)
  
  if (cached) {
    return {
      data: cached.data,
      cached: true,
      cachedAt: cached.cachedAt
    }
  }
  
  // Cache miss - execute query
  const data = await fetchFn()
  
  // Store in cache (don't await to not block response)
  setWidgetCache(tenantId, deps, permissionHash, queryHash, data).catch(err => {
    console.error('Failed to cache widget data:', err)
  })
  
  return {
    data,
    cached: false
  }
}
