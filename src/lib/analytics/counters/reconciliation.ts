/**
 * DockInsight 2.2.2 Counter Reconciliation
 * 
 * Async job to verify and fix counter drift.
 * Should be run periodically (e.g., nightly) to ensure consistency.
 */

import { prisma } from '../../prisma'
import type { ReconciliationResult, RecordCounters } from './types'

/**
 * Reconcile counters for a single record
 */
export async function reconcileRecord(recordId: string): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = []
  
  // Get current record with counters
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      phoneCount: true,
      emailCount: true,
      tagCount: true,
      motivationCount: true
    }
  })
  
  if (!record) return results
  
  // Count actual related records
  const [phoneCount, emailCount, tagCount, motivationCount] = await Promise.all([
    prisma.recordPhoneNumber.count({ where: { recordId } }),
    prisma.recordEmail.count({ where: { recordId } }),
    prisma.recordTag.count({ where: { recordId } }),
    prisma.recordMotivation.count({ where: { recordId } })
  ])
  
  // Check and fix each counter
  const counters: Array<{ field: keyof RecordCounters; expected: number; actual: number }> = [
    { field: 'phoneCount', expected: phoneCount, actual: record.phoneCount },
    { field: 'emailCount', expected: emailCount, actual: record.emailCount },
    { field: 'tagCount', expected: tagCount, actual: record.tagCount },
    { field: 'motivationCount', expected: motivationCount, actual: record.motivationCount }
  ]
  
  for (const { field, expected, actual } of counters) {
    if (expected !== actual) {
      // Fix the counter
      await prisma.record.update({
        where: { id: recordId },
        data: { [field]: expected }
      })
      
      results.push({
        recordId,
        field,
        expected,
        actual,
        fixed: true
      })
    }
  }
  
  return results
}

/**
 * Reconcile counters for all records in a tenant
 */
export async function reconcileTenant(
  tenantId: string,
  options: { batchSize?: number; onProgress?: (processed: number, total: number) => void } = {}
): Promise<{ processed: number; fixed: number; errors: number }> {
  const { batchSize = 100, onProgress } = options
  
  let processed = 0
  let fixed = 0
  let errors = 0
  
  // Get total count
  const total = await prisma.record.count({
    where: { createdById: tenantId }
  })
  
  // Process in batches
  let cursor: string | undefined
  
  while (true) {
    const records = await prisma.record.findMany({
      where: { createdById: tenantId },
      select: { id: true },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' }
    })
    
    if (records.length === 0) break
    
    for (const record of records) {
      try {
        const results = await reconcileRecord(record.id)
        fixed += results.length
      } catch (error) {
        console.error(`Error reconciling record ${record.id}:`, error)
        errors++
      }
      processed++
    }
    
    cursor = records[records.length - 1].id
    
    if (onProgress) {
      onProgress(processed, total)
    }
  }
  
  return { processed, fixed, errors }
}

/**
 * Reconcile counters for records that have been modified recently
 */
export async function reconcileRecentlyModified(
  tenantId: string,
  since: Date
): Promise<{ processed: number; fixed: number }> {
  let processed = 0
  let fixed = 0
  
  // Find records modified since the given date
  const records = await prisma.record.findMany({
    where: {
      createdById: tenantId,
      updatedAt: { gte: since }
    },
    select: { id: true }
  })
  
  for (const record of records) {
    const results = await reconcileRecord(record.id)
    fixed += results.length
    processed++
  }
  
  return { processed, fixed }
}
