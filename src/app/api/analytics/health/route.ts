/**
 * DockInsight 2.2.2 Health Check API
 * 
 * GET /api/analytics/health
 * 
 * Returns health status of the analytics system.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/analytics/cache'
import { REGISTRY_VERSION } from '@/lib/analytics/registry'

/**
 * GET handler - Health check
 */
export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {}
  
  // Check database
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latency: Date.now() - dbStart }
  } catch (error) {
    checks.database = { 
      status: 'error', 
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Check cache
  const cacheStart = Date.now()
  try {
    const testKey = `health:${Date.now()}`
    await cacheSet(testKey, 'test', 10)
    const result = await cacheGet(testKey)
    checks.cache = { 
      status: result === 'test' ? 'ok' : 'error', 
      latency: Date.now() - cacheStart 
    }
  } catch (error) {
    checks.cache = { 
      status: 'error', 
      latency: Date.now() - cacheStart,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // Overall status
  const allOk = Object.values(checks).every(c => c.status === 'ok')
  
  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    version: REGISTRY_VERSION,
    timestamp: new Date().toISOString(),
    checks
  }, { status: allOk ? 200 : 503 })
}
