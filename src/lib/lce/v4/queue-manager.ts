/**
 * LCE v4.0 Queue Manager
 * Lead Cadence Engine - Queue Tier Assignment & Building
 * 
 * Assigns records to tiers 1-9 based on priority:
 * 1. Callbacks due
 * 2. New leads
 * 3. Blitz follow-ups
 * 4. Tasks due
 * 5. Cadence steps due
 * 6. General call queue
 * 7. Verify first
 * 8. Get numbers
 * 9. Nurture
 */

import type {
  CadencePhase,
  CadenceState,
  QueueTier,
  QueueAssignment,
  LCERecord,
} from './types'

import { QUEUE_TIER_CONFIG, QUEUE_VISIBLE_STATES } from './types'
import { TIER_TO_BUCKET } from './constants'

// ==========================================
// QUEUE TIER ASSIGNMENT
// ==========================================

export function assignQueueTier(record: {
  cadencePhase: CadencePhase
  cadenceState: CadenceState
  callbackScheduledFor: Date | null
  nextActionDue: Date | null
  callAttempts: number
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  priorityScore: number
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  phoneExhaustedAt: Date | null
  hasValidPhone: boolean
  phoneCount: number
}): QueueAssignment {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Not workable states go to tier 9 (nurture) or excluded
  if (!QUEUE_VISIBLE_STATES.includes(record.cadenceState)) {
    return {
      tier: 9,
      bucket: 'nurture',
      reason: `State ${record.cadenceState} not in active queue`,
      priority: 0,
    }
  }

  // Tier 1: Callbacks due NOW or today
  if (record.callbackScheduledFor) {
    const callbackDate = new Date(record.callbackScheduledFor)
    if (callbackDate <= now) {
      return {
        tier: 1,
        bucket: 'call-now',
        reason: 'Callback due now',
        priority: 100,
      }
    }
    const callbackDay = new Date(callbackDate.getFullYear(), callbackDate.getMonth(), callbackDate.getDate())
    if (callbackDay.getTime() === today.getTime()) {
      return {
        tier: 1,
        bucket: 'call-now',
        reason: 'Callback scheduled today',
        priority: 90,
      }
    }
  }

  // Tier 2: New leads (never called, phase = NEW)
  if (record.cadencePhase === 'NEW' && record.callAttempts === 0) {
    return {
      tier: 2,
      bucket: 'call-now',
      reason: 'New lead - first to market!',
      priority: record.priorityScore,
    }
  }

  // Tier 3: Blitz follow-ups due today
  if ((record.cadencePhase === 'BLITZ_1' || record.cadencePhase === 'BLITZ_2') && record.nextActionDue) {
    const actionDate = new Date(record.nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return {
        tier: 3,
        bucket: 'call-now',
        reason: 'Blitz follow-up due',
        priority: record.priorityScore,
      }
    }
  }

  // Tier 4: Tasks due (overdue or today)
  if (record.hasOverdueTask) {
    return {
      tier: 4,
      bucket: 'follow-up-today',
      reason: 'Overdue task',
      priority: 100,
    }
  }
  if (record.hasDueTodayTask) {
    return {
      tier: 4,
      bucket: 'follow-up-today',
      reason: 'Task due today',
      priority: 90,
    }
  }

  // Tier 5: Temperature cadence steps due today
  if (record.cadencePhase === 'TEMPERATURE' && record.nextActionDue) {
    const actionDate = new Date(record.nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return {
        tier: 5,
        bucket: 'follow-up-today',
        reason: 'Cadence step due',
        priority: record.priorityScore,
      }
    }
  }

  // Tier 6: General call queue (active, due today or overdue)
  if (record.cadenceState === 'ACTIVE' && record.nextActionDue) {
    const actionDate = new Date(record.nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return {
        tier: 6,
        bucket: 'call-queue',
        reason: 'Active in queue',
        priority: record.priorityScore,
      }
    }
  }

  // Tier 7: Verify first (high score but low confidence)
  if (record.confidenceLevel === 'LOW' && record.priorityScore >= 60) {
    return {
      tier: 7,
      bucket: 'verify-first',
      reason: 'High score, low confidence - verify data',
      priority: record.priorityScore,
    }
  }

  // Tier 8: Get numbers (phone exhausted or no phones)
  if (record.phoneExhaustedAt || !record.hasValidPhone || record.phoneCount === 0) {
    return {
      tier: 8,
      bucket: 'get-numbers',
      reason: record.phoneCount === 0 ? 'No phone numbers' : 'All phones exhausted',
      priority: record.priorityScore,
    }
  }

  // Tier 9: Nurture (everything else)
  return {
    tier: 9,
    bucket: 'nurture',
    reason: 'Long-term nurture',
    priority: record.priorityScore,
  }
}

// ==========================================
// BUCKET ASSIGNMENT
// ==========================================

export function assignQueueBucket(tier: QueueTier): string {
  return TIER_TO_BUCKET[tier] || 'nurture'
}

// ==========================================
// QUEUE BUILDING
// ==========================================

export interface QueueRecord {
  id: string
  tier: QueueTier
  bucket: string
  priority: number
  reason: string
}

export function buildQueue<T extends { id: string }>(
  records: T[],
  getTierAssignment: (record: T) => QueueAssignment
): QueueRecord[] {
  return records
    .map(record => {
      const assignment = getTierAssignment(record)
      return {
        id: record.id,
        tier: assignment.tier,
        bucket: assignment.bucket,
        priority: assignment.priority,
        reason: assignment.reason,
      }
    })
    .sort((a, b) => {
      // Sort by tier first (lower = higher priority)
      if (a.tier !== b.tier) return a.tier - b.tier
      // Then by priority within tier (higher = more urgent)
      return b.priority - a.priority
    })
}

// ==========================================
// QUEUE FILTERING
// ==========================================

export function filterQueueByBucket(queue: QueueRecord[], bucket: string): QueueRecord[] {
  return queue.filter(r => r.bucket === bucket)
}

export function filterQueueByTier(queue: QueueRecord[], tier: QueueTier): QueueRecord[] {
  return queue.filter(r => r.tier === tier)
}

// ==========================================
// QUEUE COUNTS
// ==========================================

export interface QueueCounts {
  'call-now': number
  'follow-up-today': number
  'call-queue': number
  'verify-first': number
  'get-numbers': number
  'nurture': number
  'not-workable': number
  total: number
}

export function getQueueCounts(queue: QueueRecord[]): QueueCounts {
  const counts: QueueCounts = {
    'call-now': 0,
    'follow-up-today': 0,
    'call-queue': 0,
    'verify-first': 0,
    'get-numbers': 0,
    'nurture': 0,
    'not-workable': 0,
    total: queue.length,
  }

  for (const record of queue) {
    if (record.bucket in counts) {
      counts[record.bucket as keyof Omit<QueueCounts, 'total'>]++
    }
  }

  return counts
}

// ==========================================
// TIER BREAKDOWN
// ==========================================

export interface TierBreakdown {
  tier: QueueTier
  name: string
  icon: string
  count: number
  bucket: string
}

export function getTierBreakdown(queue: QueueRecord[]): TierBreakdown[] {
  const tierCounts: Record<number, number> = {}
  
  for (const record of queue) {
    tierCounts[record.tier] = (tierCounts[record.tier] || 0) + 1
  }

  return Object.entries(QUEUE_TIER_CONFIG).map(([tier, config]) => ({
    tier: parseInt(tier) as QueueTier,
    name: config.name,
    icon: config.icon,
    count: tierCounts[parseInt(tier)] || 0,
    bucket: config.bucket,
  }))
}

// ==========================================
// BUCKET TIER BREAKDOWN (for tooltips)
// ==========================================

export function getBucketTierBreakdown(queue: QueueRecord[], bucket: string): TierBreakdown[] {
  const bucketRecords = filterQueueByBucket(queue, bucket)
  return getTierBreakdown(bucketRecords).filter(t => t.count > 0)
}

// ==========================================
// NEXT UP
// ==========================================

export function getNextUp(queue: QueueRecord[]): QueueRecord | null {
  return queue.length > 0 ? queue[0] : null
}

export function getNextUpInBucket(queue: QueueRecord[], bucket: string): QueueRecord | null {
  const bucketQueue = filterQueueByBucket(queue, bucket)
  return bucketQueue.length > 0 ? bucketQueue[0] : null
}

// ==========================================
// SORT BY PRIORITY
// ==========================================

export function sortByPriority<T extends { tier: number; priority: number }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return b.priority - a.priority
  })
}
