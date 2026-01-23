/**
 * LCE v4.0 Type Definitions
 * Lead Cadence Engine - Unified Types
 * 
 * This module defines all types for the unified LCE v4.0 engine,
 * combining the best of v2.3.1 (temperature cadences) and v3.0 (first-to-market).
 */

// ==========================================
// CADENCE PHASE (Unified from v3.0)
// ==========================================

export type CadencePhase =
  | 'NEW'           // Just imported, not yet enrolled
  | 'BLITZ_1'       // Initial aggressive contact (3 calls in 3 days)
  | 'DEEP_PROSPECT' // Waiting for new phone numbers (skip trace needed)
  | 'BLITZ_2'       // Second blitz after new phone added
  | 'TEMPERATURE'   // Following temperature-based cadence (HOT/WARM/COLD/ICE)
  | 'COMPLETED'     // Cadence finished, awaiting re-enrollment
  | 'ENGAGED'       // Contact made, user-driven follow-up
  | 'NURTURE'       // Long-term, annual contact only

// ==========================================
// CADENCE STATE (From v2.3.1)
// ==========================================

export type CadenceState =
  | 'NOT_ENROLLED'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'PAUSED'
  | 'COMPLETED_NO_CONTACT'
  | 'EXITED_ENGAGED'
  | 'EXITED_DNC'
  | 'EXITED_DEAD'
  | 'EXITED_CLOSED'
  | 'STALE_ENGAGED'
  | 'LONG_TERM_NURTURE'

// ==========================================
// TEMPERATURE & CADENCE TYPES
// ==========================================

export type TemperatureBand = 'HOT' | 'WARM' | 'COLD' | 'ICE'

export type CadenceType = 'HOT' | 'WARM' | 'COLD' | 'ICE' | 'GENTLE' | 'ANNUAL' | 'BLITZ'

// ==========================================
// QUEUE TIERS (1-9 Priority)
// ==========================================

export type QueueTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const QUEUE_TIER_CONFIG: Record<QueueTier, {
  name: string
  icon: string
  bucket: string
  description: string
}> = {
  1: { name: 'CALLBACKS_DUE', icon: '🔔', bucket: 'call-now', description: 'Callbacks due now' },
  2: { name: 'NEW_LEADS', icon: '⚡', bucket: 'call-now', description: 'New leads - first to market' },
  3: { name: 'BLITZ_FOLLOWUPS', icon: '🔥', bucket: 'call-now', description: 'Blitz follow-ups due' },
  4: { name: 'TASKS_DUE', icon: '✅', bucket: 'follow-up-today', description: 'Tasks due today' },
  5: { name: 'CADENCE_DUE', icon: '📞', bucket: 'follow-up-today', description: 'Cadence steps due' },
  6: { name: 'CALL_QUEUE', icon: '📋', bucket: 'call-queue', description: 'General call queue' },
  7: { name: 'VERIFY_FIRST', icon: '🔍', bucket: 'verify-first', description: 'Verify data first' },
  8: { name: 'GET_NUMBERS', icon: '📱', bucket: 'get-numbers', description: 'Need phone numbers' },
  9: { name: 'NURTURE', icon: '🌱', bucket: 'nurture', description: 'Long-term nurture' },
}

// ==========================================
// PHONE STATUS
// ==========================================

export type PhoneStatus = 'VALID' | 'UNVERIFIED' | 'WRONG' | 'DISCONNECTED' | 'DNC'

// ==========================================
// RESULT TYPES (From v2.4)
// ==========================================

export type ResultType = 'NO_CONTACT' | 'RETRY' | 'CONTACT_MADE' | 'BAD_DATA' | 'TERMINAL'

// ==========================================
// ACTION TYPES
// ==========================================

export type ActionType = 'CALL' | 'SMS' | 'RVM' | 'EMAIL' | 'MAIL' | 'SKIPTRACE' | 'NONE'

// ==========================================
// CALL OUTCOMES
// ==========================================

export type CallOutcome =
  | 'ANSWERED_INTERESTED'
  | 'ANSWERED_CALLBACK'
  | 'ANSWERED_NEUTRAL'
  | 'ANSWERED_NOT_NOW'
  | 'ANSWERED_NOT_INTERESTED'
  | 'ANSWERED_DNC'
  | 'VOICEMAIL'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'WRONG_NUMBER'
  | 'DISCONNECTED'
  | 'DNC'

// ==========================================
// LCE RECORD INTERFACE
// ==========================================

export interface LCERecord {
  id: string
  
  // Scoring
  priorityScore: number
  temperatureBand: TemperatureBand
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  
  // Phase & State
  cadencePhase: CadencePhase
  cadenceState: CadenceState
  
  // Cadence Progress
  cadenceType: CadenceType | null
  cadenceStep: number
  cadenceStartDate: Date | null
  cadenceProgress: string | null  // "3/7"
  
  // Timing
  nextActionDue: Date | null
  nextActionType: ActionType | null
  callbackScheduledFor: Date | null
  
  // Blitz Tracking
  blitzAttempts: number
  blitzStartedAt: Date | null
  
  // Temperature Tracking
  temperatureStartedAt: Date | null
  
  // Re-enrollment
  enrollmentCount: number
  reEnrollmentDate: Date | null
  cadenceExitDate: Date | null
  cadenceExitReason: string | null
  
  // Phone Tracking
  lastPhoneCalledId: string | null
  phoneExhaustedAt: Date | null
  hasValidPhone: boolean
  phoneCount: number
  
  // Queue
  queueTier: QueueTier
  
  // Contact Tracking
  callAttempts: number
  lastContactedAt: Date | null
  hasEngaged: boolean
  noResponseStreak: number
  
  // Snooze/Pause
  snoozedUntil: Date | null
  pausedReason: string | null
  
  // Tasks
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
}

// ==========================================
// PHONE DATA INTERFACE
// ==========================================

export interface PhoneData {
  id: string
  number: string
  type: string
  phoneStatus: PhoneStatus
  isPrimary: boolean
  attemptCount: number
  lastAttemptAt: Date | null
  lastOutcome: CallOutcome | null
  consecutiveNoAnswer: number
}

// ==========================================
// PHASE TRANSITION RESULT
// ==========================================

export interface PhaseTransitionResult {
  newPhase: CadencePhase
  newState: CadenceState
  newBlitzAttempts: number
  newCadenceStep: number
  newCadenceType: CadenceType | null
  nextActionDue: Date | null
  nextActionType: ActionType
  shouldMoveToDeepProspect: boolean
  shouldMoveToNotWorkable: boolean
  reason: string
}

// ==========================================
// QUEUE ASSIGNMENT
// ==========================================

export interface QueueAssignment {
  tier: QueueTier
  bucket: string
  reason: string
  priority: number  // Secondary sort within tier (higher = more urgent)
}

// ==========================================
// CADENCE STEP DEFINITION
// ==========================================

export interface CadenceStepDef {
  stepNumber: number
  dayOffset: number
  actionType: ActionType
  description: string
}

// ==========================================
// ACTION RESULT
// ==========================================

export interface ActionResult {
  success: boolean
  record: Partial<LCERecord>
  phoneUpdate?: {
    phoneId: string
    newStatus: PhoneStatus
    shouldRotate: boolean
    nextPhoneId: string | null
  }
  message: string
  error?: string
}

// ==========================================
// LCE STATUS (For API Response)
// ==========================================

export interface LCEStatus {
  recordId: string
  
  // Phase & State
  phase: CadencePhase
  state: CadenceState
  
  // Cadence Progress
  cadenceType: CadenceType | null
  step: number
  totalSteps: number
  progress: string  // "3/7"
  
  // Timing
  nextActionDue: Date | null
  nextActionType: ActionType | null
  
  // Re-enrollment
  enrollmentCount: number
  maxEnrollments: number
  reEnrollmentDate: Date | null
  daysUntilReEnrollment: number | null
  
  // Phones
  phones: {
    total: number
    valid: number
    unverified: number
    exhausted: boolean
    nextToCallId: string | null
  }
  
  // Queue
  queueTier: QueueTier
  queueBucket: string
  queueReason: string
}

// ==========================================
// CONSTANTS
// ==========================================

export const LCE_VERSION = 'LCE_4_0'

export const MAX_ENROLLMENT_CYCLES = 6

export const BLITZ_1_MAX_ATTEMPTS = 3
export const BLITZ_2_MAX_ATTEMPTS = 2

export const STALE_ENGAGED_DAYS = 21

export const RE_ENROLLMENT_BASE_WAIT: Record<TemperatureBand, number> = {
  HOT: 15,
  WARM: 30,
  COLD: 45,
  ICE: 90,
}

export const RE_ENROLLMENT_SCORE_MULTIPLIERS: Array<{ min: number; max: number; multiplier: number }> = [
  { min: 80, max: 100, multiplier: 0.75 },
  { min: 60, max: 79, multiplier: 1.0 },
  { min: 40, max: 59, multiplier: 1.25 },
  { min: 20, max: 39, multiplier: 1.5 },
  { min: 0, max: 19, multiplier: 2.0 },
]

// Terminal states that never re-enroll
export const NEVER_RE_ENROLL_STATES: CadenceState[] = [
  'EXITED_DNC',
  'EXITED_DEAD',
  'EXITED_CLOSED',
]

// States that show in queue
export const QUEUE_VISIBLE_STATES: CadenceState[] = [
  'ACTIVE',
  'NOT_ENROLLED',
]

// States that are workable
export const WORKABLE_STATES: CadenceState[] = [
  'NOT_ENROLLED',
  'ACTIVE',
  'SNOOZED',
  'PAUSED',
  'COMPLETED_NO_CONTACT',
  'EXITED_ENGAGED',
  'STALE_ENGAGED',
  'LONG_TERM_NURTURE',
]
