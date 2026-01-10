/**
 * LCE v2.3.1 Cadence Tracker
 * Lead Cadence Engine - Cadence Enrollment & Step Management
 * 
 * This module handles cadence enrollment, step advancement,
 * and due date calculations as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  CadenceType,
  TemperatureBand,
  ActionType,
  CallOutcome,
  RE_ENROLLMENT_BASE_WAIT,
  RE_ENROLLMENT_SCORE_MULTIPLIERS,
} from './types'

import {
  getCadenceTypeFromTemperature,
  getExitReasonFromState,
  canReEnroll,
} from './state-machine'

// ==========================================
// CADENCE STEP DEFINITIONS
// ==========================================

export interface CadenceStepDef {
  stepNumber: number
  dayOffset: number
  actionType: ActionType
  description: string
}

export const CADENCE_TEMPLATES: Record<CadenceType, CadenceStepDef[]> = {
  HOT: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 1, actionType: 'CALL', description: 'Quick follow-up' },
    { stepNumber: 3, dayOffset: 2, actionType: 'SMS', description: 'Text message' },
    { stepNumber: 4, dayOffset: 4, actionType: 'CALL', description: 'Persistence call' },
    { stepNumber: 5, dayOffset: 6, actionType: 'RVM', description: 'Ringless voicemail' },
    { stepNumber: 6, dayOffset: 9, actionType: 'CALL', description: 'Re-attempt call' },
    { stepNumber: 7, dayOffset: 14, actionType: 'CALL', description: 'Final attempt' },
  ],
  WARM: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 3, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 7, actionType: 'SMS', description: 'Check-in text' },
    { stepNumber: 4, dayOffset: 14, actionType: 'CALL', description: 'Re-engage call' },
    { stepNumber: 5, dayOffset: 21, actionType: 'CALL', description: 'Final attempt' },
  ],
  COLD: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 14, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 45, actionType: 'CALL', description: 'Final attempt' },
  ],
  ICE: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 90, actionType: 'CALL', description: 'Check back' },
  ],
  GENTLE: [
    { stepNumber: 1, dayOffset: 0, actionType: 'SMS', description: 'Soft check-in' },
    { stepNumber: 2, dayOffset: 7, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 30, actionType: 'CALL', description: 'Final re-engagement' },
  ],
  ANNUAL: [
    { stepNumber: 1, dayOffset: 365, actionType: 'CALL', description: 'Annual check-in' },
  ],
}

// ==========================================
// CADENCE ENROLLMENT
// ==========================================

export interface EnrollmentResult {
  cadenceState: CadenceState
  cadenceType: CadenceType
  cadenceStep: number
  cadenceStartDate: Date
  nextActionType: ActionType
  nextActionDue: Date
  enrollmentCount: number
}

export function enrollInCadence(
  temperatureBand: TemperatureBand,
  currentEnrollmentCount: number = 0,
  isReEngagement: boolean = false
): EnrollmentResult {
  const cadenceType = isReEngagement ? 'GENTLE' : getCadenceTypeFromTemperature(temperatureBand)
  const steps = CADENCE_TEMPLATES[cadenceType]
  const firstStep = steps[0]
  
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Start of today (UTC)
  
  // Calculate next action due date
  const nextActionDue = new Date(startDate)
  nextActionDue.setDate(nextActionDue.getDate() + firstStep.dayOffset)

  return {
    cadenceState: 'ACTIVE',
    cadenceType,
    cadenceStep: 1,
    cadenceStartDate: startDate,
    nextActionType: firstStep.actionType,
    nextActionDue,
    enrollmentCount: currentEnrollmentCount + 1,
  }
}

// ==========================================
// CADENCE STEP ADVANCEMENT
// ==========================================

export interface AdvanceResult {
  cadenceState: CadenceState
  cadenceStep: number
  nextActionType: ActionType | null
  nextActionDue: Date | null
  cadenceExitDate: Date | null
  cadenceExitReason: string | null
  isCompleted: boolean
}

export function advanceCadence(
  cadenceType: CadenceType,
  currentStep: number,
  cadenceStartDate: Date,
  outcome: CallOutcome
): AdvanceResult {
  const steps = CADENCE_TEMPLATES[cadenceType]
  
  // Handle BUSY - retry same step tomorrow
  if (outcome === 'BUSY') {
    const currentStepDef = steps.find(s => s.stepNumber === currentStep)
    if (!currentStepDef) {
      throw new Error(`Invalid step ${currentStep} for cadence ${cadenceType}`)
    }
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Use max of tomorrow or scheduled date
    const scheduledDate = new Date(cadenceStartDate)
    scheduledDate.setDate(scheduledDate.getDate() + currentStepDef.dayOffset)
    
    const nextActionDue = tomorrow > scheduledDate ? tomorrow : scheduledDate

    return {
      cadenceState: 'ACTIVE',
      cadenceStep: currentStep, // Stay on same step
      nextActionType: currentStepDef.actionType,
      nextActionDue,
      cadenceExitDate: null,
      cadenceExitReason: null,
      isCompleted: false,
    }
  }

  // Check if this is the last step
  const nextStepNumber = currentStep + 1
  const nextStep = steps.find(s => s.stepNumber === nextStepNumber)

  if (!nextStep) {
    // Cadence completed
    return {
      cadenceState: 'COMPLETED_NO_CONTACT',
      cadenceStep: currentStep,
      nextActionType: null,
      nextActionDue: null,
      cadenceExitDate: new Date(),
      cadenceExitReason: 'COMPLETED',
      isCompleted: true,
    }
  }

  // Calculate next action due date
  let nextActionDue = new Date(cadenceStartDate)
  nextActionDue.setDate(nextActionDue.getDate() + nextStep.dayOffset)

  // If next action due is in the past, set to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  if (nextActionDue < tomorrow) {
    nextActionDue = tomorrow
  }

  return {
    cadenceState: 'ACTIVE',
    cadenceStep: nextStepNumber,
    nextActionType: nextStep.actionType,
    nextActionDue,
    cadenceExitDate: null,
    cadenceExitReason: null,
    isCompleted: false,
  }
}

// ==========================================
// CADENCE EXIT
// ==========================================

export interface ExitResult {
  cadenceState: CadenceState
  cadenceExitDate: Date
  cadenceExitReason: string
  reEnrollmentDate: Date | null
}

export function exitCadence(
  newState: CadenceState,
  temperatureBand: TemperatureBand,
  priorityScore: number,
  enrollmentCount: number
): ExitResult {
  const exitReason = getExitReasonFromState(newState) || 'MANUAL'
  const exitDate = new Date()

  // Calculate re-enrollment date if eligible
  let reEnrollmentDate: Date | null = null
  
  if (canReEnroll(newState) && newState === 'COMPLETED_NO_CONTACT') {
    // Check if max cycles reached
    if (enrollmentCount >= 6) {
      return {
        cadenceState: 'LONG_TERM_NURTURE',
        cadenceExitDate: exitDate,
        cadenceExitReason: exitReason,
        reEnrollmentDate: null,
      }
    }

    // Calculate re-enrollment wait
    const baseWait = RE_ENROLLMENT_BASE_WAIT[temperatureBand]
    
    // Find score multiplier
    let multiplier = 1.0
    for (const range of RE_ENROLLMENT_SCORE_MULTIPLIERS) {
      if (priorityScore >= range.min && priorityScore <= range.max) {
        multiplier = range.multiplier
        break
      }
    }

    // Apply cycle penalty for 4-5 cycles
    if (enrollmentCount >= 4 && enrollmentCount <= 5) {
      multiplier *= 1.5
    }

    const waitDays = Math.round(baseWait * multiplier)
    reEnrollmentDate = new Date(exitDate)
    reEnrollmentDate.setDate(reEnrollmentDate.getDate() + waitDays)
  }

  return {
    cadenceState: newState,
    cadenceExitDate: exitDate,
    cadenceExitReason: exitReason,
    reEnrollmentDate,
  }
}

// ==========================================
// SNOOZE HANDLING
// ==========================================

export interface SnoozeResult {
  cadenceState: CadenceState
  snoozedUntil: Date
}

export function snoozeRecord(days: number): SnoozeResult {
  const snoozedUntil = new Date()
  snoozedUntil.setDate(snoozedUntil.getDate() + days)
  snoozedUntil.setHours(9, 0, 0, 0) // Snooze until 9 AM

  return {
    cadenceState: 'SNOOZED',
    snoozedUntil,
  }
}

export function unsnoozeRecord(
  cadenceType: CadenceType,
  cadenceStep: number,
  cadenceStartDate: Date
): { cadenceState: CadenceState; nextActionDue: Date; nextActionType: ActionType } {
  const steps = CADENCE_TEMPLATES[cadenceType]
  const currentStep = steps.find(s => s.stepNumber === cadenceStep)
  
  if (!currentStep) {
    // Default to first step if invalid
    const firstStep = steps[0]
    return {
      cadenceState: 'ACTIVE',
      nextActionDue: new Date(),
      nextActionType: firstStep.actionType,
    }
  }

  return {
    cadenceState: 'ACTIVE',
    nextActionDue: new Date(), // Due today after unsnooze
    nextActionType: currentStep.actionType,
  }
}

// ==========================================
// PAUSE HANDLING
// ==========================================

export interface PauseResult {
  cadenceState: CadenceState
  pausedReason: string
  pausedUntil: Date | null
}

export function pauseRecord(reason: string, untilDate?: Date): PauseResult {
  return {
    cadenceState: 'PAUSED',
    pausedReason: reason,
    pausedUntil: untilDate || null,
  }
}

export function resumeRecord(
  cadenceType: CadenceType,
  cadenceStep: number
): { cadenceState: CadenceState; nextActionDue: Date; nextActionType: ActionType } {
  const steps = CADENCE_TEMPLATES[cadenceType]
  const currentStep = steps.find(s => s.stepNumber === cadenceStep)
  
  if (!currentStep) {
    const firstStep = steps[0]
    return {
      cadenceState: 'ACTIVE',
      nextActionDue: new Date(),
      nextActionType: firstStep.actionType,
    }
  }

  return {
    cadenceState: 'ACTIVE',
    nextActionDue: new Date(), // Due today after resume
    nextActionType: currentStep.actionType,
  }
}

// ==========================================
// CALLBACK OVERRIDE
// ==========================================

export interface CallbackOverrideResult {
  temperatureBand: TemperatureBand
  cadenceType: CadenceType
  nextActionDue: Date
  nextActionType: ActionType
  callbackRequestedAt: Date
  callbackScheduledFor: Date | null
}

export function applyCallbackOverride(scheduledTime?: Date): CallbackOverrideResult {
  const now = new Date()
  
  return {
    temperatureBand: 'HOT',
    cadenceType: 'HOT',
    nextActionDue: scheduledTime || now,
    nextActionType: 'CALL',
    callbackRequestedAt: now,
    callbackScheduledFor: scheduledTime || null,
  }
}

// ==========================================
// GET CURRENT STEP INFO
// ==========================================

export function getCurrentStepInfo(cadenceType: CadenceType, stepNumber: number): CadenceStepDef | null {
  const steps = CADENCE_TEMPLATES[cadenceType]
  return steps.find(s => s.stepNumber === stepNumber) || null
}

export function getTotalSteps(cadenceType: CadenceType): number {
  return CADENCE_TEMPLATES[cadenceType].length
}

export function getCadenceTotalDays(cadenceType: CadenceType): number {
  const steps = CADENCE_TEMPLATES[cadenceType]
  return Math.max(...steps.map(s => s.dayOffset))
}
