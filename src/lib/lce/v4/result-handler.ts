/**
 * LCE v4.0 Result Handler
 * Lead Cadence Engine - Call Result Processing
 * 
 * Maps call results to:
 * - Result types (NO_CONTACT, RETRY, CONTACT_MADE, BAD_DATA, TERMINAL)
 * - Phase transitions
 * - State transitions
 * - Phone status updates
 */

import type {
  ResultType,
  CallOutcome,
  CadencePhase,
  CadenceState,
  TemperatureBand,
  PhoneData,
  ActionResult,
  LCERecord,
} from './types'

import { RESULT_TYPE_MAP, CALL_RESULT_TO_OUTCOME, OUTCOME_CONFIG } from './constants'
import { calculatePhaseTransition } from './phase-manager'
import { updatePhoneAfterCall, shouldMarkPhoneExhausted } from './phone-manager'

// ==========================================
// RESULT TYPE MAPPING
// ==========================================

export function mapCallResultToResultType(callResultName: string): ResultType {
  // Check exact match first
  if (RESULT_TYPE_MAP[callResultName]) {
    return RESULT_TYPE_MAP[callResultName]
  }

  // Check partial matches
  const lowerName = callResultName.toLowerCase()

  if (lowerName.includes('answered') || lowerName.includes('contacted') || lowerName.includes('spoke')) {
    return 'CONTACT_MADE'
  }

  if (lowerName.includes('voicemail') || lowerName.includes('no answer') || lowerName.includes('left message')) {
    return 'NO_CONTACT'
  }

  if (lowerName.includes('busy') || lowerName.includes('callback') || lowerName.includes('call back')) {
    return 'RETRY'
  }

  if (lowerName.includes('wrong') || lowerName.includes('disconnect') || lowerName.includes('invalid')) {
    return 'BAD_DATA'
  }

  if (lowerName.includes('dnc') || lowerName.includes('do not call') || lowerName.includes('deceased') || lowerName.includes('dead')) {
    return 'TERMINAL'
  }

  // Default to NO_CONTACT
  return 'NO_CONTACT'
}

// ==========================================
// CALL OUTCOME MAPPING
// ==========================================

export function mapCallResultToOutcome(callResultName: string): CallOutcome {
  // Check exact match first
  if (CALL_RESULT_TO_OUTCOME[callResultName]) {
    return CALL_RESULT_TO_OUTCOME[callResultName]
  }

  // Check partial matches
  const lowerName = callResultName.toLowerCase()

  if (lowerName.includes('interested') && !lowerName.includes('not interested')) {
    return 'ANSWERED_INTERESTED'
  }

  if (lowerName.includes('callback') || lowerName.includes('call back')) {
    return 'ANSWERED_CALLBACK'
  }

  if (lowerName.includes('not interested')) {
    return 'ANSWERED_NOT_INTERESTED'
  }

  if (lowerName.includes('not now') || lowerName.includes('not ready')) {
    return 'ANSWERED_NOT_NOW'
  }

  if (lowerName.includes('answered') || lowerName.includes('contacted') || lowerName.includes('spoke')) {
    return 'ANSWERED_NEUTRAL'
  }

  if (lowerName.includes('voicemail') || lowerName.includes('left message')) {
    return 'VOICEMAIL'
  }

  if (lowerName.includes('no answer')) {
    return 'NO_ANSWER'
  }

  if (lowerName.includes('busy')) {
    return 'BUSY'
  }

  if (lowerName.includes('wrong')) {
    return 'WRONG_NUMBER'
  }

  if (lowerName.includes('disconnect') || lowerName.includes('not in service')) {
    return 'DISCONNECTED'
  }

  if (lowerName.includes('dnc') || lowerName.includes('do not call')) {
    return 'DNC'
  }

  // Default to NO_ANSWER
  return 'NO_ANSWER'
}

// ==========================================
// PROCESS CALL RESULT
// ==========================================

export interface ProcessCallResultInput {
  record: Pick<LCERecord, 
    | 'id'
    | 'cadencePhase'
    | 'cadenceState'
    | 'blitzAttempts'
    | 'cadenceStep'
    | 'cadenceType'
    | 'cadenceStartDate'
    | 'temperatureBand'
    | 'enrollmentCount'
    | 'lastPhoneCalledId'
  >
  callResultName: string
  phoneId: string
  phones: PhoneData[]
  callbackDate?: Date
}

export interface ProcessCallResultOutput {
  // Record updates
  recordUpdates: Partial<LCERecord>
  
  // Phone updates
  phoneUpdate: {
    phoneId: string
    updates: {
      phoneStatus?: string
      attemptCount: number
      lastAttemptAt: Date
      lastOutcome: CallOutcome
      consecutiveNoAnswer: number
    }
    shouldRotate: boolean
    rotateReason: string | null
    nextPhoneId: string | null
  } | null
  
  // Flags
  isContactMade: boolean
  isTerminal: boolean
  isBadData: boolean
  shouldMoveToDeepProspect: boolean
  shouldMoveToNotWorkable: boolean
  phoneExhausted: boolean
  
  // Info
  resultType: ResultType
  outcome: CallOutcome
  reason: string
}

export function processCallResult(input: ProcessCallResultInput): ProcessCallResultOutput {
  const { record, callResultName, phoneId, phones, callbackDate } = input

  // Map call result to outcome and result type
  const outcome = mapCallResultToOutcome(callResultName)
  const resultType = mapCallResultToResultType(callResultName)
  const outcomeConfig = OUTCOME_CONFIG[outcome]

  // Get phone that was called
  const calledPhone = phones.find(p => p.id === phoneId)

  // Calculate phase transition
  const transition = calculatePhaseTransition(record, outcome, callbackDate)

  // Update phone status
  let phoneUpdate: ProcessCallResultOutput['phoneUpdate'] = null
  let phoneExhausted = false

  if (calledPhone) {
    const phoneResult = updatePhoneAfterCall(calledPhone, outcome, phones)
    phoneUpdate = {
      phoneId: phoneResult.phoneId,
      updates: phoneResult.updates,
      shouldRotate: phoneResult.shouldRotate,
      rotateReason: phoneResult.rotateReason,
      nextPhoneId: phoneResult.nextPhoneId,
    }

    // Check if phones are now exhausted
    const updatedPhones = phones.map(p =>
      p.id === phoneId
        ? { ...p, ...phoneResult.updates, phoneStatus: phoneResult.updates.phoneStatus || p.phoneStatus }
        : p
    )
    phoneExhausted = shouldMarkPhoneExhausted(updatedPhones)
  }

  // Build record updates
  const recordUpdates: Partial<LCERecord> = {
    cadencePhase: transition.newPhase,
    cadenceState: transition.newState,
    blitzAttempts: transition.newBlitzAttempts,
    cadenceStep: transition.newCadenceStep,
    cadenceType: transition.newCadenceType,
    nextActionDue: transition.nextActionDue,
    nextActionType: transition.nextActionType,
    lastPhoneCalledId: phoneId,
    callAttempts: (record as any).callAttempts ? (record as any).callAttempts + 1 : 1,
    lastContactedAt: outcomeConfig.isContact ? new Date() : undefined,
    hasEngaged: outcomeConfig.isContact ? true : undefined,
  }

  // Mark phone exhausted if needed
  if (phoneExhausted && !recordUpdates.phoneExhaustedAt) {
    recordUpdates.phoneExhaustedAt = new Date()
  }

  // Handle deep prospect transition
  if (transition.shouldMoveToDeepProspect || phoneExhausted) {
    recordUpdates.cadencePhase = 'DEEP_PROSPECT'
    recordUpdates.nextActionType = 'SKIPTRACE'
    recordUpdates.nextActionDue = null
  }

  return {
    recordUpdates,
    phoneUpdate,
    isContactMade: outcomeConfig.isContact,
    isTerminal: resultType === 'TERMINAL',
    isBadData: resultType === 'BAD_DATA',
    shouldMoveToDeepProspect: transition.shouldMoveToDeepProspect || phoneExhausted,
    shouldMoveToNotWorkable: transition.shouldMoveToNotWorkable,
    phoneExhausted,
    resultType,
    outcome,
    reason: transition.reason,
  }
}

// ==========================================
// ENGAGEMENT SCORE UPDATE
// ==========================================

export function calculateNewEngagementScore(
  currentScore: number,
  outcome: CallOutcome
): number {
  const outcomeConfig = OUTCOME_CONFIG[outcome]
  const change = outcomeConfig.scoreChange

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, currentScore + change))
}

// ==========================================
// NO-RESPONSE STREAK UPDATE
// ==========================================

export function calculateNewNoResponseStreak(
  currentStreak: number,
  outcome: CallOutcome
): number {
  const outcomeConfig = OUTCOME_CONFIG[outcome]

  if (outcomeConfig.isContact) {
    // Reset streak on contact
    return 0
  }

  if (outcome === 'NO_ANSWER' || outcome === 'VOICEMAIL') {
    // Increment streak
    return currentStreak + 1
  }

  // Keep current streak for other outcomes
  return currentStreak
}

// ==========================================
// SHOULD PROMPT FOR STATUS
// ==========================================

export function shouldPromptForStatus(outcome: CallOutcome): boolean {
  const outcomeConfig = OUTCOME_CONFIG[outcome]
  return outcomeConfig.isContact && outcome !== 'ANSWERED_DNC'
}

// ==========================================
// GET FOLLOW-UP DAYS
// ==========================================

export function getFollowUpDays(outcome: CallOutcome): number | null {
  return OUTCOME_CONFIG[outcome].nextFollowUpDays
}
