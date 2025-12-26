/**
 * DockInsight 2.2.2 Rate Limiting
 * 
 * Rate limiting utilities for API protection.
 */

import { cacheIncr, cacheSet } from '../cache'

export interface RateLimitConfig {
  windowSeconds: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / config.windowSeconds)}`
  
  const count = await cacheIncr(windowKey)
  
  // Set expiry on first request
  if (count === 1) {
    await cacheSet(windowKey, count, config.windowSeconds + 1)
  }
  
  const resetAt = (Math.floor(Date.now() / 1000 / config.windowSeconds) + 1) * config.windowSeconds * 1000
  
  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt
  }
}

/**
 * Assert rate limit - throws if exceeded
 */
export async function assertRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(key, config)
  
  if (!result.allowed) {
    const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`)
    error.name = 'RateLimitError'
    throw error
  }
}

/**
 * Default rate limit configs
 */
export const RATE_LIMITS = {
  widget: { windowSeconds: 1, maxRequests: 20 },
  drilldown: { windowSeconds: 1, maxRequests: 10 },
  labels: { windowSeconds: 1, maxRequests: 50 },
  search: { windowSeconds: 1, maxRequests: 5 }
} as const
