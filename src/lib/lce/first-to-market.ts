/**
 * LCE v3.0 - First-to-Market Engine
 * 
 * Core Philosophy:
 * - New leads get called TODAY (first to market wins)
 * - No answer = call again TOMORROW (persistence)
 * - 3 attempts = deep prospecting (get better data)
 * - New numbers = restart cycle (fresh opportunity)
 * - Score determines WHO to call first, not WHEN
 */

// ============================================
// PHASE DEFINITIONS
// ============================================

export type LCEPhase = 
  | 'NEW'           // Just imported, never called
  | 'BLITZ_1'       // Initial blitz: call daily for 3 days
  | 'DEEP_PROSPECT' // Needs skiptrace/new numbers
  | 'BLITZ_2'       // Second blitz after new numbers
  | 'MULTI_CHANNEL' // Direct mail, SMS, RVM
  | 'NURTURE'       // Long-term follow-up

export const PHASE_CONFIG = {
  NEW: {
    maxAttempts: 0,
    nextPhase: 'BLITZ_1' as LCEPhase,
    description: 'New lead, call today',
  },
  BLITZ_1: {
    maxAttempts: 3,
    nextPhase: 'DEEP_PROSPECT' as LCEPhase,
    description: 'Initial blitz: 3 daily calls',
  },
  DEEP_PROSPECT: {
    maxAttempts: 0,
    nextPhase: 'BLITZ_2' as LCEPhase,
    description: 'Needs new contact info',
  },
  BLITZ_2: {
    maxAttempts: 2,
    nextPhase: 'MULTI_CHANNEL' as LCEPhase,
    description: 'Second blitz with new numbers',
  },
  MULTI_CHANNEL: {
    maxAttempts: 3,
    nextPhase: 'NURTURE' as LCEPhase,
    description: 'Mail, SMS, final calls',
  },
  NURTURE: {
    maxAttempts: Infinity,
    nextPhase: 'NURTURE' as LCEPhase,
    description: 'Long-term follow-up',
  },
}

// ============================================
// CALL OUTCOME DEFINITIONS
// ============================================

export type CallOutcome = 
  | 'ANSWERED_INTERESTED'    // Hot lead! Follow up soon
  | 'ANSWERED_CALLBACK'      // Wants callback at specific time
  | 'ANSWERED_NEUTRAL'       // Talked but no commitment
  | 'ANSWERED_NOT_NOW'       // Not interested right now
  | 'ANSWERED_NOT_INTERESTED'// Never interested
  | 'ANSWERED_DNC'           // Do not call
  | 'VOICEMAIL'              // Left voicemail
  | 'NO_ANSWER'              // No answer, no voicemail
  | 'BUSY'                   // Line busy
  | 'WRONG_NUMBER'           // Wrong number
  | 'DISCONNECTED'           // Number disconnected

export const OUTCOME_CONFIG: Record<CallOutcome, {
  isContact: boolean
  scoreChange: number
  nextFollowUpDays: number | null // null = use phase logic
  exitPhase?: LCEPhase | 'NOT_WORKABLE'
}> = {
  ANSWERED_INTERESTED: {
    isContact: true,
    scoreChange: 30,
    nextFollowUpDays: 1, // Strike while hot!
  },
  ANSWERED_CALLBACK: {
    isContact: true,
    scoreChange: 25,
    nextFollowUpDays: null, // Use callback date
  },
  ANSWERED_NEUTRAL: {
    isContact: true,
    scoreChange: 10,
    nextFollowUpDays: 3,
  },
  ANSWERED_NOT_NOW: {
    isContact: true,
    scoreChange: -5,
    nextFollowUpDays: 14,
  },
  ANSWERED_NOT_INTERESTED: {
    isContact: true,
    scoreChange: -20,
    nextFollowUpDays: 90,
    exitPhase: 'NURTURE',
  },
  ANSWERED_DNC: {
    isContact: true,
    scoreChange: -100,
    nextFollowUpDays: null,
    exitPhase: 'NOT_WORKABLE',
  },
  VOICEMAIL: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null, // Use phase logic
  },
  NO_ANSWER: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null, // Use phase logic (next day in blitz)
  },
  BUSY: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null, // Retry same day or next
  },
  WRONG_NUMBER: {
    isContact: false,
    scoreChange: -15,
    nextFollowUpDays: null, // Mark phone as wrong, try next phone
  },
  DISCONNECTED: {
    isContact: false,
    scoreChange: -20,
    nextFollowUpDays: null, // Mark phone as disconnected, try next phone
  },
}

// ============================================
// PHASE TRANSITION LOGIC
// ============================================

export interface PhaseTransitionResult {
  newPhase: LCEPhase
  newBlitzAttempts: number
  nextActionDue: Date | null
  nextActionType: string
  shouldMoveToDeepProspect: boolean
  shouldMoveToNotWorkable: boolean
  reason: string
}

export function calculatePhaseTransition(
  currentPhase: LCEPhase,
  blitzAttempts: number,
  outcome: CallOutcome,
  callbackDate?: Date
): PhaseTransitionResult {
  const outcomeConfig = OUTCOME_CONFIG[outcome]
  const phaseConfig = PHASE_CONFIG[currentPhase]
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0) // 9 AM next day

  // Handle DNC - always exit
  if (outcome === 'ANSWERED_DNC') {
    return {
      newPhase: currentPhase,
      newBlitzAttempts: blitzAttempts,
      nextActionDue: null,
      nextActionType: 'NONE',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: true,
      reason: 'DNC - Do Not Call',
    }
  }

  // Handle contact outcomes - use score-based follow-up
  if (outcomeConfig.isContact && outcomeConfig.nextFollowUpDays !== null) {
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + outcomeConfig.nextFollowUpDays)
    nextDate.setHours(9, 0, 0, 0)

    return {
      newPhase: outcomeConfig.exitPhase === 'NURTURE' ? 'NURTURE' : currentPhase,
      newBlitzAttempts: 0, // Reset on contact
      nextActionDue: nextDate,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: `Contact made - follow up in ${outcomeConfig.nextFollowUpDays} days`,
    }
  }

  // Handle callback - use callback date
  if (outcome === 'ANSWERED_CALLBACK' && callbackDate) {
    return {
      newPhase: currentPhase,
      newBlitzAttempts: 0,
      nextActionDue: callbackDate,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Callback scheduled',
    }
  }

  // Handle wrong number / disconnected - try next phone
  if (outcome === 'WRONG_NUMBER' || outcome === 'DISCONNECTED') {
    return {
      newPhase: currentPhase,
      newBlitzAttempts: blitzAttempts, // Don't increment, phone was bad
      nextActionDue: now, // Try next phone immediately
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Bad phone - try next number',
    }
  }

  // Handle no-contact outcomes (NO_ANSWER, VOICEMAIL, BUSY)
  const newAttempts = blitzAttempts + 1

  // Check if we've exceeded max attempts for this phase
  if (newAttempts >= phaseConfig.maxAttempts) {
    const nextPhase = phaseConfig.nextPhase

    if (nextPhase === 'DEEP_PROSPECT') {
      return {
        newPhase: 'DEEP_PROSPECT',
        newBlitzAttempts: 0,
        nextActionDue: null, // No action until new numbers
        nextActionType: 'SKIPTRACE',
        shouldMoveToDeepProspect: true,
        shouldMoveToNotWorkable: false,
        reason: `${phaseConfig.maxAttempts} attempts - needs new contact info`,
      }
    }

    if (nextPhase === 'MULTI_CHANNEL') {
      const mailDate = new Date(now)
      mailDate.setDate(mailDate.getDate() + 1)
      return {
        newPhase: 'MULTI_CHANNEL',
        newBlitzAttempts: 0,
        nextActionDue: mailDate,
        nextActionType: 'MAIL',
        shouldMoveToDeepProspect: false,
        shouldMoveToNotWorkable: false,
        reason: 'Moving to multi-channel outreach',
      }
    }

    if (nextPhase === 'NURTURE') {
      const nurtureDate = new Date(now)
      nurtureDate.setDate(nurtureDate.getDate() + 30)
      return {
        newPhase: 'NURTURE',
        newBlitzAttempts: 0,
        nextActionDue: nurtureDate,
        nextActionType: 'CALL',
        shouldMoveToDeepProspect: false,
        shouldMoveToNotWorkable: false,
        reason: 'Moving to long-term nurture',
      }
    }
  }

  // Still in blitz phase - call again tomorrow
  return {
    newPhase: currentPhase,
    newBlitzAttempts: newAttempts,
    nextActionDue: tomorrow,
    nextActionType: 'CALL',
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: `Attempt ${newAttempts}/${phaseConfig.maxAttempts} - call again tomorrow`,
  }
}

// ============================================
// AUTO-ENROLLMENT LOGIC
// ============================================

export interface EnrollmentResult {
  phase: LCEPhase
  cadenceState: string
  nextActionDue: Date
  nextActionType: string
  reason: string
}

export function enrollNewLead(hasValidPhone: boolean): EnrollmentResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0) // Set to 9 AM today

  if (!hasValidPhone) {
    return {
      phase: 'DEEP_PROSPECT',
      cadenceState: 'ACTIVE',
      nextActionDue: now,
      nextActionType: 'SKIPTRACE',
      reason: 'No valid phone - needs skiptrace',
    }
  }

  return {
    phase: 'BLITZ_1',
    cadenceState: 'ACTIVE',
    nextActionDue: now,
    nextActionType: 'CALL',
    reason: 'New lead with phone - call today!',
  }
}

// ============================================
// NEW PHONE ADDED LOGIC
// ============================================

export function handleNewPhoneAdded(currentPhase: LCEPhase): EnrollmentResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  // If in deep prospecting, restart with BLITZ_2
  if (currentPhase === 'DEEP_PROSPECT') {
    return {
      phase: 'BLITZ_2',
      cadenceState: 'ACTIVE',
      nextActionDue: now,
      nextActionType: 'CALL',
      reason: 'New phone added - starting second blitz!',
    }
  }

  // If in nurture, restart with BLITZ_2
  if (currentPhase === 'NURTURE') {
    return {
      phase: 'BLITZ_2',
      cadenceState: 'ACTIVE',
      nextActionDue: now,
      nextActionType: 'CALL',
      reason: 'New phone added - reactivating lead!',
    }
  }

  // Otherwise keep current phase
  return {
    phase: currentPhase,
    cadenceState: 'ACTIVE',
    nextActionDue: now,
    nextActionType: 'CALL',
    reason: 'New phone added - call today!',
  }
}

// ============================================
// QUEUE PRIORITY LOGIC
// ============================================

export interface QueuePriority {
  tier: number // Lower = higher priority
  reason: string
}

export function calculateQueuePriority(
  phase: LCEPhase,
  nextActionDue: Date | null,
  callbackScheduledFor: Date | null,
  score: number
): QueuePriority {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Tier 1: Callbacks due today (highest priority)
  if (callbackScheduledFor) {
    const callbackDate = new Date(callbackScheduledFor)
    if (callbackDate <= now) {
      return { tier: 1, reason: 'Callback due now' }
    }
    const callbackDay = new Date(callbackDate.getFullYear(), callbackDate.getMonth(), callbackDate.getDate())
    if (callbackDay.getTime() === today.getTime()) {
      return { tier: 1, reason: 'Callback scheduled today' }
    }
  }

  // Tier 2: New leads (never called)
  if (phase === 'NEW') {
    return { tier: 2, reason: 'New lead - first to market!' }
  }

  // Tier 3: Blitz follow-ups due today
  if ((phase === 'BLITZ_1' || phase === 'BLITZ_2') && nextActionDue) {
    const actionDate = new Date(nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return { tier: 3, reason: 'Blitz follow-up due' }
    }
  }

  // Tier 4: Score-based follow-ups due today
  if (nextActionDue) {
    const actionDate = new Date(nextActionDue)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())
    if (actionDay.getTime() <= today.getTime()) {
      return { tier: 4, reason: 'Follow-up due today' }
    }
  }

  // Tier 5: Deep prospecting (needs action but not calls)
  if (phase === 'DEEP_PROSPECT') {
    return { tier: 5, reason: 'Needs skiptrace/new numbers' }
  }

  // Tier 6: Multi-channel
  if (phase === 'MULTI_CHANNEL') {
    return { tier: 6, reason: 'Multi-channel outreach' }
  }

  // Tier 7: Nurture
  if (phase === 'NURTURE') {
    return { tier: 7, reason: 'Long-term nurture' }
  }

  // Tier 8: Future follow-ups (not due yet)
  return { tier: 8, reason: 'Future follow-up' }
}
