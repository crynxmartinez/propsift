/**
 * LCE v2.3.1 Re-Enrollment Engine
 * Lead Cadence Engine - Re-Enrollment Management
 * 
 * This module handles re-enrollment timing, eligibility checks,
 * and wake-up rules as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  TemperatureBand,
  RE_ENROLLMENT_BASE_WAIT,
  RE_ENROLLMENT_SCORE_MULTIPLIERS,
} from './types'

import {
  canReEnroll,
  NEVER_RE_ENROLL_STATES,
} from './state-machine'

import {
  enrollInCadence,
} from './cadence'

// ==========================================
// RE-ENROLLMENT ELIGIBILITY
// ==========================================

export interface ReEnrollmentEligibility {
  isEligible: boolean
  reason: string
  daysUntilEligible: number | null
}

export function checkReEnrollmentEligibility(
  cadenceState: CadenceState,
  reEnrollmentDate: Date | null,
  enrollmentCount: number,
  hasValidPhone: boolean,
  isWorkable: boolean
): ReEnrollmentEligibility {
  // Check if state allows re-enrollment
  if (!canReEnroll(cadenceState)) {
    return {
      isEligible: false,
      reason: `State ${cadenceState} does not allow re-enrollment`,
      daysUntilEligible: null,
    }
  }

  // Must be in COMPLETED_NO_CONTACT or STALE_ENGAGED
  if (cadenceState !== 'COMPLETED_NO_CONTACT' && cadenceState !== 'STALE_ENGAGED') {
    return {
      isEligible: false,
      reason: 'Not in a re-enrollable state',
      daysUntilEligible: null,
    }
  }

  // Check if workable
  if (!isWorkable) {
    return {
      isEligible: false,
      reason: 'Record is not workable',
      daysUntilEligible: null,
    }
  }

  // Check if has valid phone
  if (!hasValidPhone) {
    return {
      isEligible: false,
      reason: 'No valid phone numbers',
      daysUntilEligible: null,
    }
  }

  // Check enrollment count limit
  if (enrollmentCount >= 6) {
    return {
      isEligible: false,
      reason: 'Maximum enrollment cycles reached (6+)',
      daysUntilEligible: null,
    }
  }

  // Check if re-enrollment date has passed
  if (!reEnrollmentDate) {
    return {
      isEligible: false,
      reason: 'No re-enrollment date set',
      daysUntilEligible: null,
    }
  }

  const now = new Date()
  if (reEnrollmentDate > now) {
    const daysUntil = Math.ceil((reEnrollmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      isEligible: false,
      reason: `Re-enrollment date not yet reached (${daysUntil} days remaining)`,
      daysUntilEligible: daysUntil,
    }
  }

  return {
    isEligible: true,
    reason: 'Eligible for re-enrollment',
    daysUntilEligible: 0,
  }
}

// ==========================================
// CALCULATE RE-ENROLLMENT DATE
// ==========================================

export function calculateReEnrollmentDate(
  exitDate: Date,
  temperatureBand: TemperatureBand,
  priorityScore: number,
  enrollmentCount: number
): Date {
  // Get base wait
  const baseWait = RE_ENROLLMENT_BASE_WAIT[temperatureBand]

  // Find score multiplier
  let scoreMultiplier = 1.0
  for (const range of RE_ENROLLMENT_SCORE_MULTIPLIERS) {
    if (priorityScore >= range.min && priorityScore <= range.max) {
      scoreMultiplier = range.multiplier
      break
    }
  }

  // Apply cycle penalty for 4-5 cycles
  let cycleMultiplier = 1.0
  if (enrollmentCount >= 4 && enrollmentCount <= 5) {
    cycleMultiplier = 1.5
  }

  // Calculate final wait days
  const waitDays = Math.round(baseWait * scoreMultiplier * cycleMultiplier)

  // Calculate re-enrollment date
  const reEnrollmentDate = new Date(exitDate)
  reEnrollmentDate.setDate(reEnrollmentDate.getDate() + waitDays)

  return reEnrollmentDate
}

// ==========================================
// RE-ENROLLMENT EXECUTION
// ==========================================

export interface ReEnrollmentResult {
  success: boolean
  cadenceState: CadenceState
  cadenceType: string | null
  cadenceStep: number
  cadenceStartDate: Date | null
  nextActionType: string | null
  nextActionDue: Date | null
  enrollmentCount: number
  error: string | null
}

export function executeReEnrollment(
  currentState: CadenceState,
  temperatureBand: TemperatureBand,
  currentEnrollmentCount: number,
  isStaleEngaged: boolean = false
): ReEnrollmentResult {
  // Check if max cycles reached
  if (currentEnrollmentCount >= 6) {
    return {
      success: false,
      cadenceState: 'LONG_TERM_NURTURE',
      cadenceType: 'ANNUAL',
      cadenceStep: 0,
      cadenceStartDate: null,
      nextActionType: null,
      nextActionDue: null,
      enrollmentCount: currentEnrollmentCount,
      error: 'Maximum enrollment cycles reached - moved to long-term nurture',
    }
  }

  // Enroll in appropriate cadence
  const enrollment = enrollInCadence(
    temperatureBand,
    currentEnrollmentCount,
    isStaleEngaged // Use GENTLE cadence for stale engaged
  )

  return {
    success: true,
    cadenceState: enrollment.cadenceState,
    cadenceType: enrollment.cadenceType,
    cadenceStep: enrollment.cadenceStep,
    cadenceStartDate: enrollment.cadenceStartDate,
    nextActionType: enrollment.nextActionType,
    nextActionDue: enrollment.nextActionDue,
    enrollmentCount: enrollment.enrollmentCount,
    error: null,
  }
}

// ==========================================
// STALE ENGAGED CHECK
// ==========================================

export function isStaleEngaged(
  cadenceState: CadenceState,
  lastActivityAt: Date | null,
  staleDays: number = 21
): boolean {
  if (cadenceState !== 'EXITED_ENGAGED') {
    return false
  }

  if (!lastActivityAt) {
    return true // No activity = stale
  }

  const now = new Date()
  const daysSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceActivity >= staleDays
}

// ==========================================
// WAKE-UP RULES
// ==========================================

export interface WakeUpCheck {
  shouldWakeUp: boolean
  reason: string | null
}

export function checkWakeUpEligibility(
  cadenceState: CadenceState,
  hasCriticalMotivation: boolean,
  hasCallbackRequested: boolean,
  manualTemperatureOverride: boolean
): WakeUpCheck {
  // Only applies to LONG_TERM_NURTURE
  if (cadenceState !== 'LONG_TERM_NURTURE') {
    return {
      shouldWakeUp: false,
      reason: null,
    }
  }

  if (hasCriticalMotivation) {
    return {
      shouldWakeUp: true,
      reason: 'Critical motivation added',
    }
  }

  if (hasCallbackRequested) {
    return {
      shouldWakeUp: true,
      reason: 'Callback requested',
    }
  }

  if (manualTemperatureOverride) {
    return {
      shouldWakeUp: true,
      reason: 'Manual temperature override',
    }
  }

  return {
    shouldWakeUp: false,
    reason: null,
  }
}

// ==========================================
// GET RE-ENROLLMENT SUMMARY
// ==========================================

export interface ReEnrollmentSummary {
  state: CadenceState
  enrollmentCount: number
  reEnrollmentDate: Date | null
  daysUntilReEnrollment: number | null
  isEligibleNow: boolean
  canEverReEnroll: boolean
  nextAction: string
}

export function getReEnrollmentSummary(
  cadenceState: CadenceState,
  enrollmentCount: number,
  reEnrollmentDate: Date | null,
  hasValidPhone: boolean,
  isWorkable: boolean
): ReEnrollmentSummary {
  const eligibility = checkReEnrollmentEligibility(
    cadenceState,
    reEnrollmentDate,
    enrollmentCount,
    hasValidPhone,
    isWorkable
  )

  let nextAction = 'N/A'
  if (eligibility.isEligible) {
    nextAction = 'Ready for re-enrollment'
  } else if (eligibility.daysUntilEligible !== null && eligibility.daysUntilEligible > 0) {
    nextAction = `Wait ${eligibility.daysUntilEligible} days`
  } else if (!hasValidPhone) {
    nextAction = 'Get phone numbers'
  } else if (!isWorkable) {
    nextAction = 'Not workable'
  } else if (enrollmentCount >= 6) {
    nextAction = 'Annual check only'
  }

  return {
    state: cadenceState,
    enrollmentCount,
    reEnrollmentDate,
    daysUntilReEnrollment: eligibility.daysUntilEligible,
    isEligibleNow: eligibility.isEligible,
    canEverReEnroll: canReEnroll(cadenceState) && enrollmentCount < 6,
    nextAction,
  }
}

// ==========================================
// BATCH RE-ENROLLMENT CHECK
// ==========================================

export interface RecordForReEnrollment {
  id: string
  cadenceState: CadenceState
  reEnrollmentDate: Date | null
  enrollmentCount: number
  hasValidPhone: boolean
  isWorkable: boolean
  temperatureBand: TemperatureBand
  priorityScore: number
}

export function getRecordsReadyForReEnrollment(
  records: RecordForReEnrollment[]
): RecordForReEnrollment[] {
  const now = new Date()
  
  return records.filter(record => {
    // Must be in re-enrollable state
    if (record.cadenceState !== 'COMPLETED_NO_CONTACT' && record.cadenceState !== 'STALE_ENGAGED') {
      return false
    }

    // Must be workable
    if (!record.isWorkable) {
      return false
    }

    // Must have valid phone
    if (!record.hasValidPhone) {
      return false
    }

    // Must not exceed max cycles
    if (record.enrollmentCount >= 6) {
      return false
    }

    // Re-enrollment date must have passed
    if (!record.reEnrollmentDate || record.reEnrollmentDate > now) {
      return false
    }

    return true
  })
}
