/**
 * LCE v2.3.1 Call Result Handler
 * Lead Cadence Engine - Call Attempt & Outcome Management
 * 
 * This module handles call attempt tracking, outcome logging,
 * and the outcome required rule as defined in the LCE v2.3.1 specification.
 */

import {
  CallOutcome,
  CadenceState,
  CadenceType,
  PhoneStatus,
} from './types'

// Note: getStateFromOutcome is available from state-machine if needed

import {
  advanceCadence,
  exitCadence,
  applyCallbackOverride,
} from './cadence'

// ==========================================
// CALL ATTEMPT TRACKING
// ==========================================

export interface CallAttempt {
  attemptId: string
  recordId: string
  phoneId: string | null
  phoneNumber: string | null
  attemptedAt: Date
  cadenceType: CadenceType | null
  stepNumber: number | null
  actionType: string
  executedById: string | null
}

export function createCallAttempt(
  recordId: string,
  phoneId: string | null,
  phoneNumber: string | null,
  cadenceType: CadenceType | null,
  stepNumber: number | null,
  executedById: string | null
): CallAttempt {
  return {
    attemptId: crypto.randomUUID(),
    recordId,
    phoneId,
    phoneNumber,
    attemptedAt: new Date(),
    cadenceType,
    stepNumber,
    actionType: 'CALL',
    executedById,
  }
}

// ==========================================
// OUTCOME LOGGING
// ==========================================

export interface OutcomeResult {
  outcome: CallOutcome
  outcomeLoggedAt: Date
  autoLogged: boolean
  
  // State changes
  newCadenceState: CadenceState | null
  newCadenceStep: number | null
  nextActionDue: Date | null
  nextActionType: string | null
  
  // Engagement changes
  engagementDelta: number
  noResponseStreakDelta: number
  resetNoResponseStreak: boolean
  
  // Phone status change
  newPhoneStatus: PhoneStatus | null
  
  // Exit info
  cadenceExitDate: Date | null
  cadenceExitReason: string | null
  reEnrollmentDate: Date | null
  
  // Callback
  isCallback: boolean
  callbackScheduledFor: Date | null
}

export function logOutcome(
  attempt: CallAttempt,
  outcome: CallOutcome,
  currentState: {
    cadenceState: CadenceState
    cadenceType: CadenceType | null
    cadenceStep: number
    cadenceStartDate: Date | null
    temperatureBand: string
    priorityScore: number
    enrollmentCount: number
    noResponseStreak: number
  },
  callbackTime?: Date,
  autoLogged: boolean = false
): OutcomeResult {
  const result: OutcomeResult = {
    outcome,
    outcomeLoggedAt: new Date(),
    autoLogged,
    newCadenceState: null,
    newCadenceStep: null,
    nextActionDue: null,
    nextActionType: null,
    engagementDelta: 0,
    noResponseStreakDelta: 0,
    resetNoResponseStreak: false,
    newPhoneStatus: null,
    cadenceExitDate: null,
    cadenceExitReason: null,
    reEnrollmentDate: null,
    isCallback: false,
    callbackScheduledFor: null,
  }

  // Handle outcome-specific logic
  switch (outcome) {
    case 'ANSWERED_INTERESTED':
      result.newCadenceState = 'EXITED_ENGAGED'
      result.engagementDelta = 20
      result.resetNoResponseStreak = true
      result.cadenceExitDate = new Date()
      result.cadenceExitReason = 'ANSWERED'
      break

    case 'ANSWERED_CALLBACK':
      result.isCallback = true
      result.callbackScheduledFor = callbackTime || null
      result.engagementDelta = 30
      result.resetNoResponseStreak = true
      // Apply callback override - force HOT
      const callbackResult = applyCallbackOverride(callbackTime)
      result.nextActionDue = callbackResult.nextActionDue
      result.nextActionType = callbackResult.nextActionType
      break

    case 'ANSWERED_NEUTRAL':
      result.engagementDelta = 10
      result.resetNoResponseStreak = true
      // Advance cadence
      if (currentState.cadenceType && currentState.cadenceStartDate) {
        const advance = advanceCadence(
          currentState.cadenceType,
          currentState.cadenceStep,
          currentState.cadenceStartDate,
          outcome
        )
        result.newCadenceState = advance.cadenceState
        result.newCadenceStep = advance.cadenceStep
        result.nextActionDue = advance.nextActionDue
        result.nextActionType = advance.nextActionType
        if (advance.isCompleted) {
          result.cadenceExitDate = advance.cadenceExitDate
          result.cadenceExitReason = advance.cadenceExitReason
        }
      }
      break

    case 'ANSWERED_NOT_NOW':
      result.engagementDelta = -5
      // This typically leads to snooze/pause, handled by caller
      break

    case 'ANSWERED_NOT_INTERESTED':
      result.newCadenceState = 'EXITED_CLOSED'
      result.cadenceExitDate = new Date()
      result.cadenceExitReason = 'CLOSED'
      // Workability will be blocked by caller
      break

    case 'VOICEMAIL':
      // Advance cadence, no engagement change
      if (currentState.cadenceType && currentState.cadenceStartDate) {
        const advance = advanceCadence(
          currentState.cadenceType,
          currentState.cadenceStep,
          currentState.cadenceStartDate,
          outcome
        )
        result.newCadenceState = advance.cadenceState
        result.newCadenceStep = advance.cadenceStep
        result.nextActionDue = advance.nextActionDue
        result.nextActionType = advance.nextActionType
        if (advance.isCompleted) {
          result.cadenceExitDate = advance.cadenceExitDate
          result.cadenceExitReason = advance.cadenceExitReason
        }
      }
      break

    case 'NO_ANSWER':
      result.noResponseStreakDelta = 1
      // Advance cadence
      if (currentState.cadenceType && currentState.cadenceStartDate) {
        const advance = advanceCadence(
          currentState.cadenceType,
          currentState.cadenceStep,
          currentState.cadenceStartDate,
          outcome
        )
        result.newCadenceState = advance.cadenceState
        result.newCadenceStep = advance.cadenceStep
        result.nextActionDue = advance.nextActionDue
        result.nextActionType = advance.nextActionType
        if (advance.isCompleted) {
          result.cadenceExitDate = advance.cadenceExitDate
          result.cadenceExitReason = advance.cadenceExitReason
        }
      }
      break

    case 'BUSY':
      // Retry same step tomorrow
      if (currentState.cadenceType && currentState.cadenceStartDate) {
        const advance = advanceCadence(
          currentState.cadenceType,
          currentState.cadenceStep,
          currentState.cadenceStartDate,
          outcome
        )
        result.newCadenceStep = advance.cadenceStep // Same step
        result.nextActionDue = advance.nextActionDue
        result.nextActionType = advance.nextActionType
      }
      break

    case 'WRONG_NUMBER':
      result.newPhoneStatus = 'WRONG'
      result.noResponseStreakDelta = 1
      // Phone rotation handled by caller
      break

    case 'DISCONNECTED':
      result.newPhoneStatus = 'DISCONNECTED'
      result.noResponseStreakDelta = 1
      // Phone rotation handled by caller
      break

    case 'DNC':
      result.newCadenceState = 'EXITED_DNC'
      result.newPhoneStatus = 'DNC'
      result.cadenceExitDate = new Date()
      result.cadenceExitReason = 'DNC'
      break
  }

  // Calculate re-enrollment date if cadence completed
  if (result.newCadenceState === 'COMPLETED_NO_CONTACT') {
    const exit = exitCadence(
      'COMPLETED_NO_CONTACT',
      currentState.temperatureBand as 'HOT' | 'WARM' | 'COLD' | 'ICE',
      currentState.priorityScore,
      currentState.enrollmentCount
    )
    result.reEnrollmentDate = exit.reEnrollmentDate
    if (exit.cadenceState === 'LONG_TERM_NURTURE') {
      result.newCadenceState = 'LONG_TERM_NURTURE'
    }
  }

  return result
}

// ==========================================
// OUTCOME REQUIRED RULE (2-hour auto-log)
// ==========================================

export interface PendingAttempt {
  attemptId: string
  recordId: string
  attemptedAt: Date
  phoneId: string | null
}

export function shouldAutoLogOutcome(attempt: PendingAttempt): boolean {
  const twoHoursAgo = new Date()
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
  
  return attempt.attemptedAt < twoHoursAgo
}

export function createAutoLoggedOutcome(attempt: PendingAttempt): {
  outcome: CallOutcome
  notes: string
} {
  return {
    outcome: 'NO_ANSWER',
    notes: 'Auto-logged: No result recorded within 2 hours',
  }
}

// ==========================================
// OUTCOME VALIDATION
// ==========================================

export function isPositiveOutcome(outcome: CallOutcome): boolean {
  return [
    'ANSWERED_INTERESTED',
    'ANSWERED_CALLBACK',
    'ANSWERED_NEUTRAL',
  ].includes(outcome)
}

export function isNegativeOutcome(outcome: CallOutcome): boolean {
  return [
    'ANSWERED_NOT_INTERESTED',
    'WRONG_NUMBER',
    'DISCONNECTED',
    'DNC',
  ].includes(outcome)
}

export function requiresComplianceLog(outcome: CallOutcome): boolean {
  return [
    'DNC',
    'ANSWERED_NOT_INTERESTED',
  ].includes(outcome)
}

// ==========================================
// ENGAGEMENT SCORE HELPERS
// ==========================================

export function calculateNewEngagementScore(
  currentScore: number,
  delta: number,
  resetStreak: boolean
): number {
  if (resetStreak) {
    // Positive engagement resets to at least the delta
    return Math.max(currentScore + delta, delta)
  }
  return Math.max(0, currentScore + delta)
}

export function calculateNewNoResponseStreak(
  currentStreak: number,
  delta: number,
  reset: boolean
): number {
  if (reset) {
    return 0
  }
  return currentStreak + delta
}

// ==========================================
// OUTCOME TO DISPLAY NAME
// ==========================================

export const OUTCOME_DISPLAY_NAMES: Record<CallOutcome, string> = {
  ANSWERED_INTERESTED: 'Answered - Interested',
  ANSWERED_CALLBACK: 'Answered - Callback Requested',
  ANSWERED_NEUTRAL: 'Answered - Neutral',
  ANSWERED_NOT_NOW: 'Answered - Not Now',
  ANSWERED_NOT_INTERESTED: 'Answered - Not Interested',
  VOICEMAIL: 'Voicemail Left',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  WRONG_NUMBER: 'Wrong Number',
  DISCONNECTED: 'Disconnected',
  DNC: 'DNC Requested',
}

export function getOutcomeDisplayName(outcome: CallOutcome): string {
  return OUTCOME_DISPLAY_NAMES[outcome] || outcome
}
