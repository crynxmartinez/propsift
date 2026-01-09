/**
 * DockInsight v2 - Priority Scoring Engine
 * 
 * This module computes priority scores for records to determine
 * which leads should be contacted first.
 * 
 * Score Range: 0-100
 * Higher score = Higher priority = Contact sooner
 */

import { Task, RecordPhoneNumber, Motivation, Status, RecordTag } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export type NextAction = 
  | 'Call Now'      // Score ≥70, has valid phone
  | 'Follow Up'     // Has task due today/overdue
  | 'Get Numbers'   // No valid phone numbers
  | 'Nurture'       // Score <50, workable
  | 'Not Workable'  // DNC, Dead, Under Contract

export type Confidence = 'High' | 'Medium' | 'Low'

export interface ScoreReason {
  label: string
  delta: number
  category: 'temperature' | 'motivation' | 'task' | 'contact' | 'engagement' | 'fatigue' | 'data'
}

export interface PriorityResult {
  score: number
  nextAction: NextAction
  confidence: Confidence
  reasons: ScoreReason[]
  topReason: string
  flags: {
    hasValidPhone: boolean
    hasMobilePhone: boolean
    hasTask: boolean
    hasOverdueTask: boolean
    isDnc: boolean
    isClosed: boolean
    isSnoozed: boolean
    neverContacted: boolean
  }
}

export interface RecordWithRelations {
  id: string
  ownerFirstName?: string | null
  ownerLastName?: string | null
  ownerFullName: string
  propertyStreet?: string | null
  propertyCity?: string | null
  propertyState?: string | null
  propertyZip?: string | null
  temperature?: string | null
  callAttempts: number
  skiptraceDate?: Date | null
  createdAt: Date
  updatedAt: Date
  // DockInsight v2 fields
  lastContactedAt?: Date | null
  lastContactType?: string | null
  lastContactResult?: string | null
  hasEngaged?: boolean
  snoozedUntil?: Date | null
  // Relations
  phoneNumbers?: RecordPhoneNumber[]
  recordMotivations?: Array<{ motivation: Motivation }>
  recordTags?: RecordTag[]
  tasks?: Task[]
  status?: Status | null
}

// ============================================
// SCORING WEIGHTS
// ============================================

const TEMPERATURE_SCORES: { [key: string]: number } = {
  'HOT': 40,
  'WARM': 25,
  'COLD': 10,
}

const MOTIVATION_WEIGHTS: { [key: string]: { weight: number; urgency: 'urgent' | 'high' | 'medium' | 'low' } } = {
  'Pre-Foreclosure': { weight: 12, urgency: 'urgent' },
  'Tax Lien': { weight: 12, urgency: 'urgent' },
  'Probate': { weight: 12, urgency: 'urgent' },
  'Divorce': { weight: 8, urgency: 'high' },
  'Tired Landlord': { weight: 8, urgency: 'high' },
  'Code Violation': { weight: 8, urgency: 'high' },
  'Vacant': { weight: 5, urgency: 'medium' },
  'Absentee': { weight: 5, urgency: 'medium' },
  'Inherited': { weight: 5, urgency: 'medium' },
  'High Equity': { weight: 3, urgency: 'low' },
  'MLS Expired': { weight: 3, urgency: 'low' },
}

const MOTIVATION_CAP = 30

const EXCLUDED_STATUSES = [
  'dead',
  'dnc',
  'do not call',
  'under contract',
  'sold',
  'not interested',
  'wrong number',
]

// ============================================
// HELPER FUNCTIONS
// ============================================

function daysSince(date: Date | null | undefined): number {
  if (!date) return Infinity
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function hoursSince(date: Date | null | undefined): number {
  if (!date) return Infinity
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60))
}

function isStatusExcluded(status: Status | null | undefined): boolean {
  if (!status) return false
  return EXCLUDED_STATUSES.some(s => 
    status.name.toLowerCase().includes(s.toLowerCase())
  )
}

function isDnc(status: Status | null | undefined): boolean {
  if (!status) return false
  const name = status.name.toLowerCase()
  return name.includes('dnc') || name.includes('do not call')
}

function hasValidPhone(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => {
    const statuses = p.statuses || []
    return !statuses.some(s => 
      s.toLowerCase().includes('wrong') || 
      s.toLowerCase().includes('disconnected') ||
      s.toLowerCase().includes('invalid')
    )
  })
}

function hasMobilePhone(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => 
    p.type?.toUpperCase() === 'MOBILE' || p.type?.toUpperCase() === 'CELL'
  )
}

function getOverdueTask(tasks: Task[] | undefined): Task | null {
  if (!tasks || tasks.length === 0) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  return tasks.find(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < now
  }) || null
}

function getTaskDueToday(tasks: Task[] | undefined): Task | null {
  if (!tasks || tasks.length === 0) return null
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  return tasks.find(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate).toISOString().split('T')[0]
    return dueDate === today
  }) || null
}

function getTaskDueTomorrow(tasks: Task[] | undefined): Task | null {
  if (!tasks || tasks.length === 0) return null
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  return tasks.find(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate).toISOString().split('T')[0]
    return dueDate === tomorrowStr
  }) || null
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

export function computePriority(record: RecordWithRelations): PriorityResult {
  const reasons: ScoreReason[] = []
  let score = 0
  
  // Flags
  const flags = {
    hasValidPhone: hasValidPhone(record.phoneNumbers),
    hasMobilePhone: hasMobilePhone(record.phoneNumbers),
    hasTask: (record.tasks?.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length || 0) > 0,
    hasOverdueTask: getOverdueTask(record.tasks) !== null,
    isDnc: isDnc(record.status),
    isClosed: isStatusExcluded(record.status),
    isSnoozed: record.snoozedUntil ? new Date(record.snoozedUntil) > new Date() : false,
    neverContacted: !record.lastContactedAt && record.callAttempts === 0,
  }
  
  // ============================================
  // EXCLUSIONS - Return early if not workable
  // ============================================
  
  if (flags.isDnc || flags.isClosed) {
    return {
      score: 0,
      nextAction: 'Not Workable',
      confidence: 'High',
      reasons: [{ label: flags.isDnc ? 'DNC' : 'Closed Status', delta: 0, category: 'data' }],
      topReason: flags.isDnc ? 'Do Not Call' : 'Closed',
      flags,
    }
  }
  
  // ============================================
  // 1. TEMPERATURE (Base Score)
  // ============================================
  
  const temp = record.temperature?.toUpperCase() || 'COLD'
  const tempScore = TEMPERATURE_SCORES[temp] || 10
  score += tempScore
  
  const tempLabel = temp === 'HOT' ? '🔥 Hot Lead' : temp === 'WARM' ? '🌡️ Warm Lead' : '❄️ Cold Lead'
  reasons.push({ label: tempLabel, delta: tempScore, category: 'temperature' })
  
  // ============================================
  // 2. MOTIVATIONS (Capped at 30)
  // ============================================
  
  let motivationTotal = 0
  const motivations = record.recordMotivations || []
  
  for (const rm of motivations) {
    const name = rm.motivation.name
    const config = MOTIVATION_WEIGHTS[name]
    if (config && motivationTotal < MOTIVATION_CAP) {
      const addAmount = Math.min(config.weight, MOTIVATION_CAP - motivationTotal)
      motivationTotal += addAmount
      reasons.push({ label: name, delta: addAmount, category: 'motivation' })
    }
  }
  
  score += motivationTotal
  
  // ============================================
  // 3. TASK URGENCY
  // ============================================
  
  const overdueTask = getOverdueTask(record.tasks)
  const taskDueToday = getTaskDueToday(record.tasks)
  const taskDueTomorrow = getTaskDueTomorrow(record.tasks)
  
  if (overdueTask) {
    score += 25
    reasons.push({ label: '⚠️ Task Overdue', delta: 25, category: 'task' })
  } else if (taskDueToday) {
    score += 15
    reasons.push({ label: '📋 Task Due Today', delta: 15, category: 'task' })
  } else if (taskDueTomorrow) {
    score += 5
    reasons.push({ label: '📅 Task Due Tomorrow', delta: 5, category: 'task' })
  }
  
  // ============================================
  // 4. CONTACT RECENCY
  // ============================================
  
  const hoursSinceContact = hoursSince(record.lastContactedAt)
  const daysSinceContact = daysSince(record.lastContactedAt)
  
  if (flags.neverContacted) {
    score += 20
    reasons.push({ label: '✨ Never Contacted', delta: 20, category: 'contact' })
  } else if (hoursSinceContact < 24) {
    score -= 30
    reasons.push({ label: '⏸️ Contacted <24h ago', delta: -30, category: 'contact' })
  } else if (daysSinceContact >= 1 && daysSinceContact < 3) {
    score -= 10
    reasons.push({ label: '🕐 Contacted 1-3 days ago', delta: -10, category: 'contact' })
  } else if (daysSinceContact >= 3 && daysSinceContact < 7) {
    score += 5
    reasons.push({ label: '📆 Contacted 3-7 days ago', delta: 5, category: 'contact' })
  } else if (daysSinceContact >= 7) {
    score += 15
    reasons.push({ label: '🔄 No contact 7+ days', delta: 15, category: 'contact' })
  }
  
  // ============================================
  // 5. ENGAGEMENT
  // ============================================
  
  if (record.hasEngaged) {
    score += 15
    reasons.push({ label: '💬 Has Engaged Before', delta: 15, category: 'engagement' })
  }
  
  // Fresh skiptrace
  const daysSinceSkiptrace = daysSince(record.skiptraceDate)
  if (daysSinceSkiptrace <= 3) {
    score += 10
    reasons.push({ label: '📞 Fresh Skiptrace', delta: 10, category: 'data' })
  }
  
  // Mobile phone bonus
  if (flags.hasMobilePhone) {
    score += 5
    reasons.push({ label: '📱 Has Mobile', delta: 5, category: 'data' })
  }
  
  // ============================================
  // 6. FATIGUE PENALTIES
  // ============================================
  
  const attempts = record.callAttempts || 0
  
  if (attempts >= 10) {
    score -= 25
    reasons.push({ label: '😫 10+ Call Attempts', delta: -25, category: 'fatigue' })
  } else if (attempts >= 7) {
    score -= 15
    reasons.push({ label: '😓 7-9 Call Attempts', delta: -15, category: 'fatigue' })
  } else if (attempts >= 5) {
    score -= 10
    reasons.push({ label: '😐 5-6 Call Attempts', delta: -10, category: 'fatigue' })
  } else if (attempts >= 3) {
    score -= 5
    reasons.push({ label: '📉 3-4 Call Attempts', delta: -5, category: 'fatigue' })
  }
  
  // ============================================
  // 7. SNOOZE PENALTY
  // ============================================
  
  if (flags.isSnoozed) {
    score = 0
    reasons.push({ label: '💤 Snoozed', delta: -score, category: 'data' })
  }
  
  // ============================================
  // CAP SCORE
  // ============================================
  
  score = Math.max(0, Math.min(100, score))
  
  // ============================================
  // DETERMINE NEXT ACTION
  // ============================================
  
  let nextAction: NextAction
  
  if (flags.isSnoozed) {
    nextAction = 'Nurture'
  } else if (overdueTask || taskDueToday) {
    nextAction = 'Follow Up'
  } else if (!flags.hasValidPhone) {
    nextAction = 'Get Numbers'
  } else if (score >= 70) {
    nextAction = 'Call Now'
  } else if (score >= 50) {
    nextAction = 'Call Now' // Still call, just lower priority
  } else {
    nextAction = 'Nurture'
  }
  
  // ============================================
  // CALCULATE CONFIDENCE
  // ============================================
  
  let confidenceScore = 0
  
  if (motivations.length > 0) confidenceScore += 25
  if ((record.recordTags as unknown[])?.length > 0) confidenceScore += 15
  if (flags.hasMobilePhone) confidenceScore += 25
  else if (flags.hasValidPhone) confidenceScore += 10
  if (record.skiptraceDate) confidenceScore += 15
  if (record.lastContactedAt) confidenceScore += 10
  if (record.ownerFullName && record.ownerFullName !== 'Unknown') confidenceScore += 10
  
  const confidence: Confidence = 
    confidenceScore >= 75 ? 'High' :
    confidenceScore >= 50 ? 'Medium' : 'Low'
  
  // ============================================
  // TOP REASON (for display)
  // ============================================
  
  // Sort reasons by absolute delta value, pick the most impactful
  const sortedReasons = [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const topReason = sortedReasons[0]?.label || 'No data'
  
  return {
    score,
    nextAction,
    confidence,
    reasons,
    topReason,
    flags,
  }
}

// ============================================
// BATCH SCORING
// ============================================

export function computePriorityBatch(records: RecordWithRelations[]): Array<RecordWithRelations & { priority: PriorityResult }> {
  return records.map(record => ({
    ...record,
    priority: computePriority(record),
  }))
}

// ============================================
// SORTING
// ============================================

export function sortByPriority<T extends { priority: PriorityResult }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    // First by score (descending)
    if (b.priority.score !== a.priority.score) {
      return b.priority.score - a.priority.score
    }
    // Then by next action priority
    const actionOrder: { [key in NextAction]: number } = {
      'Call Now': 0,
      'Follow Up': 1,
      'Get Numbers': 2,
      'Nurture': 3,
      'Not Workable': 4,
    }
    return actionOrder[a.priority.nextAction] - actionOrder[b.priority.nextAction]
  })
}

// ============================================
// BUCKET FILTERING
// ============================================

export type Bucket = 'call-now' | 'follow-up' | 'get-numbers' | 'nurture' | 'not-workable'

export function filterByBucket<T extends { priority: PriorityResult }>(
  records: T[],
  bucket: Bucket
): T[] {
  const actionMap: { [key in Bucket]: NextAction } = {
    'call-now': 'Call Now',
    'follow-up': 'Follow Up',
    'get-numbers': 'Get Numbers',
    'nurture': 'Nurture',
    'not-workable': 'Not Workable',
  }
  
  return records.filter(r => r.priority.nextAction === actionMap[bucket])
}

export function getBucketCounts(records: Array<{ priority: PriorityResult }>): { [key in Bucket]: number } {
  const counts: { [key in Bucket]: number } = {
    'call-now': 0,
    'follow-up': 0,
    'get-numbers': 0,
    'nurture': 0,
    'not-workable': 0,
  }
  
  for (const record of records) {
    switch (record.priority.nextAction) {
      case 'Call Now': counts['call-now']++; break
      case 'Follow Up': counts['follow-up']++; break
      case 'Get Numbers': counts['get-numbers']++; break
      case 'Nurture': counts['nurture']++; break
      case 'Not Workable': counts['not-workable']++; break
    }
  }
  
  return counts
}
