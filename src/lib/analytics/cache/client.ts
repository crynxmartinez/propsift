/**
 * DockInsight 2.2.2 Cache Client
 * 
 * Provides a unified cache interface with Vercel KV (Redis) as primary
 * and in-memory fallback for development/testing.
 */

import { kv } from '@vercel/kv'

// In-memory cache for development fallback
const memoryCache = new Map<string, { value: unknown; expiry: number }>()

/**
 * Check if Vercel KV is available
 */
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (isKVAvailable()) {
      return await kv.get<T>(key)
    }
    
    // Memory fallback
    const item = memoryCache.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      memoryCache.delete(key)
      return null
    }
    return item.value as T
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set value in cache with TTL (seconds)
 */
export async function cacheSet<T>(
  key: string, 
  value: T, 
  ttlSeconds: number
): Promise<void> {
  try {
    if (isKVAvailable()) {
      await kv.set(key, value, { ex: ttlSeconds })
      return
    }
    
    // Memory fallback
    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

/**
 * Delete value from cache
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    if (isKVAvailable()) {
      await kv.del(key)
      return
    }
    
    // Memory fallback
    memoryCache.delete(key)
  } catch (error) {
    console.error('Cache del error:', error)
  }
}

/**
 * Get multiple values from cache
 */
export async function cacheMGet<T>(...keys: string[]): Promise<(T | null)[]> {
  try {
    if (isKVAvailable()) {
      return await kv.mget<T[]>(...keys)
    }
    
    // Memory fallback
    return keys.map(key => {
      const item = memoryCache.get(key)
      if (!item) return null
      if (Date.now() > item.expiry) {
        memoryCache.delete(key)
        return null
      }
      return item.value as T
    })
  } catch (error) {
    console.error('Cache mget error:', error)
    return keys.map(() => null)
  }
}

/**
 * Increment a counter in cache
 */
export async function cacheIncr(key: string): Promise<number> {
  try {
    if (isKVAvailable()) {
      return await kv.incr(key)
    }
    
    // Memory fallback
    const item = memoryCache.get(key)
    const current = (item?.value as number) || 0
    const next = current + 1
    memoryCache.set(key, { value: next, expiry: Infinity })
    return next
  } catch (error) {
    console.error('Cache incr error:', error)
    return 0
  }
}

/**
 * Set value if not exists, with TTL
 */
export async function cacheSetNX(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<boolean> {
  try {
    if (isKVAvailable()) {
      const result = await kv.setnx(key, value)
      if (result) {
        await kv.expire(key, ttlSeconds)
      }
      return result === 1
    }
    
    // Memory fallback
    if (memoryCache.has(key)) {
      return false
    }
    memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
    return true
  } catch (error) {
    console.error('Cache setnx error:', error)
    return false
  }
}

/**
 * Clear all cache entries matching a pattern (for testing)
 */
export function clearMemoryCache(): void {
  memoryCache.clear()
}
