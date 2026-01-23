/**
 * LCE v4.0 Engine
 * Lead Cadence Engine - Main Entry Point
 * 
 * This is the unified engine that combines:
 * - v2.3.1 Temperature Cadences
 * - v3.0 First-to-Market Blitz Phases
 * - v2.4 Result Type Handler
 * 
 * All actions flow through this engine.
 */

import type {
  CadencePhase,
  CadenceState,
  CadenceType,
  TemperatureBand,
  ActionType,
  CallOutcome,
  QueueTier,
  LCERecord,
  LCEStatus,
  PhoneData,
  ActionResult,
} from './types'

import {
  LCE_VERSION,
  MAX_ENROLLMENT_CYCLES,
  STALE_ENGAGED_DAYS,
  RE_ENROLLMENT_BASE_WAIT,
  RE_ENROLLMENT_SCORE_MULTIPLIERS,
  NEVER_RE_ENROLL_STATES,
} from './types'

import { CADENCE_TEMPLATES } from './constants'

import {
  enrollNewLead,
  calculatePhaseTransition,
  handleNewPhoneAdded,
  reEnrollIntoTemperature,
  getTotalSteps,
  getCadenceProgress,
} from './phase-manager'

import {
  assignQueueTier,
} from './queue-manager'

import {
  getNextPhoneToCall,
  getPhoneSummary,
  updatePhoneAfterCall,
  shouldMarkPhoneExhausted,
} from './phone-manager'

import {
  processCallResult,
  mapCallResultToOutcome,
  calculateNewEngagementScore,
  calculateNewNoResponseStreak,
} from './result-handler'

// ==========================================
// MAIN ACTION PROCESSOR
// ==========================================

export type ActionType_Input = 'call' | 'skip' | 'snooze' | 'pause' | 'resume' | 'complete'

export interface ProcessActionInput {
  record: LCERecord
  action: ActionType_Input
  phones: PhoneData[]
  // For 'call' action
  callResultName?: string
  phoneId?: string
  callbackDate?: Date
  // For 'snooze' action
  snoozeHours?: number
  // For 'pause' action
  pauseReason?: string
  // Notes
  notes?: string
}

export interface ProcessActionOutput {
  success: boolean
  recordUpdates: Partial<LCERecord>
  phoneUpdate?: {
    phoneId: string
    updates: Record<string, unknown>
    shouldRotate: boolean
    nextPhoneId: string | null
  }
  queueAssignment: {
    tier: QueueTier
    bucket: string
    reason: string
  }
  message: string
  error?: string
}

export function processAction(input: ProcessActionInput): ProcessActionOutput {
  const { record, action, phones } = input

  switch (action) {
    case 'call':
      return handleCall(input)
    case 'skip':
      return handleSkip(record, phones)
    case 'snooze':
      return handleSnooze(record, phones, input.snoozeHours || 24)
    case 'pause':
      return handlePause(record, phones, input.pauseReason)
    case 'resume':
      return handleResume(record, phones)
    case 'complete':
      return handleComplete(record, phones)
    default:
      return {
        success: false,
        recordUpdates: {},
        queueAssignment: { tier: 9, bucket: 'nurture', reason: 'Unknown action' },
        message: 'Unknown action',
        error: `Unknown action: ${action}`,
      }
  }
}

// ==========================================
// HANDLE CALL
// ==========================================

function handleCall(input: ProcessActionInput): ProcessActionOutput {
  const { record, phones, callResultName, phoneId, callbackDate } = input

  if (!callResultName) {
    return {
      success: false,
      recordUpdates: {},
      queueAssignment: assignQueueTier(record),
      message: 'Call result name is required',
      error: 'Missing callResultName',
    }
  }

  if (!phoneId) {
    return {
      success: false,
      recordUpdates: {},
      queueAssignment: assignQueueTier(record),
      message: 'Phone ID is required',
      error: 'Missing phoneId',
    }
  }

  // Process the call result
  const result = processCallResult({
    record,
    callResultName,
    phoneId,
    phones,
    callbackDate,
  })

  // Calculate new engagement score
  const newEngagementScore = calculateNewEngagementScore(
    (record as any).engagementScore || 0,
    result.outcome
  )

  // Calculate new no-response streak
  const newNoResponseStreak = calculateNewNoResponseStreak(
    record.noResponseStreak || 0,
    result.outcome
  )

  // Merge updates
  const recordUpdates: Partial<LCERecord> = {
    ...result.recordUpdates,
    noResponseStreak: newNoResponseStreak,
  }

  // Update cadence progress
  if (recordUpdates.cadenceStep && recordUpdates.cadenceType) {
    recordUpdates.cadenceProgress = getCadenceProgress(recordUpdates.cadenceStep, recordUpdates.cadenceType)
  }

  // Calculate new queue assignment
  const updatedRecord = { ...record, ...recordUpdates }
  const queueAssignment = assignQueueTier({
    ...updatedRecord,
    hasValidPhone: !result.phoneExhausted,
    phoneCount: phones.length,
  })

  // Update queue tier
  recordUpdates.queueTier = queueAssignment.tier

  return {
    success: true,
    recordUpdates,
    phoneUpdate: result.phoneUpdate ? {
      phoneId: result.phoneUpdate.phoneId,
      updates: result.phoneUpdate.updates,
      shouldRotate: result.phoneUpdate.shouldRotate,
      nextPhoneId: result.phoneUpdate.nextPhoneId,
    } : undefined,
    queueAssignment,
    message: result.reason,
  }
}

// ==========================================
// HANDLE SKIP
// ==========================================

function handleSkip(record: LCERecord, phones: PhoneData[]): ProcessActionOutput {
  // Skip doesn't change cadence state, just moves to next record
  const queueAssignment = assignQueueTier({
    ...record,
    hasValidPhone: phones.some(p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'),
    phoneCount: phones.length,
  })

  return {
    success: true,
    recordUpdates: {},
    queueAssignment,
    message: 'Record skipped',
  }
}

// ==========================================
// HANDLE SNOOZE
// ==========================================

function handleSnooze(record: LCERecord, phones: PhoneData[], hours: number): ProcessActionOutput {
  const snoozedUntil = new Date()
  snoozedUntil.setHours(snoozedUntil.getHours() + hours)

  // If snoozing for more than a day, set to 9 AM
  if (hours >= 24) {
    snoozedUntil.setHours(9, 0, 0, 0)
  }

  const recordUpdates: Partial<LCERecord> = {
    cadenceState: 'SNOOZED',
    snoozedUntil,
  }

  // Snoozed records go to tier 9
  const queueAssignment = {
    tier: 9 as QueueTier,
    bucket: 'nurture',
    reason: `Snoozed until ${snoozedUntil.toLocaleDateString()}`,
  }

  recordUpdates.queueTier = queueAssignment.tier

  return {
    success: true,
    recordUpdates,
    queueAssignment,
    message: `Snoozed for ${hours} hours until ${snoozedUntil.toLocaleString()}`,
  }
}

// ==========================================
// HANDLE PAUSE
// ==========================================

function handlePause(record: LCERecord, phones: PhoneData[], reason?: string): ProcessActionOutput {
  const recordUpdates: Partial<LCERecord> = {
    cadenceState: 'PAUSED',
    pausedReason: reason || 'Manual pause',
  }

  // Paused records go to tier 9
  const queueAssignment = {
    tier: 9 as QueueTier,
    bucket: 'nurture',
    reason: 'Paused',
  }

  recordUpdates.queueTier = queueAssignment.tier

  return {
    success: true,
    recordUpdates,
    queueAssignment,
    message: `Paused: ${reason || 'Manual pause'}`,
  }
}

// ==========================================
// HANDLE RESUME
// ==========================================

function handleResume(record: LCERecord, phones: PhoneData[]): ProcessActionOutput {
  const now = new Date()
  now.setHours(9, 0, 0, 0)

  const recordUpdates: Partial<LCERecord> = {
    cadenceState: 'ACTIVE',
    snoozedUntil: null,
    pausedReason: null,
    nextActionDue: now,
  }

  // Calculate new queue assignment
  const updatedRecord = { ...record, ...recordUpdates }
  const queueAssignment = assignQueueTier({
    ...updatedRecord,
    hasValidPhone: phones.some(p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'),
    phoneCount: phones.length,
  })

  recordUpdates.queueTier = queueAssignment.tier

  return {
    success: true,
    recordUpdates,
    queueAssignment,
    message: 'Resumed - ready for action',
  }
}

// ==========================================
// HANDLE COMPLETE
// ==========================================

function handleComplete(record: LCERecord, phones: PhoneData[]): ProcessActionOutput {
  const recordUpdates: Partial<LCERecord> = {
    cadencePhase: 'ENGAGED',
    cadenceState: 'EXITED_ENGAGED',
    nextActionDue: null,
    nextActionType: null,
  }

  // Completed records go to tier 9
  const queueAssignment = {
    tier: 9 as QueueTier,
    bucket: 'nurture',
    reason: 'Completed - engaged',
  }

  recordUpdates.queueTier = queueAssignment.tier

  return {
    success: true,
    recordUpdates,
    queueAssignment,
    message: 'Marked as engaged',
  }
}

// ==========================================
// ENROLLMENT
// ==========================================

export function enrollRecord(
  hasValidPhone: boolean,
  temperatureBand: TemperatureBand = 'WARM'
): Partial<LCERecord> {
  const enrollment = enrollNewLead(hasValidPhone)

  const now = new Date()

  return {
    cadencePhase: enrollment.phase,
    cadenceState: enrollment.state,
    cadenceType: enrollment.cadenceType,
    cadenceStep: enrollment.cadenceStep,
    cadenceStartDate: now,
    cadenceProgress: getCadenceProgress(enrollment.cadenceStep, enrollment.cadenceType),
    nextActionDue: enrollment.nextActionDue,
    nextActionType: enrollment.nextActionType,
    blitzAttempts: enrollment.blitzAttempts,
    blitzStartedAt: enrollment.phase === 'BLITZ_1' ? now : null,
    enrollmentCount: 1,
    queueTier: hasValidPhone ? 2 : 8, // New leads = tier 2, no phone = tier 8
  }
}

// ==========================================
// RE-ENROLLMENT
// ==========================================

export function reEnrollRecord(
  record: Pick<LCERecord, 'temperatureBand' | 'enrollmentCount' | 'cadenceState'>,
  isStaleEngaged: boolean = false
): Partial<LCERecord> | null {
  // Check if can re-enroll
  if (NEVER_RE_ENROLL_STATES.includes(record.cadenceState)) {
    return null
  }

  if (record.enrollmentCount >= MAX_ENROLLMENT_CYCLES) {
    // Move to long-term nurture
    const sixMonths = new Date()
    sixMonths.setMonth(sixMonths.getMonth() + 6)

    return {
      cadencePhase: 'NURTURE',
      cadenceState: 'LONG_TERM_NURTURE',
      cadenceType: 'ANNUAL',
      cadenceStep: 0,
      nextActionDue: sixMonths,
      nextActionType: 'CALL',
      queueTier: 9,
    }
  }

  const enrollment = reEnrollIntoTemperature(
    record.temperatureBand,
    record.enrollmentCount,
    isStaleEngaged
  )

  const now = new Date()

  return {
    cadencePhase: enrollment.phase,
    cadenceState: enrollment.state,
    cadenceType: enrollment.cadenceType,
    cadenceStep: enrollment.cadenceStep,
    cadenceStartDate: now,
    cadenceProgress: getCadenceProgress(enrollment.cadenceStep, enrollment.cadenceType),
    nextActionDue: enrollment.nextActionDue,
    nextActionType: enrollment.nextActionType,
    blitzAttempts: 0,
    temperatureStartedAt: now,
    enrollmentCount: record.enrollmentCount + 1,
    reEnrollmentDate: null,
    queueTier: 5, // Cadence due = tier 5
  }
}

// ==========================================
// HANDLE NEW PHONE ADDED
// ==========================================

export function handlePhoneAdded(
  record: Pick<LCERecord, 'cadencePhase' | 'cadenceState'>
): Partial<LCERecord> {
  const enrollment = handleNewPhoneAdded(record.cadencePhase)

  const now = new Date()

  return {
    cadencePhase: enrollment.phase,
    cadenceState: enrollment.state,
    cadenceType: enrollment.cadenceType,
    cadenceStep: enrollment.cadenceStep,
    cadenceProgress: getCadenceProgress(enrollment.cadenceStep, enrollment.cadenceType),
    nextActionDue: enrollment.nextActionDue,
    nextActionType: enrollment.nextActionType,
    blitzAttempts: 0,
    blitzStartedAt: enrollment.phase === 'BLITZ_2' ? now : undefined,
    phoneExhaustedAt: null, // Clear exhaustion
    queueTier: 3, // Blitz = tier 3
  }
}

// ==========================================
// GET LCE STATUS
// ==========================================

export function getRecordLCEStatus(
  record: LCERecord,
  phones: PhoneData[]
): LCEStatus {
  const phoneSummary = getPhoneSummary(phones, record.lastPhoneCalledId)
  const totalSteps = record.cadenceType ? getTotalSteps(record.cadenceType) : 0

  // Calculate days until re-enrollment
  let daysUntilReEnrollment: number | null = null
  if (record.reEnrollmentDate) {
    const now = new Date()
    const diff = record.reEnrollmentDate.getTime() - now.getTime()
    daysUntilReEnrollment = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (daysUntilReEnrollment < 0) daysUntilReEnrollment = 0
  }

  const queueAssignment = assignQueueTier({
    ...record,
    hasValidPhone: phoneSummary.hasValidPhone,
    phoneCount: phones.length,
  })

  return {
    recordId: record.id,
    phase: record.cadencePhase,
    state: record.cadenceState,
    cadenceType: record.cadenceType,
    step: record.cadenceStep,
    totalSteps,
    progress: record.cadenceProgress || getCadenceProgress(record.cadenceStep, record.cadenceType),
    nextActionDue: record.nextActionDue,
    nextActionType: record.nextActionType,
    enrollmentCount: record.enrollmentCount,
    maxEnrollments: MAX_ENROLLMENT_CYCLES,
    reEnrollmentDate: record.reEnrollmentDate,
    daysUntilReEnrollment,
    phones: {
      total: phoneSummary.total,
      valid: phoneSummary.valid,
      unverified: phoneSummary.unverified,
      exhausted: phoneSummary.exhausted,
      nextToCallId: phoneSummary.nextToCallId,
    },
    queueTier: queueAssignment.tier,
    queueBucket: queueAssignment.bucket,
    queueReason: queueAssignment.reason,
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

  const waitDays = Math.round(baseWait * scoreMultiplier * cycleMultiplier)

  const reEnrollmentDate = new Date(exitDate)
  reEnrollmentDate.setDate(reEnrollmentDate.getDate() + waitDays)

  return reEnrollmentDate
}

// ==========================================
// CHECK STALE ENGAGED
// ==========================================

export function isStaleEngaged(
  cadenceState: CadenceState,
  lastActivityAt: Date | null
): boolean {
  if (cadenceState !== 'EXITED_ENGAGED') {
    return false
  }

  if (!lastActivityAt) {
    return true
  }

  const now = new Date()
  const daysSinceActivity = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)

  return daysSinceActivity >= STALE_ENGAGED_DAYS
}

// ==========================================
// EXPORTS
// ==========================================

export { LCE_VERSION }
