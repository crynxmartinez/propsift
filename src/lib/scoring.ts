/**
 * DockInsight v2.2 - Priority Scoring Engine
 * 
 * This module computes priority scores for records to determine
 * which leads should be contacted first.
 * 
 * Score Range: 0-160+ (uncapped for stacking motivations)
 * Higher score = Higher priority = Contact sooner
 * 
 * Key Features:
 * - Motivation stacking with diminishing returns
 * - Synergy bonuses for distress combinations
 * - Smart Rescue for old unworked leads
 * - Fatigue reset on engagement
 * - Status modifier
 * - Channel readiness
 * - Improvement suggestions
 */

import { Task, RecordPhoneNumber, Motivation, Status, RecordTag } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export type NextAction = 
  | 'Call Now'        // Score ≥90, has callable phone, high confidence
  | 'Follow Up Today' // Has task due today/overdue
  | 'Call Queue'      // Score 50-89, has callable phone
  | 'Verify First'    // Score ≥70 but low confidence (bad data)
  | 'Get Numbers'     // No valid phone numbers
  | 'Nurture'         // Score <50, workable
  | 'Not Workable'    // DNC, Dead, Under Contract

export type Confidence = 'High' | 'Medium' | 'Low'

export type ScoreCategory = 
  | 'temperature' 
  | 'motivation' 
  | 'synergy'
  | 'task' 
  | 'contact' 
  | 'engagement' 
  | 'fatigue' 
  | 'status'
  | 'channel'
  | 'age'
  | 'data'

export interface ScoreReason {
  label: string
  delta: number
  category: ScoreCategory
}

export interface ImprovementSuggestion {
  action: string
  delta: number
}

export interface PriorityResult {
  score: number
  nextAction: NextAction
  confidence: Confidence
  reasons: ScoreReason[]
  topReason: string
  reasonString: string
  suggestions: ImprovementSuggestion[]
  flags: {
    hasValidPhone: boolean
    hasMobilePhone: boolean
    hasCallablePhone: boolean
    hasEmail: boolean
    hasTask: boolean
    hasOverdueTask: boolean
    isDnc: boolean
    isClosed: boolean
    isSnoozed: boolean
    neverContacted: boolean
    smartRescue: boolean
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
  directMailAttempts?: number
  smsAttempts?: number
  rvmAttempts?: number
  skiptraceDate?: Date | null
  createdAt: Date
  updatedAt: Date
  lastContactedAt?: Date | null
  lastContactType?: string | null
  lastContactResult?: string | null
  hasEngaged?: boolean
  snoozedUntil?: Date | null
  isComplete?: boolean
  isCompany?: boolean
  assignedToId?: string | null
  estimatedValue?: number | null
  yearBuilt?: number | null
  phoneCount?: number
  emailCount?: number
  email?: string | null
  notes?: string | null
  phoneNumbers?: RecordPhoneNumber[]
  recordMotivations?: Array<{ motivation: Motivation }>
  recordTags?: Array<{ tag: { id: string; name: string } }>
  tasks?: Task[]
  status?: Status | null
  comments?: Array<{ id: string; createdAt: Date }>
  // LCE v3.0: First-to-Market fields
  currentPhase?: string | null
  blitzAttempts?: number
  nextActionDue?: Date | null
  nextActionType?: string | null
  callbackScheduledFor?: Date | null
  noResponseStreak?: number
}

// ============================================
// SCORING WEIGHTS (v2.2)
// ============================================

const TEMPERATURE_SCORES: { [key: string]: number } = {
  'HOT': 40,
  'WARM': 20,
  'COLD': 5,
}

const MOTIVATION_WEIGHTS: { [key: string]: { weight: number; urgency: 'urgent' | 'high' | 'medium' | 'low' } } = {
  'Pre-Foreclosure': { weight: 15, urgency: 'urgent' },
  'Tax Lien': { weight: 15, urgency: 'urgent' },
  'Probate': { weight: 12, urgency: 'urgent' },
  'Divorce': { weight: 10, urgency: 'high' },
  'Tired Landlord': { weight: 10, urgency: 'high' },
  'Code Violation': { weight: 10, urgency: 'high' },
  'Vacant': { weight: 8, urgency: 'medium' },
  'Absentee': { weight: 5, urgency: 'medium' },
  'Inherited': { weight: 8, urgency: 'medium' },
  'High Equity': { weight: 5, urgency: 'low' },
  'MLS Expired': { weight: 8, urgency: 'low' },
  'FSBO': { weight: 6, urgency: 'low' },
}

const SYNERGY_PAIRS: Array<{ pair: [string, string]; bonus: number }> = [
  { pair: ['Pre-Foreclosure', 'Tax Lien'], bonus: 10 },
  { pair: ['Pre-Foreclosure', 'Vacant'], bonus: 8 },
  { pair: ['Tax Lien', 'Vacant'], bonus: 8 },
  { pair: ['Probate', 'Vacant'], bonus: 6 },
  { pair: ['Absentee', 'Vacant'], bonus: 5 },
  { pair: ['Tired Landlord', 'Code Violation'], bonus: 6 },
]

const STATUS_MODIFIERS: { [key: string]: number } = {
  'new lead': 5,
  'attempting contact': 0,
  'in negotiation': 10,
  'follow up': 5,
  'appointment set': 15,
  'contract sent': 20,
}

const EXCLUDED_STATUSES = [
  'dead',
  'dnc',
  'do not call',
  'under contract',
  'sold',
  'not interested',
  'wrong number',
  'closed',
]

// v2.3: Last Contact Result Scoring
const CONTACT_RESULT_SCORES: { [key: string]: number } = {
  'ANSWERED': 10,        // They picked up before - great sign!
  'VOICEMAIL': 5,        // Left message - they know about us
  'NO_ANSWER': 0,        // Neutral
  'BUSY': 0,             // Neutral
  'WRONG_NUMBER': -15,   // Bad data - deprioritize
  'DISCONNECTED': -20,   // Dead number - deprioritize
}

// v2.3: Tag-based Scoring
const TAG_SCORES: { [key: string]: number } = {
  'vip': 10,
  'callback requested': 15,
  'hot lead': 10,
  'priority': 8,
  'low priority': -10,
  'do not contact': -50,
}

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

function getStatusModifier(status: Status | null | undefined): { modifier: number; name: string } | null {
  if (!status) return null
  const name = status.name.toLowerCase()
  for (const [key, value] of Object.entries(STATUS_MODIFIERS)) {
    if (name.includes(key)) {
      return { modifier: value, name: status.name }
    }
  }
  return null
}

function isPhoneCallable(phone: RecordPhoneNumber): boolean {
  const statuses = phone.statuses || []
  const badStatuses = ['wrong', 'disconnected', 'invalid', 'bad', 'dnc']
  return !statuses.some(s => 
    badStatuses.some(bad => s.toLowerCase().includes(bad))
  )
}

function hasValidPhone(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => isPhoneCallable(p))
}

function hasCallablePhone(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => {
    if (!isPhoneCallable(p)) return false
    const type = p.type?.toUpperCase() || ''
    return type === 'MOBILE' || type === 'CELL' || type === 'LANDLINE' || type === 'HOME' || type === ''
  })
}

function hasMobilePhone(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => {
    if (!isPhoneCallable(p)) return false
    const type = p.type?.toUpperCase() || ''
    return type === 'MOBILE' || type === 'CELL'
  })
}

function hasVerifiedMobile(phoneNumbers: RecordPhoneNumber[] | undefined): boolean {
  if (!phoneNumbers || phoneNumbers.length === 0) return false
  return phoneNumbers.some(p => {
    if (!isPhoneCallable(p)) return false
    const type = p.type?.toUpperCase() || ''
    const statuses = p.statuses || []
    const isVerified = statuses.some(s => s.toLowerCase().includes('verified'))
    return (type === 'MOBILE' || type === 'CELL') && isVerified
  })
}

function getOverdueTask(tasks: Task[] | undefined): Task | null {
  if (!tasks || tasks.length === 0) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false
    if (!t.dueDate) return false
    const dueDate = new Date(t.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < now
  })
  
  if (overdueTasks.length === 0) return null
  return overdueTasks.sort((a, b) => 
    new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  )[0]
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

function isCallTask(task: Task | null): boolean {
  if (!task) return false
  const title = task.title?.toLowerCase() || ''
  return title.includes('call') || title.includes('phone') || title.includes('dial')
}

// ============================================
// MAIN SCORING FUNCTION (v2.2)
// ============================================

export function computePriority(record: RecordWithRelations): PriorityResult {
  const reasons: ScoreReason[] = []
  let score = 0
  
  // ============================================
  // FLAGS
  // ============================================
  
  const flags = {
    hasValidPhone: hasValidPhone(record.phoneNumbers),
    hasMobilePhone: hasMobilePhone(record.phoneNumbers),
    hasCallablePhone: hasCallablePhone(record.phoneNumbers),
    hasEmail: Boolean(record.email && record.email.includes('@')),
    hasTask: (record.tasks?.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length || 0) > 0,
    hasOverdueTask: getOverdueTask(record.tasks) !== null,
    isDnc: isDnc(record.status),
    isClosed: isStatusExcluded(record.status),
    isSnoozed: record.snoozedUntil ? new Date(record.snoozedUntil) > new Date() : false,
    neverContacted: !record.lastContactedAt && record.callAttempts === 0,
    smartRescue: false,
  }
  
  // ============================================
  // WORKABILITY GATE - Hard Blocks
  // ============================================
  
  if (flags.isDnc || flags.isClosed) {
    return {
      score: 0,
      nextAction: 'Not Workable',
      confidence: 'High',
      reasons: [{ label: flags.isDnc ? 'DNC' : 'Closed Status', delta: 0, category: 'data' }],
      topReason: flags.isDnc ? 'Do Not Call' : 'Closed',
      reasonString: flags.isDnc ? 'DNC - Do Not Call' : 'Closed status - not workable',
      suggestions: [],
      flags,
    }
  }
  
  if (flags.isSnoozed) {
    return {
      score: 0,
      nextAction: 'Nurture',
      confidence: 'High',
      reasons: [{ label: '💤 Snoozed', delta: 0, category: 'data' }],
      topReason: 'Snoozed',
      reasonString: 'Lead is snoozed - will resurface later',
      suggestions: [],
      flags,
    }
  }
  
  // Note: isComplete means "data is complete" (has all required fields)
  // This is NOT a "closed/done" status - it's a data quality indicator
  // Records with complete data should still be workable and scored normally
  
  // ============================================
  // 1. TEMPERATURE (Base Score)
  // ============================================
  
  const temp = record.temperature?.toUpperCase() || 'COLD'
  const tempScore = TEMPERATURE_SCORES[temp] || 5
  score += tempScore
  
  const tempLabel = temp === 'HOT' ? '🔥 Hot Lead' : temp === 'WARM' ? '🌡️ Warm Lead' : '❄️ Cold Lead'
  reasons.push({ label: tempLabel, delta: tempScore, category: 'temperature' })
  
  // ============================================
  // 2. MOTIVATIONS (Stacking with Diminishing Returns)
  // ============================================
  
  const motivations = record.recordMotivations || []
  const motivationNames = motivations.map(rm => rm.motivation.name)
  let motivationTotal = 0
  let motivationCount = 0
  
  const sortedMotivations = [...motivations].sort((a, b) => {
    const aWeight = MOTIVATION_WEIGHTS[a.motivation.name]?.weight || 0
    const bWeight = MOTIVATION_WEIGHTS[b.motivation.name]?.weight || 0
    return bWeight - aWeight
  })
  
  for (const rm of sortedMotivations) {
    const name = rm.motivation.name
    const config = MOTIVATION_WEIGHTS[name]
    if (config) {
      let addAmount = config.weight
      
      if (motivationCount === 1) addAmount = Math.floor(addAmount * 0.8)
      else if (motivationCount === 2) addAmount = Math.floor(addAmount * 0.6)
      else if (motivationCount >= 3) addAmount = Math.floor(addAmount * 0.4)
      
      motivationTotal += addAmount
      motivationCount++
      reasons.push({ label: name, delta: addAmount, category: 'motivation' })
    }
  }
  
  score += motivationTotal
  
  // Stacking bonus for 3+ motivations
  if (motivationCount >= 3) {
    const stackingBonus = 4 * (motivationCount - 2)
    score += stackingBonus
    reasons.push({ label: `📚 ${motivationCount} Motivations Stacked`, delta: stackingBonus, category: 'motivation' })
  }
  
  // ============================================
  // 3. SYNERGY BONUSES
  // ============================================
  
  for (const synergy of SYNERGY_PAIRS) {
    if (motivationNames.includes(synergy.pair[0]) && motivationNames.includes(synergy.pair[1])) {
      score += synergy.bonus
      reasons.push({ 
        label: `⚡ ${synergy.pair[0]} + ${synergy.pair[1]} Synergy`, 
        delta: synergy.bonus, 
        category: 'synergy' 
      })
    }
  }
  
  // ============================================
  // 4. TASK URGENCY
  // ============================================
  
  const overdueTask = getOverdueTask(record.tasks)
  const taskDueToday = getTaskDueToday(record.tasks)
  const taskDueTomorrow = getTaskDueTomorrow(record.tasks)
  
  if (overdueTask) {
    let taskBonus = 25
    if (isCallTask(overdueTask) && flags.hasCallablePhone) {
      taskBonus += 5
    }
    score += taskBonus
    reasons.push({ label: '⚠️ Task Overdue', delta: taskBonus, category: 'task' })
  } else if (taskDueToday) {
    let taskBonus = 15
    if (isCallTask(taskDueToday) && flags.hasCallablePhone) {
      taskBonus += 5
    }
    score += taskBonus
    reasons.push({ label: '📋 Task Due Today', delta: taskBonus, category: 'task' })
  } else if (taskDueTomorrow) {
    score += 5
    reasons.push({ label: '📅 Task Due Tomorrow', delta: 5, category: 'task' })
  }
  
  // ============================================
  // 5. CONTACT RECENCY
  // ============================================
  
  const hoursSinceContact = hoursSince(record.lastContactedAt)
  const daysSinceContact = daysSince(record.lastContactedAt)
  
  if (flags.neverContacted) {
    score += 15
    reasons.push({ label: '✨ Never Contacted', delta: 15, category: 'contact' })
  } else if (hoursSinceContact < 24) {
    score -= 25
    reasons.push({ label: '⏸️ Contacted <24h ago', delta: -25, category: 'contact' })
  } else if (daysSinceContact >= 1 && daysSinceContact < 3) {
    score -= 10
    reasons.push({ label: '🕐 Contacted 1-3 days ago', delta: -10, category: 'contact' })
  } else if (daysSinceContact >= 3 && daysSinceContact < 7) {
    score += 5
    reasons.push({ label: '📆 Contacted 3-7 days ago', delta: 5, category: 'contact' })
  } else if (daysSinceContact >= 7) {
    score += 10
    reasons.push({ label: '🔄 No contact 7+ days', delta: 10, category: 'contact' })
  }
  
  // ============================================
  // 5b. LAST CONTACT RESULT (v2.3)
  // ============================================
  
  if (record.lastContactResult) {
    const resultScore = CONTACT_RESULT_SCORES[record.lastContactResult.toUpperCase()] || 0
    if (resultScore !== 0) {
      score += resultScore
      const resultLabel = record.lastContactResult.toUpperCase()
      if (resultScore > 0) {
        reasons.push({ label: `📞 Last Result: ${resultLabel}`, delta: resultScore, category: 'contact' })
      } else {
        reasons.push({ label: `⚠️ Last Result: ${resultLabel}`, delta: resultScore, category: 'contact' })
      }
    }
  }
  
  // ============================================
  // 6. ENGAGEMENT
  // ============================================
  
  if (record.hasEngaged) {
    score += 20
    reasons.push({ label: '💬 Has Engaged Before', delta: 20, category: 'engagement' })
  }
  
  // ============================================
  // 7. NO-RESPONSE FATIGUE
  // Reset fatigue if they engaged or were contacted recently
  // ============================================
  
  const attempts = record.callAttempts || 0
  const recentContact = daysSinceContact < 7
  const hadEngagement = record.hasEngaged
  
  if (!hadEngagement && !recentContact) {
    const noResponseStreak = attempts
    
    if (noResponseStreak >= 7) {
      score -= 20
      reasons.push({ label: '😫 7+ No-Response Streak', delta: -20, category: 'fatigue' })
    } else if (noResponseStreak >= 5) {
      score -= 12
      reasons.push({ label: '😓 5-6 No-Response Streak', delta: -12, category: 'fatigue' })
    } else if (noResponseStreak >= 3) {
      score -= 6
      reasons.push({ label: '😐 3-4 No-Response Streak', delta: -6, category: 'fatigue' })
    }
  }
  
  // ============================================
  // 7b. MULTI-CHANNEL ATTEMPTS (v2.3)
  // ============================================
  
  const smsAttempts = record.smsAttempts || 0
  const directMailAttempts = record.directMailAttempts || 0
  const rvmAttempts = record.rvmAttempts || 0
  const totalAttempts = attempts + smsAttempts + directMailAttempts + rvmAttempts
  
  // Bonus for multi-channel outreach (they've seen us through multiple channels)
  if (directMailAttempts > 0 && !hadEngagement) {
    score += 2
    reasons.push({ label: '📬 Direct Mail Sent', delta: 2, category: 'channel' })
  }
  
  if (rvmAttempts > 0 && !hadEngagement) {
    score += 1
    reasons.push({ label: '🔊 RVM Sent', delta: 1, category: 'channel' })
  }
  
  // Over-contacted penalty (too many attempts across all channels)
  if (totalAttempts >= 15 && !hadEngagement) {
    score -= 15
    reasons.push({ label: '🚫 Over-Contacted (15+ attempts)', delta: -15, category: 'fatigue' })
  } else if (totalAttempts >= 10 && !hadEngagement) {
    score -= 8
    reasons.push({ label: '⚠️ Heavy Outreach (10+ attempts)', delta: -8, category: 'fatigue' })
  }
  
  // ============================================
  // 8. LEAD AGE + SMART RESCUE
  // ============================================
  
  const daysSinceCreated = daysSince(record.createdAt)
  
  if (daysSinceCreated >= 30 && flags.neverContacted && motivationCount >= 1) {
    score += 8
    flags.smartRescue = true
    reasons.push({ label: '🆘 Smart Rescue (30+ days, never contacted)', delta: 8, category: 'age' })
  } else if (daysSinceCreated >= 14 && flags.neverContacted) {
    score += 4
    reasons.push({ label: '📅 Aging Lead (14+ days)', delta: 4, category: 'age' })
  }
  
  // ============================================
  // 9. STATUS MODIFIER
  // ============================================
  
  const statusMod = getStatusModifier(record.status)
  if (statusMod && statusMod.modifier !== 0) {
    score += statusMod.modifier
    reasons.push({ label: `📊 Status: ${statusMod.name}`, delta: statusMod.modifier, category: 'status' })
  } else if (!record.status) {
    // v2.3: Fresh import with no status gets a small boost
    score += 3
    reasons.push({ label: '🆕 Fresh Import (No Status)', delta: 3, category: 'status' })
  }
  
  // ============================================
  // 10. CHANNEL READINESS (Data Quality)
  // ============================================
  
  if (hasVerifiedMobile(record.phoneNumbers)) {
    score += 6
    reasons.push({ label: '✅ Verified Mobile', delta: 6, category: 'channel' })
  } else if (flags.hasMobilePhone) {
    score += 4
    reasons.push({ label: '📱 Has Mobile', delta: 4, category: 'channel' })
  } else if (flags.hasCallablePhone) {
    score += 2
    reasons.push({ label: '📞 Has Callable Phone', delta: 2, category: 'channel' })
  }
  
  if (flags.hasEmail) {
    score += 2
    reasons.push({ label: '📧 Has Email', delta: 2, category: 'channel' })
  }
  
  const daysSinceSkiptrace = daysSince(record.skiptraceDate)
  if (daysSinceSkiptrace <= 7) {
    score += 5
    reasons.push({ label: '🔍 Fresh Skiptrace (<7 days)', delta: 5, category: 'data' })
  } else if (daysSinceSkiptrace <= 30) {
    score += 2
    reasons.push({ label: '🔍 Recent Skiptrace (<30 days)', delta: 2, category: 'data' })
  }
  
  // ============================================
  // 11. PROPERTY VALUE (v2.3)
  // ============================================
  
  const estimatedValue = record.estimatedValue ? Number(record.estimatedValue) : 0
  if (estimatedValue >= 1000000) {
    score += 8
    reasons.push({ label: '💎 Premium Property ($1M+)', delta: 8, category: 'data' })
  } else if (estimatedValue >= 500000) {
    score += 5
    reasons.push({ label: '💰 High Value Property ($500K+)', delta: 5, category: 'data' })
  } else if (estimatedValue >= 250000) {
    score += 2
    reasons.push({ label: '🏠 Mid Value Property ($250K+)', delta: 2, category: 'data' })
  }
  
  // ============================================
  // 12. PROPERTY AGE (v2.3)
  // ============================================
  
  const currentYear = new Date().getFullYear()
  const yearBuilt = record.yearBuilt || 0
  const propertyAge = yearBuilt > 0 ? currentYear - yearBuilt : 0
  
  if (propertyAge >= 70) {
    score += 5
    reasons.push({ label: '🏚️ Very Old Property (70+ years)', delta: 5, category: 'data' })
  } else if (propertyAge >= 50) {
    score += 3
    reasons.push({ label: '🏡 Older Property (50+ years)', delta: 3, category: 'data' })
  }
  
  // ============================================
  // 13. DATA COMPLETENESS (v2.3)
  // ============================================
  
  const phoneCount = record.phoneCount || record.phoneNumbers?.length || 0
  if (phoneCount >= 3) {
    score += 3
    reasons.push({ label: '📱 Multiple Phone Options (3+)', delta: 3, category: 'data' })
  }
  
  // Has notes = previously worked lead
  if (record.notes && record.notes.trim().length > 0) {
    score += 2
    reasons.push({ label: '📝 Has Notes', delta: 2, category: 'data' })
  }
  
  // Has recent comments = active conversation
  const comments = record.comments || []
  const recentComments = comments.filter(c => daysSince(c.createdAt) <= 7)
  if (recentComments.length > 0) {
    score += 5
    reasons.push({ label: '💬 Recent Comments (7 days)', delta: 5, category: 'engagement' })
  } else if (comments.length > 0) {
    score += 2
    reasons.push({ label: '💬 Has Comments', delta: 2, category: 'engagement' })
  }
  
  // Assigned lead gets priority
  if (record.assignedToId) {
    score += 3
    reasons.push({ label: '👤 Assigned Lead', delta: 3, category: 'data' })
  }
  
  // ============================================
  // 14. TAG-BASED SCORING (v2.3)
  // ============================================
  
  const tags = record.recordTags || []
  for (const rt of tags) {
    const tagName = rt.tag?.name?.toLowerCase() || ''
    for (const [key, tagScore] of Object.entries(TAG_SCORES)) {
      if (tagName.includes(key)) {
        score += tagScore
        if (tagScore > 0) {
          reasons.push({ label: `🏷️ Tag: ${rt.tag.name}`, delta: tagScore, category: 'data' })
        } else {
          reasons.push({ label: `⚠️ Tag: ${rt.tag.name}`, delta: tagScore, category: 'data' })
        }
        break
      }
    }
  }
  
  // ============================================
  // FLOOR SCORE (minimum 0)
  // ============================================
  
  score = Math.max(0, score)
  
  // ============================================
  // CALCULATE CONFIDENCE
  // ============================================
  
  let confidenceScore = 0
  
  if (hasVerifiedMobile(record.phoneNumbers)) confidenceScore += 35
  else if (flags.hasMobilePhone) confidenceScore += 25
  else if (flags.hasCallablePhone) confidenceScore += 15
  
  if (flags.hasEmail) confidenceScore += 10
  if (motivationCount > 0) confidenceScore += 15
  if (record.skiptraceDate && daysSinceSkiptrace <= 30) confidenceScore += 15
  if (record.ownerFullName && record.ownerFullName !== 'Unknown' && record.ownerFullName.length > 3) confidenceScore += 10
  if (record.propertyStreet) confidenceScore += 5
  
  const confidence: Confidence = 
    confidenceScore >= 70 ? 'High' :
    confidenceScore >= 40 ? 'Medium' : 'Low'
  
  // ============================================
  // DETERMINE NEXT ACTION (Fixed Order)
  // ============================================
  
  let nextAction: NextAction
  
  // 1. Task Override
  if (overdueTask || taskDueToday) {
    nextAction = 'Follow Up Today'
  }
  // 2. No Phone
  else if (!flags.hasCallablePhone) {
    nextAction = 'Get Numbers'
  }
  // 3. High Score + Low Confidence = Verify First
  else if (score >= 70 && confidence === 'Low') {
    nextAction = 'Verify First'
  }
  // 4. High Score + Good Confidence = Call Now
  else if (score >= 90 && confidence !== 'Low') {
    nextAction = 'Call Now'
  }
  // 5. Medium Score = Call Queue
  else if (score >= 50) {
    nextAction = 'Call Queue'
  }
  // 6. Low Score = Nurture
  else {
    nextAction = 'Nurture'
  }
  
  // ============================================
  // GENERATE REASON STRING
  // ============================================
  
  const sortedReasons = [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const topReason = sortedReasons[0]?.label || 'No data'
  
  const positiveReasons = sortedReasons.filter(r => r.delta > 0).slice(0, 3)
  const reasonString = positiveReasons.map(r => `${r.label} (+${r.delta})`).join(', ') || 'No positive factors'
  
  // ============================================
  // GENERATE IMPROVEMENT SUGGESTIONS
  // ============================================
  
  const suggestions: ImprovementSuggestion[] = []
  
  if (overdueTask) {
    suggestions.push({ action: 'Complete overdue task', delta: 25 })
  }
  if (!flags.hasMobilePhone && flags.hasCallablePhone) {
    suggestions.push({ action: 'Add mobile phone number', delta: 4 })
  }
  if (!flags.hasCallablePhone) {
    suggestions.push({ action: 'Add phone number', delta: 6 })
  }
  if (!flags.hasEmail) {
    suggestions.push({ action: 'Add email address', delta: 2 })
  }
  if (temp === 'COLD') {
    suggestions.push({ action: 'Upgrade to Warm (+15) or Hot (+35)', delta: 15 })
  } else if (temp === 'WARM') {
    suggestions.push({ action: 'Upgrade to Hot', delta: 20 })
  }
  if (motivationCount === 0) {
    suggestions.push({ action: 'Add motivation (e.g., Pre-Foreclosure)', delta: 15 })
  }
  if (!record.skiptraceDate || daysSinceSkiptrace > 30) {
    suggestions.push({ action: 'Run fresh skiptrace', delta: 5 })
  }
  
  const topSuggestions = suggestions
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
  
  return {
    score,
    nextAction,
    confidence,
    reasons,
    topReason,
    reasonString,
    suggestions: topSuggestions,
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
// SORTING (LCE v3.0 - First-to-Market)
// ============================================

// Queue tier determines priority order
function getQueueTier(record: RecordWithRelations): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const phase = record.currentPhase || 'NEW'

  // Tier 1: Callbacks due today (highest priority)
  if (record.callbackScheduledFor) {
    const callbackDate = new Date(record.callbackScheduledFor)
    const callbackDay = new Date(callbackDate.getFullYear(), callbackDate.getMonth(), callbackDate.getDate())
    if (callbackDay.getTime() <= today.getTime()) {
      return 1
    }
  }

  // Tier 2: New leads (never called) - First to market!
  if (phase === 'NEW') {
    return 2
  }

  // Tier 3: Blitz follow-ups due today
  if ((phase === 'BLITZ_1' || phase === 'BLITZ_2') && record.nextActionDue) {
    const actionDate = new Date(record.nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return 3
    }
  }

  // Tier 4: Score-based follow-ups due today
  if (record.nextActionDue) {
    const actionDate = new Date(record.nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return 4
    }
  }

  // Tier 5: Deep prospecting (needs skiptrace)
  if (phase === 'DEEP_PROSPECT') {
    return 5
  }

  // Tier 6: Multi-channel
  if (phase === 'MULTI_CHANNEL') {
    return 6
  }

  // Tier 7: Nurture
  if (phase === 'NURTURE') {
    return 7
  }

  // Tier 8: Future follow-ups
  return 8
}

export function sortByPriority<T extends { priority: PriorityResult }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    // First by queue tier (LCE v3.0 First-to-Market)
    const tierA = getQueueTier(a as unknown as RecordWithRelations)
    const tierB = getQueueTier(b as unknown as RecordWithRelations)
    if (tierA !== tierB) {
      return tierA - tierB // Lower tier = higher priority
    }

    // Then by score (descending) within same tier
    if (b.priority.score !== a.priority.score) {
      return b.priority.score - a.priority.score
    }

    // Then by next action priority
    const actionOrder: { [key in NextAction]: number } = {
      'Call Now': 0,
      'Follow Up Today': 1,
      'Call Queue': 2,
      'Verify First': 3,
      'Get Numbers': 4,
      'Nurture': 5,
      'Not Workable': 6,
    }
    return actionOrder[a.priority.nextAction] - actionOrder[b.priority.nextAction]
  })
}

// ============================================
// BUCKET FILTERING (v2.2) + CADENCE VISIBILITY (v2.4)
// ============================================

export type Bucket = 
  | 'call-now' 
  | 'follow-up-today' 
  | 'call-queue' 
  | 'verify-first' 
  | 'get-numbers' 
  | 'nurture' 
  | 'not-workable'

// Buckets that follow cadence-based visibility (hidden until nextActionDue)
const CADENCE_FILTERED_BUCKETS: Bucket[] = [
  'call-now',
  'follow-up-today', 
  'call-queue',
  'verify-first',
]

// Buckets that are always visible regardless of nextActionDue
const ALWAYS_VISIBLE_BUCKETS: Bucket[] = [
  'get-numbers',  // Need phone data, not calls
  'nurture',      // Long-term pool
  'not-workable', // DNC/Closed
]

/**
 * Check if a record is due for action based on cadence
 * Returns true if:
 * - nextActionDue is null (never set, treat as due now)
 * - nextActionDue is today or in the past (due or overdue)
 */
export function isRecordDueForAction(record: { nextActionDue?: Date | null }): boolean {
  if (!record.nextActionDue) {
    return true // No date set = due now
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const actionDate = new Date(record.nextActionDue)
  actionDate.setHours(0, 0, 0, 0)
  
  return actionDate.getTime() <= today.getTime()
}

export function filterByBucket<T extends { priority: PriorityResult; nextActionDue?: Date | null }>(
  records: T[],
  bucket: Bucket
): T[] {
  const actionMap: { [key in Bucket]: NextAction } = {
    'call-now': 'Call Now',
    'follow-up-today': 'Follow Up Today',
    'call-queue': 'Call Queue',
    'verify-first': 'Verify First',
    'get-numbers': 'Get Numbers',
    'nurture': 'Nurture',
    'not-workable': 'Not Workable',
  }
  
  // First filter by bucket/action type
  const bucketRecords = records.filter(r => r.priority.nextAction === actionMap[bucket])
  
  // Apply cadence visibility filter for specific buckets
  if (CADENCE_FILTERED_BUCKETS.includes(bucket)) {
    return bucketRecords.filter(r => isRecordDueForAction(r))
  }
  
  // Always visible buckets - return all matching records
  return bucketRecords
}

export function getBucketCounts(records: Array<{ priority: PriorityResult; nextActionDue?: Date | null }>): { [key in Bucket]: number } {
  const counts: { [key in Bucket]: number } = {
    'call-now': 0,
    'follow-up-today': 0,
    'call-queue': 0,
    'verify-first': 0,
    'get-numbers': 0,
    'nurture': 0,
    'not-workable': 0,
  }
  
  for (const record of records) {
    const action = record.priority.nextAction
    const isDue = isRecordDueForAction(record)
    
    // For cadence-filtered buckets, only count if record is due
    // For always-visible buckets, always count
    switch (action) {
      case 'Call Now': 
        if (isDue) counts['call-now']++
        break
      case 'Follow Up Today': 
        if (isDue) counts['follow-up-today']++
        break
      case 'Call Queue': 
        if (isDue) counts['call-queue']++
        break
      case 'Verify First': 
        if (isDue) counts['verify-first']++
        break
      case 'Get Numbers': 
        counts['get-numbers']++ // Always visible
        break
      case 'Nurture': 
        counts['nurture']++ // Always visible
        break
      case 'Not Workable': 
        counts['not-workable']++ // Always visible
        break
    }
  }
  
  return counts
}

// ============================================
// UTILITY: Get workable records only
// ============================================

export function getWorkableRecords<T extends { priority: PriorityResult }>(records: T[]): T[] {
  return records.filter(r => r.priority.nextAction !== 'Not Workable')
}
