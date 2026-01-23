/**
 * LCE v4.0 Phase Manager
 * Lead Cadence Engine - Phase Transition Logic
 * 
 * Handles transitions between phases:
 * NEW → BLITZ_1 → DEEP_PROSPECT → BLITZ_2 → TEMPERATURE → COMPLETED → (re-enroll)
 *                                                      ↘ ENGAGED
 *                                                      ↘ NURTURE
 */

import type {
  CadencePhase,
  CadenceState,
  TemperatureBand,
  CadenceType,
  ActionType,
  CallOutcome,
  PhaseTransitionResult,
  LCERecord,
} from './types'

import {
  BLITZ_1_MAX_ATTEMPTS,
  BLITZ_2_MAX_ATTEMPTS,
  MAX_ENROLLMENT_CYCLES,
} from './types'

import { OUTCOME_CONFIG, CADENCE_TEMPLATES } from './constants'

// ==========================================
// ENROLLMENT
// ==========================================

export interface EnrollmentResult {
  phase: CadencePhase
  state: CadenceState
  cadenceType: CadenceType | null
  cadenceStep: number
  nextActionDue: Date
  nextActionType: ActionType
  blitzAttempts: number
  reason: string
}

export function enrollNewLead(hasValidPhone: boolean): EnrollmentResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  if (!hasValidPhone) {
    return {
      phase: 'DEEP_PROSPECT',
      state: 'ACTIVE',
      cadenceType: null,
      cadenceStep: 0,
      nextActionDue: now,
      nextActionType: 'SKIPTRACE',
      blitzAttempts: 0,
      reason: 'No valid phone - needs skip trace',
    }
  }

  return {
    phase: 'BLITZ_1',
    state: 'ACTIVE',
    cadenceType: 'BLITZ',
    cadenceStep: 1,
    nextActionDue: now,
    nextActionType: 'CALL',
    blitzAttempts: 0,
    reason: 'New lead with phone - starting blitz!',
  }
}

// ==========================================
// PHASE TRANSITIONS
// ==========================================

export function calculatePhaseTransition(
  record: Pick<LCERecord, 'cadencePhase' | 'cadenceState' | 'blitzAttempts' | 'cadenceStep' | 'cadenceType' | 'cadenceStartDate' | 'temperatureBand' | 'enrollmentCount'>,
  outcome: CallOutcome,
  callbackDate?: Date
): PhaseTransitionResult {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const outcomeConfig = OUTCOME_CONFIG[outcome]

  // Handle DNC - always exit permanently
  if (outcome === 'ANSWERED_DNC' || outcome === 'DNC') {
    return {
      newPhase: record.cadencePhase,
      newState: 'EXITED_DNC',
      newBlitzAttempts: record.blitzAttempts,
      newCadenceStep: record.cadenceStep,
      newCadenceType: record.cadenceType,
      nextActionDue: null,
      nextActionType: 'NONE',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: true,
      reason: 'DNC - Do Not Call requested',
    }
  }

  // Handle contact made - exit to ENGAGED
  if (outcomeConfig.isContact && outcomeConfig.nextFollowUpDays !== null) {
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + outcomeConfig.nextFollowUpDays)
    nextDate.setHours(9, 0, 0, 0)

    // Not interested goes to NURTURE, others go to ENGAGED
    const newPhase: CadencePhase = outcome === 'ANSWERED_NOT_INTERESTED' ? 'NURTURE' : 'ENGAGED'
    const newState: CadenceState = outcome === 'ANSWERED_NOT_INTERESTED' ? 'LONG_TERM_NURTURE' : 'EXITED_ENGAGED'

    return {
      newPhase,
      newState,
      newBlitzAttempts: 0,
      newCadenceStep: 0,
      newCadenceType: null,
      nextActionDue: nextDate,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: `Contact made - ${outcome === 'ANSWERED_NOT_INTERESTED' ? 'moving to nurture' : 'follow up in ' + outcomeConfig.nextFollowUpDays + ' days'}`,
    }
  }

  // Handle callback - use callback date
  if (outcome === 'ANSWERED_CALLBACK' && callbackDate) {
    return {
      newPhase: 'ENGAGED',
      newState: 'EXITED_ENGAGED',
      newBlitzAttempts: 0,
      newCadenceStep: 0,
      newCadenceType: null,
      nextActionDue: callbackDate,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Callback scheduled',
    }
  }

  // Handle bad phone - mark phone bad, check for rotation
  if (outcome === 'WRONG_NUMBER' || outcome === 'DISCONNECTED') {
    return {
      newPhase: record.cadencePhase,
      newState: record.cadenceState,
      newBlitzAttempts: record.blitzAttempts, // Don't increment for bad phone
      newCadenceStep: record.cadenceStep,
      newCadenceType: record.cadenceType,
      nextActionDue: now, // Try next phone immediately
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Bad phone - try next number',
    }
  }

  // Handle no-contact outcomes based on current phase
  return handleNoContactOutcome(record, outcome)
}

function handleNoContactOutcome(
  record: Pick<LCERecord, 'cadencePhase' | 'cadenceState' | 'blitzAttempts' | 'cadenceStep' | 'cadenceType' | 'cadenceStartDate' | 'temperatureBand' | 'enrollmentCount'>,
  outcome: CallOutcome
): PhaseTransitionResult {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  // BUSY = retry same step tomorrow, don't increment attempts
  if (outcome === 'BUSY') {
    return {
      newPhase: record.cadencePhase,
      newState: record.cadenceState,
      newBlitzAttempts: record.blitzAttempts,
      newCadenceStep: record.cadenceStep,
      newCadenceType: record.cadenceType,
      nextActionDue: tomorrow,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Busy - retry tomorrow',
    }
  }

  // Handle based on current phase
  switch (record.cadencePhase) {
    case 'NEW':
      return transitionFromNew()

    case 'BLITZ_1':
      return transitionFromBlitz1(record.blitzAttempts)

    case 'BLITZ_2':
      return transitionFromBlitz2(record.blitzAttempts, record.temperatureBand)

    case 'TEMPERATURE':
      return transitionFromTemperature(record)

    case 'DEEP_PROSPECT':
      // Shouldn't be calling from DEEP_PROSPECT, but handle gracefully
      return {
        newPhase: 'DEEP_PROSPECT',
        newState: 'ACTIVE',
        newBlitzAttempts: 0,
        newCadenceStep: 0,
        newCadenceType: null,
        nextActionDue: null,
        nextActionType: 'SKIPTRACE',
        shouldMoveToDeepProspect: true,
        shouldMoveToNotWorkable: false,
        reason: 'Still needs new phone numbers',
      }

    case 'NURTURE':
      // Nurture leads just get scheduled for next annual check
      const sixMonths = new Date(now)
      sixMonths.setMonth(sixMonths.getMonth() + 6)
      return {
        newPhase: 'NURTURE',
        newState: 'LONG_TERM_NURTURE',
        newBlitzAttempts: 0,
        newCadenceStep: 1,
        newCadenceType: 'ANNUAL',
        nextActionDue: sixMonths,
        nextActionType: 'CALL',
        shouldMoveToDeepProspect: false,
        shouldMoveToNotWorkable: false,
        reason: 'Nurture - next check in 6 months',
      }

    default:
      // Default: stay in current phase, call tomorrow
      return {
        newPhase: record.cadencePhase,
        newState: record.cadenceState,
        newBlitzAttempts: record.blitzAttempts + 1,
        newCadenceStep: record.cadenceStep,
        newCadenceType: record.cadenceType,
        nextActionDue: tomorrow,
        nextActionType: 'CALL',
        shouldMoveToDeepProspect: false,
        shouldMoveToNotWorkable: false,
        reason: 'No contact - call again tomorrow',
      }
  }
}

function transitionFromNew(): PhaseTransitionResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  return {
    newPhase: 'BLITZ_1',
    newState: 'ACTIVE',
    newBlitzAttempts: 1,
    newCadenceStep: 1,
    newCadenceType: 'BLITZ',
    nextActionDue: now,
    nextActionType: 'CALL',
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: 'Starting blitz phase',
  }
}

function transitionFromBlitz1(currentAttempts: number): PhaseTransitionResult {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const newAttempts = currentAttempts + 1

  // Check if blitz exhausted
  if (newAttempts >= BLITZ_1_MAX_ATTEMPTS) {
    return {
      newPhase: 'DEEP_PROSPECT',
      newState: 'ACTIVE',
      newBlitzAttempts: 0,
      newCadenceStep: 0,
      newCadenceType: null,
      nextActionDue: null,
      nextActionType: 'SKIPTRACE',
      shouldMoveToDeepProspect: true,
      shouldMoveToNotWorkable: false,
      reason: `${BLITZ_1_MAX_ATTEMPTS} attempts - needs new contact info`,
    }
  }

  // Continue blitz
  return {
    newPhase: 'BLITZ_1',
    newState: 'ACTIVE',
    newBlitzAttempts: newAttempts,
    newCadenceStep: newAttempts + 1,
    newCadenceType: 'BLITZ',
    nextActionDue: tomorrow,
    nextActionType: 'CALL',
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: `Blitz attempt ${newAttempts}/${BLITZ_1_MAX_ATTEMPTS} - call again tomorrow`,
  }
}

function transitionFromBlitz2(currentAttempts: number, temperatureBand: TemperatureBand): PhaseTransitionResult {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  const newAttempts = currentAttempts + 1

  // Check if blitz 2 exhausted - move to temperature cadence
  if (newAttempts >= BLITZ_2_MAX_ATTEMPTS) {
    const cadenceType = temperatureBand as CadenceType
    const template = CADENCE_TEMPLATES[cadenceType]
    const firstStep = template[0]

    return {
      newPhase: 'TEMPERATURE',
      newState: 'ACTIVE',
      newBlitzAttempts: 0,
      newCadenceStep: 1,
      newCadenceType: cadenceType,
      nextActionDue: now,
      nextActionType: firstStep.actionType,
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: `Blitz 2 complete - starting ${temperatureBand} temperature cadence`,
    }
  }

  // Continue blitz 2
  return {
    newPhase: 'BLITZ_2',
    newState: 'ACTIVE',
    newBlitzAttempts: newAttempts,
    newCadenceStep: newAttempts + 1,
    newCadenceType: 'BLITZ',
    nextActionDue: tomorrow,
    nextActionType: 'CALL',
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: `Blitz 2 attempt ${newAttempts}/${BLITZ_2_MAX_ATTEMPTS} - call again tomorrow`,
  }
}

function transitionFromTemperature(
  record: Pick<LCERecord, 'cadenceStep' | 'cadenceType' | 'cadenceStartDate' | 'temperatureBand' | 'enrollmentCount'>
): PhaseTransitionResult {
  const now = new Date()
  const cadenceType = record.cadenceType || (record.temperatureBand as CadenceType)
  const template = CADENCE_TEMPLATES[cadenceType]
  
  if (!template) {
    // Fallback to WARM if no template
    const warmTemplate = CADENCE_TEMPLATES['WARM']
    return {
      newPhase: 'TEMPERATURE',
      newState: 'ACTIVE',
      newBlitzAttempts: 0,
      newCadenceStep: 1,
      newCadenceType: 'WARM',
      nextActionDue: now,
      nextActionType: warmTemplate[0].actionType,
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: 'Fallback to WARM cadence',
    }
  }

  const currentStep = record.cadenceStep
  const nextStepNumber = currentStep + 1
  const nextStep = template.find(s => s.stepNumber === nextStepNumber)

  // Cadence completed
  if (!nextStep) {
    return handleCadenceCompletion(record.temperatureBand, record.enrollmentCount)
  }

  // Calculate next action due date
  const startDate = record.cadenceStartDate || now
  let nextActionDue = new Date(startDate)
  nextActionDue.setDate(nextActionDue.getDate() + nextStep.dayOffset)

  // If next action is in the past, set to tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  if (nextActionDue < tomorrow) {
    nextActionDue = tomorrow
  }

  return {
    newPhase: 'TEMPERATURE',
    newState: 'ACTIVE',
    newBlitzAttempts: 0,
    newCadenceStep: nextStepNumber,
    newCadenceType: cadenceType,
    nextActionDue,
    nextActionType: nextStep.actionType,
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: `Step ${nextStepNumber}/${template.length} - ${nextStep.description}`,
  }
}

function handleCadenceCompletion(
  temperatureBand: TemperatureBand,
  enrollmentCount: number
): PhaseTransitionResult {
  const now = new Date()

  // Check if max enrollment cycles reached
  if (enrollmentCount >= MAX_ENROLLMENT_CYCLES) {
    const sixMonths = new Date(now)
    sixMonths.setMonth(sixMonths.getMonth() + 6)

    return {
      newPhase: 'NURTURE',
      newState: 'LONG_TERM_NURTURE',
      newBlitzAttempts: 0,
      newCadenceStep: 0,
      newCadenceType: 'ANNUAL',
      nextActionDue: sixMonths,
      nextActionType: 'CALL',
      shouldMoveToDeepProspect: false,
      shouldMoveToNotWorkable: false,
      reason: `Max ${MAX_ENROLLMENT_CYCLES} enrollment cycles reached - moving to long-term nurture`,
    }
  }

  // Move to COMPLETED state, awaiting re-enrollment
  return {
    newPhase: 'COMPLETED',
    newState: 'COMPLETED_NO_CONTACT',
    newBlitzAttempts: 0,
    newCadenceStep: 0,
    newCadenceType: null,
    nextActionDue: null,
    nextActionType: 'NONE',
    shouldMoveToDeepProspect: false,
    shouldMoveToNotWorkable: false,
    reason: 'Cadence completed - awaiting re-enrollment',
  }
}

// ==========================================
// NEW PHONE ADDED
// ==========================================

export function handleNewPhoneAdded(currentPhase: CadencePhase): EnrollmentResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  // If in DEEP_PROSPECT, start BLITZ_2
  if (currentPhase === 'DEEP_PROSPECT') {
    return {
      phase: 'BLITZ_2',
      state: 'ACTIVE',
      cadenceType: 'BLITZ',
      cadenceStep: 1,
      nextActionDue: now,
      nextActionType: 'CALL',
      blitzAttempts: 0,
      reason: 'New phone added - starting second blitz!',
    }
  }

  // If in NURTURE, reactivate with BLITZ_2
  if (currentPhase === 'NURTURE') {
    return {
      phase: 'BLITZ_2',
      state: 'ACTIVE',
      cadenceType: 'BLITZ',
      cadenceStep: 1,
      nextActionDue: now,
      nextActionType: 'CALL',
      blitzAttempts: 0,
      reason: 'New phone added - reactivating lead!',
    }
  }

  // If in COMPLETED, start BLITZ_2
  if (currentPhase === 'COMPLETED') {
    return {
      phase: 'BLITZ_2',
      state: 'ACTIVE',
      cadenceType: 'BLITZ',
      cadenceStep: 1,
      nextActionDue: now,
      nextActionType: 'CALL',
      blitzAttempts: 0,
      reason: 'New phone added - restarting with blitz!',
    }
  }

  // Otherwise keep current phase, just mark for call today
  return {
    phase: currentPhase,
    state: 'ACTIVE',
    cadenceType: 'BLITZ',
    cadenceStep: 1,
    nextActionDue: now,
    nextActionType: 'CALL',
    blitzAttempts: 0,
    reason: 'New phone added - call today!',
  }
}

// ==========================================
// RE-ENROLLMENT
// ==========================================

export function reEnrollIntoTemperature(
  temperatureBand: TemperatureBand,
  enrollmentCount: number,
  isStaleEngaged: boolean = false
): EnrollmentResult {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  // Use GENTLE cadence for stale engaged leads
  const cadenceType: CadenceType = isStaleEngaged ? 'GENTLE' : (temperatureBand as CadenceType)
  const template = CADENCE_TEMPLATES[cadenceType]
  const firstStep = template[0]

  return {
    phase: 'TEMPERATURE',
    state: 'ACTIVE',
    cadenceType,
    cadenceStep: 1,
    nextActionDue: now,
    nextActionType: firstStep.actionType,
    blitzAttempts: 0,
    reason: `Re-enrolled into ${cadenceType} cadence (cycle ${enrollmentCount + 1})`,
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function getTotalSteps(cadenceType: CadenceType): number {
  const template = CADENCE_TEMPLATES[cadenceType]
  return template ? template.length : 0
}

export function getCadenceProgress(step: number, cadenceType: CadenceType | null): string {
  if (!cadenceType) return '0/0'
  const total = getTotalSteps(cadenceType)
  return `${step}/${total}`
}

export function isPhaseCallable(phase: CadencePhase): boolean {
  return phase !== 'DEEP_PROSPECT' && phase !== 'COMPLETED'
}
