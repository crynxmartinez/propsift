/**
 * LCE v2.3.1 State Machine
 * Lead Cadence Engine - Cadence State Management
 * 
 * This module implements the state machine for cadence tracking
 * as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  CadenceType,
  TemperatureBand,
  CallOutcome,
} from './types'

// ==========================================
// STATE TRANSITION RULES
// ==========================================

export interface StateTransition {
  from: CadenceState
  to: CadenceState
  trigger: string
  requiresData?: string[]
}

export const VALID_TRANSITIONS: StateTransition[] = [
  // From NOT_ENROLLED
  { from: 'NOT_ENROLLED', to: 'ACTIVE', trigger: 'valid_phone_added' },
  
  // From ACTIVE
  { from: 'ACTIVE', to: 'SNOOZED', trigger: 'user_snooze', requiresData: ['snoozedUntil'] },
  { from: 'ACTIVE', to: 'PAUSED', trigger: 'user_pause', requiresData: ['pausedReason'] },
  { from: 'ACTIVE', to: 'EXITED_ENGAGED', trigger: 'answered_engaged' },
  { from: 'ACTIVE', to: 'EXITED_DNC', trigger: 'dnc_requested' },
  { from: 'ACTIVE', to: 'EXITED_DEAD', trigger: 'marked_dead' },
  { from: 'ACTIVE', to: 'EXITED_CLOSED', trigger: 'deal_closed' },
  { from: 'ACTIVE', to: 'COMPLETED_NO_CONTACT', trigger: 'cadence_completed' },
  
  // From SNOOZED
  { from: 'SNOOZED', to: 'ACTIVE', trigger: 'snooze_expired' },
  { from: 'SNOOZED', to: 'ACTIVE', trigger: 'user_unsnooze' },
  
  // From PAUSED
  { from: 'PAUSED', to: 'ACTIVE', trigger: 'user_resume' },
  
  // From EXITED_ENGAGED
  { from: 'EXITED_ENGAGED', to: 'STALE_ENGAGED', trigger: 'stale_21_days' },
  
  // From STALE_ENGAGED
  { from: 'STALE_ENGAGED', to: 'ACTIVE', trigger: 're_engagement' },
  
  // From COMPLETED_NO_CONTACT
  { from: 'COMPLETED_NO_CONTACT', to: 'ACTIVE', trigger: 're_enrollment' },
  { from: 'COMPLETED_NO_CONTACT', to: 'LONG_TERM_NURTURE', trigger: 'max_cycles_reached' },
  
  // From LONG_TERM_NURTURE
  { from: 'LONG_TERM_NURTURE', to: 'ACTIVE', trigger: 'wake_up' },
]

// ==========================================
// STATE VALIDATION
// ==========================================

export function isValidTransition(from: CadenceState, to: CadenceState): boolean {
  return VALID_TRANSITIONS.some(t => t.from === from && t.to === to)
}

export function getValidTransitionsFrom(state: CadenceState): CadenceState[] {
  return VALID_TRANSITIONS
    .filter(t => t.from === state)
    .map(t => t.to)
}

// ==========================================
// STATE PROPERTIES
// ==========================================

export interface StateProperties {
  isWorkable: boolean
  showsInQueue: boolean
  canAdvanceCadence: boolean
  canReceiveActions: boolean
}

export const STATE_PROPERTIES: Record<CadenceState, StateProperties> = {
  NOT_ENROLLED: {
    isWorkable: true,
    showsInQueue: false, // Shows in "Get Numbers" if no phone
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  ACTIVE: {
    isWorkable: true,
    showsInQueue: true,
    canAdvanceCadence: true,
    canReceiveActions: true,
  },
  SNOOZED: {
    isWorkable: true,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  PAUSED: {
    isWorkable: true,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  COMPLETED_NO_CONTACT: {
    isWorkable: true,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  EXITED_ENGAGED: {
    isWorkable: true,
    showsInQueue: false, // Handled via tasks
    canAdvanceCadence: false,
    canReceiveActions: true,
  },
  EXITED_DNC: {
    isWorkable: false,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  EXITED_DEAD: {
    isWorkable: false,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  EXITED_CLOSED: {
    isWorkable: false,
    showsInQueue: false,
    canAdvanceCadence: false,
    canReceiveActions: false,
  },
  STALE_ENGAGED: {
    isWorkable: true,
    showsInQueue: false, // Until re-engagement
    canAdvanceCadence: false,
    canReceiveActions: true,
  },
  LONG_TERM_NURTURE: {
    isWorkable: true,
    showsInQueue: false, // Only on annual check
    canAdvanceCadence: true,
    canReceiveActions: true,
  },
}

// ==========================================
// OUTCOME TO STATE MAPPING
// ==========================================

export function getStateFromOutcome(outcome: CallOutcome): CadenceState | null {
  switch (outcome) {
    case 'ANSWERED_INTERESTED':
      return 'EXITED_ENGAGED'
    case 'ANSWERED_NOT_INTERESTED':
      return 'EXITED_CLOSED' // Will be blocked by workability
    case 'DNC':
      return 'EXITED_DNC'
    case 'WRONG_NUMBER':
    case 'DISCONNECTED':
      // These don't change state, they affect phone status
      return null
    default:
      // Other outcomes advance cadence but don't change state
      return null
  }
}

// ==========================================
// CADENCE TYPE FROM TEMPERATURE
// ==========================================

export function getCadenceTypeFromTemperature(band: TemperatureBand): CadenceType {
  switch (band) {
    case 'HOT':
      return 'HOT'
    case 'WARM':
      return 'WARM'
    case 'COLD':
      return 'COLD'
    case 'ICE':
      return 'ICE'
  }
}

// ==========================================
// EXIT REASON MAPPING
// ==========================================

export type CadenceExitReason = 
  | 'COMPLETED'
  | 'ANSWERED'
  | 'DNC'
  | 'DEAD'
  | 'MANUAL'
  | 'CLOSED'

export function getExitReasonFromState(state: CadenceState): CadenceExitReason | null {
  switch (state) {
    case 'COMPLETED_NO_CONTACT':
      return 'COMPLETED'
    case 'EXITED_ENGAGED':
      return 'ANSWERED'
    case 'EXITED_DNC':
      return 'DNC'
    case 'EXITED_DEAD':
      return 'DEAD'
    case 'EXITED_CLOSED':
      return 'CLOSED'
    default:
      return null
  }
}

// ==========================================
// STATE VALIDATION CHECKS
// ==========================================

export interface StateValidationResult {
  isValid: boolean
  issues: string[]
  fixes: Array<{ field: string; value: unknown }>
}

export function validateState(record: {
  cadenceState: CadenceState
  cadenceType: string | null
  nextActionDue: Date | null
  snoozedUntil: Date | null
  pausedReason: string | null
}): StateValidationResult {
  const issues: string[] = []
  const fixes: Array<{ field: string; value: unknown }> = []

  // ACTIVE must have cadenceType and nextActionDue
  if (record.cadenceState === 'ACTIVE') {
    if (!record.cadenceType) {
      issues.push('ACTIVE state missing cadenceType')
      fixes.push({ field: 'cadenceType', value: 'WARM' }) // Default to WARM
    }
    if (!record.nextActionDue) {
      issues.push('ACTIVE state missing nextActionDue')
      fixes.push({ field: 'nextActionDue', value: new Date() })
    }
  }

  // SNOOZED must have snoozedUntil
  if (record.cadenceState === 'SNOOZED') {
    if (!record.snoozedUntil) {
      issues.push('SNOOZED state missing snoozedUntil')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      fixes.push({ field: 'snoozedUntil', value: tomorrow })
    }
  }

  // PAUSED should have pausedReason
  if (record.cadenceState === 'PAUSED') {
    if (!record.pausedReason) {
      issues.push('PAUSED state missing pausedReason')
      fixes.push({ field: 'pausedReason', value: 'Manual hold' })
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    fixes,
  }
}

// ==========================================
// NEVER RE-ENROLL STATES
// ==========================================

export const NEVER_RE_ENROLL_STATES: CadenceState[] = [
  'EXITED_DNC',
  'EXITED_DEAD',
  'EXITED_CLOSED',
]

export function canReEnroll(state: CadenceState): boolean {
  return !NEVER_RE_ENROLL_STATES.includes(state)
}
