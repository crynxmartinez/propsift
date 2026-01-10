/**
 * LCE v2.3.1 Scoring Module
 * Lead Cadence Engine - Priority Score Calculator
 * 
 * This module implements the deterministic scoring algorithm
 * as defined in the LCE v2.3.1 specification.
 */

import {
  ScoreBreakdown,
  ScoreResult,
  ScoreReason,
  TemperatureBand,
  ConfidenceLevel,
  MotivationTier,
  StatusCategory,
  RecordForScoring,
  MOTIVATION_TIERS,
  DEFAULT_MOTIVATION_TIERS,
  SYNERGY_BONUSES,
  STATUS_CATEGORY_POINTS,
  DEFAULT_STATUS_CATEGORIES,
  LCE_VERSION,
  SCORE_THRESHOLDS,
  LOW_URGENCY_CAP,
  DIMINISHING_RETURNS,
} from './types'

// ==========================================
// COMPONENT 1: MOTIVATION SCORE
// ==========================================

interface MotivationScoreResult {
  score: number
  details: Array<{ name: string; tier: MotivationTier; points: number }>
  synergyBonus: number
}

function calculateMotivationScore(motivations: string[]): MotivationScoreResult {
  if (motivations.length === 0) {
    return { score: 0, details: [], synergyBonus: 0 }
  }

  // Step 1: Map motivations to tiers and base points
  const motivationData = motivations.map(name => {
    const tier = DEFAULT_MOTIVATION_TIERS[name] || 'LOW'
    const basePoints = MOTIVATION_TIERS[tier]
    return { name, tier, basePoints }
  })

  // Step 2: Deterministic ordering (Critical → High → Medium → Low, then by points DESC, then name ASC)
  const tierOrder: Record<MotivationTier, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  motivationData.sort((a, b) => {
    if (tierOrder[a.tier] !== tierOrder[b.tier]) {
      return tierOrder[a.tier] - tierOrder[b.tier]
    }
    if (a.basePoints !== b.basePoints) {
      return b.basePoints - a.basePoints
    }
    return a.name.localeCompare(b.name)
  })

  // Step 3: Apply diminishing returns
  let totalScore = 0
  let lowTierSubtotal = 0
  const details: Array<{ name: string; tier: MotivationTier; points: number }> = []

  motivationData.forEach((m, index) => {
    const multiplier = DIMINISHING_RETURNS[Math.min(index, DIMINISHING_RETURNS.length - 1)]
    let points = Math.round(m.basePoints * multiplier)

    // Apply low-urgency cap
    if (m.tier === 'LOW') {
      const remainingCap = LOW_URGENCY_CAP - lowTierSubtotal
      if (remainingCap <= 0) {
        points = 0
      } else if (points > remainingCap) {
        points = remainingCap
      }
      lowTierSubtotal += points
    }

    totalScore += points
    details.push({ name: m.name, tier: m.tier, points })
  })

  // Step 4: Calculate synergy bonuses
  let synergyBonus = 0
  const motivationNames = new Set(motivations.map(m => m.toLowerCase()))
  
  for (const synergy of SYNERGY_BONUSES) {
    const [m1, m2] = synergy.motivations
    if (motivationNames.has(m1.toLowerCase()) && motivationNames.has(m2.toLowerCase())) {
      synergyBonus += synergy.bonus
    }
  }

  return {
    score: totalScore + synergyBonus,
    details,
    synergyBonus,
  }
}

// ==========================================
// COMPONENT 2: CONTACT RECENCY
// ==========================================

function calculateContactRecency(lastContactedAt: Date | null): number {
  if (!lastContactedAt) {
    return 15 // Never contacted
  }

  const now = new Date()
  const diffMs = now.getTime() - lastContactedAt.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 1) return -20      // < 24 hours
  if (diffDays < 3) return 0        // 1-2 days
  if (diffDays < 8) return 5        // 3-7 days
  if (diffDays < 15) return 10      // 8-14 days
  return 12                          // 14+ days
}

// ==========================================
// COMPONENT 3: ENGAGEMENT SCORE
// ==========================================

function calculateEngagementScore(record: RecordForScoring): number {
  // Callback requested is highest engagement
  if (record.callbackRequestedAt) {
    const daysSinceCallback = record.callbackRequestedAt 
      ? (new Date().getTime() - record.callbackRequestedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity
    
    // Callback within 7 days still counts
    if (daysSinceCallback <= 7) {
      return 30
    }
  }

  // Has engaged (had conversation)
  if (record.hasEngaged) {
    return 20
  }

  // Use stored engagement score if available
  if (record.engagementScore > 0) {
    return Math.min(record.engagementScore, 30)
  }

  return 0
}

// ==========================================
// COMPONENT 4: FATIGUE PENALTY
// ==========================================

function calculateFatiguePenalty(noResponseStreak: number): number {
  if (noResponseStreak <= 2) return 0
  if (noResponseStreak <= 4) return -5
  if (noResponseStreak <= 6) return -10
  if (noResponseStreak <= 8) return -15
  return -25
}

// ==========================================
// COMPONENT 5: NEGATIVE PENALTY (No Double-Counting)
// ==========================================

function calculateNegativePenalty(recencyPoints: number, fatiguePenalty: number): number {
  const recencyPenalty = recencyPoints < 0 ? recencyPoints : 0
  // Return the more negative of the two (MIN of two negatives)
  return Math.min(recencyPenalty, fatiguePenalty)
}

// ==========================================
// COMPONENT 6: TASK URGENCY
// ==========================================

function calculateTaskUrgency(record: RecordForScoring): number {
  let points = 0

  // Base points for task status
  if (record.hasOverdueTask) {
    points = 15
  } else if (record.hasDueTodayTask) {
    points = 10
  } else if (record.hasDueTomorrowTask) {
    points = 5
  }

  // Task type bonus
  if (record.hasCallbackTask) {
    points += 5
  } else if (record.hasFollowUpTask) {
    points += 3
  }

  // Cap at 20
  return Math.min(points, 20)
}

// ==========================================
// COMPONENT 7: LEAD AGE RESCUE
// ==========================================

function calculateLeadAgeRescue(record: RecordForScoring): number {
  // Only applies if not contacted in 30+ days
  if (record.lastContactedAt) {
    const daysSinceContact = (new Date().getTime() - record.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceContact < 30) {
      return 0 // Recently contacted, recency score handles it
    }
  }

  const leadAgeDays = (new Date().getTime() - record.createdAt.getTime()) / (1000 * 60 * 60 * 24)

  if (leadAgeDays <= 30) return 0
  if (leadAgeDays <= 60) return 3
  if (leadAgeDays <= 90) return 5
  if (leadAgeDays <= 180) return 8
  return 10
}

// ==========================================
// COMPONENT 8: DATA QUALITY
// ==========================================

function calculateDataQuality(record: RecordForScoring): number {
  if (record.hasMultiplePhones && record.hasEmail) return 10
  if (record.hasValidPhone && record.hasEmail) return 7
  if (record.hasValidPhone) return 5
  if (record.phoneCount > 0) return 0 // Has phone but unverified
  return -10 // No valid phone
}

// ==========================================
// COMPONENT 9: STATUS MODIFIER
// ==========================================

function calculateStatusModifier(statusName: string | null | undefined): number {
  if (!statusName) return 0

  const category = DEFAULT_STATUS_CATEGORIES[statusName] || 'NEW'
  return STATUS_CATEGORY_POINTS[category] || 0
}

// ==========================================
// COMPONENT 10: CONFIDENCE LEVEL
// ==========================================

function calculateConfidenceLevel(record: RecordForScoring): { level: ConfidenceLevel; points: number } {
  const now = new Date()
  const skiptraceAgeDays = record.skiptraceDate 
    ? (now.getTime() - record.skiptraceDate.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity

  // HIGH: skiptrace < 90d AND ≥1 verified phone AND (email OR multiple phones)
  if (
    skiptraceAgeDays < 90 &&
    record.hasVerifiedPhone &&
    (record.hasEmail || record.hasMultiplePhones)
  ) {
    return { level: 'HIGH', points: 5 }
  }

  // MEDIUM: skiptrace < 180d OR unverified but plausible phone exists
  if (skiptraceAgeDays < 180 || record.phoneCount > 0) {
    return { level: 'MEDIUM', points: 0 }
  }

  // LOW: no skiptrace OR skiptrace > 180d OR no phone data
  return { level: 'LOW', points: -5 }
}

// ==========================================
// TEMPERATURE BAND CALCULATION
// ==========================================

function calculateTemperatureBand(score: number): TemperatureBand {
  if (score >= SCORE_THRESHOLDS.HOT) return 'HOT'
  if (score >= SCORE_THRESHOLDS.WARM) return 'WARM'
  if (score >= SCORE_THRESHOLDS.COLD) return 'COLD'
  return 'ICE'
}

// ==========================================
// MAIN SCORING FUNCTION
// ==========================================

export function calculatePriorityScore(record: RecordForScoring): ScoreResult {
  // Calculate all components
  const motivationResult = calculateMotivationScore(record.motivations)
  const contactRecency = calculateContactRecency(record.lastContactedAt)
  const engagementScore = calculateEngagementScore(record)
  const fatiguePenalty = calculateFatiguePenalty(record.noResponseStreak)
  const negativePenalty = calculateNegativePenalty(contactRecency, fatiguePenalty)
  const taskUrgency = calculateTaskUrgency(record)
  const leadAgeRescue = calculateLeadAgeRescue(record)
  const dataQuality = calculateDataQuality(record)
  const statusModifier = calculateStatusModifier(record.statusName)
  const confidence = calculateConfidenceLevel(record)

  // Build breakdown
  const scoreBreakdown: ScoreBreakdown = {
    motivationScore: motivationResult.score,
    contactRecency: Math.max(contactRecency, 0), // Only positive recency in breakdown
    engagementScore,
    fatiguePenalty,
    negativePenalty,
    taskUrgency,
    leadAgeRescue,
    dataQuality,
    statusModifier,
    confidenceLevel: confidence.points,
  }

  // Calculate final score
  // Only apply recency if positive. Only apply one negative penalty.
  const positivesSum = 
    motivationResult.score +
    Math.max(contactRecency, 0) +
    engagementScore +
    taskUrgency +
    leadAgeRescue +
    dataQuality +
    statusModifier +
    confidence.points

  const priorityScore = Math.max(0, positivesSum + negativePenalty)

  // Determine temperature band
  const temperatureBand = calculateTemperatureBand(priorityScore)

  // Build reasons (top contributors)
  const reasons: ScoreReason[] = []

  if (motivationResult.score > 0) {
    reasons.push({
      component: 'Motivations',
      points: motivationResult.score,
      description: `${record.motivations.length} motivation(s)${motivationResult.synergyBonus > 0 ? ` (+${motivationResult.synergyBonus} synergy)` : ''}`,
    })
  }

  if (contactRecency > 0) {
    reasons.push({
      component: 'Contact Recency',
      points: contactRecency,
      description: record.lastContactedAt ? 'Due for contact' : 'Never contacted',
    })
  }

  if (engagementScore > 0) {
    reasons.push({
      component: 'Engagement',
      points: engagementScore,
      description: record.callbackRequestedAt ? 'Callback requested' : 'Has engaged',
    })
  }

  if (taskUrgency > 0) {
    reasons.push({
      component: 'Task Urgency',
      points: taskUrgency,
      description: record.hasOverdueTask ? 'Overdue task' : 'Task due',
    })
  }

  if (leadAgeRescue > 0) {
    reasons.push({
      component: 'Lead Age',
      points: leadAgeRescue,
      description: 'Older lead needs attention',
    })
  }

  if (dataQuality > 0) {
    reasons.push({
      component: 'Data Quality',
      points: dataQuality,
      description: 'Good contact data',
    })
  }

  if (statusModifier > 0) {
    reasons.push({
      component: 'Status',
      points: statusModifier,
      description: record.statusName || 'Active status',
    })
  }

  if (negativePenalty < 0) {
    reasons.push({
      component: 'Penalty',
      points: negativePenalty,
      description: contactRecency < 0 ? 'Recently contacted' : 'No-response streak',
    })
  }

  // Sort reasons by points (highest first)
  reasons.sort((a, b) => Math.abs(b.points) - Math.abs(a.points))

  return {
    priorityScore,
    scoreBreakdown,
    scoreVersion: LCE_VERSION,
    temperatureBand,
    confidenceLevel: confidence.level,
    reasons: reasons.slice(0, 5), // Top 5 reasons
  }
}

// ==========================================
// HELPER: Get top reasons as string
// ==========================================

export function getReasonString(reasons: ScoreReason[], limit = 3): string {
  return reasons
    .slice(0, limit)
    .map(r => `${r.description} (${r.points > 0 ? '+' : ''}${r.points})`)
    .join(', ')
}

// ==========================================
// HELPER: Get next best action suggestion
// ==========================================

export function getNextActionSuggestion(record: RecordForScoring): string {
  if (record.hasCallbackTask) {
    return 'Complete callback task'
  }
  if (record.hasOverdueTask) {
    return 'Complete overdue task'
  }
  if (record.hasValidPhone) {
    return 'Call primary phone'
  }
  if (record.phoneCount > 0) {
    return 'Verify phone numbers'
  }
  return 'Get phone numbers (skiptrace)'
}

// ==========================================
// HELPER: Get improvement tip
// ==========================================

export function getImprovementTip(record: RecordForScoring, confidence: ConfidenceLevel): string {
  if (confidence === 'LOW') {
    return 'Skiptrace to improve data quality'
  }
  if (!record.hasEmail) {
    return 'Add email to increase confidence'
  }
  if (record.motivations.length === 0) {
    return 'Add motivations to boost score'
  }
  if (!record.hasVerifiedPhone) {
    return 'Verify phone number'
  }
  return 'Keep following up consistently'
}
