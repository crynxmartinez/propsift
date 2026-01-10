/**
 * LCE v2.3.1 Workability Gate
 * Lead Cadence Engine - Workability & Comms Availability Checks
 * 
 * This module handles workability validation, comms availability,
 * and blocking rules as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  PhoneStatus,
} from './types'

import {
  STATE_PROPERTIES,
} from './state-machine'

// ==========================================
// WORKABILITY CHECK RESULT
// ==========================================

export interface WorkabilityResult {
  isWorkable: boolean
  blockers: string[]
  warnings: string[]
}

// ==========================================
// WORKABILITY GATE
// ==========================================

export function checkWorkability(record: {
  cadenceState: CadenceState
  statusName?: string | null
  hasDncPhone: boolean
  allPhonesDnc: boolean
  hasValidPhone: boolean
  isDeleted?: boolean
}): WorkabilityResult {
  const blockers: string[] = []
  const warnings: string[] = []

  // Check if deleted
  if (record.isDeleted) {
    blockers.push('Record is deleted')
  }

  // Check state workability
  const stateProps = STATE_PROPERTIES[record.cadenceState]
  if (!stateProps.isWorkable) {
    blockers.push(`State ${record.cadenceState} is not workable`)
  }

  // Check for DNC states
  if (record.cadenceState === 'EXITED_DNC') {
    blockers.push('DNC requested')
  }

  if (record.cadenceState === 'EXITED_DEAD') {
    blockers.push('Marked as dead')
  }

  if (record.cadenceState === 'EXITED_CLOSED') {
    blockers.push('Deal closed or not interested')
  }

  // Check status-based blocks
  const blockedStatuses = ['DNC', 'Dead', 'Not Interested', 'Sold', 'Closed']
  if (record.statusName && blockedStatuses.includes(record.statusName)) {
    blockers.push(`Status "${record.statusName}" blocks workability`)
  }

  // Check phone availability
  if (record.allPhonesDnc) {
    blockers.push('All phones are DNC')
  }

  // Warnings (not blockers)
  if (!record.hasValidPhone) {
    warnings.push('No valid phone numbers')
  }

  if (record.hasDncPhone && !record.allPhonesDnc) {
    warnings.push('Some phones are DNC')
  }

  return {
    isWorkable: blockers.length === 0,
    blockers,
    warnings,
  }
}

// ==========================================
// COMMS AVAILABILITY CHECK
// ==========================================

export interface CommsAvailability {
  canCall: boolean
  canSms: boolean
  canRvm: boolean
  canEmail: boolean
  preferredChannel: string | null
  fallbackChannel: string | null
}

export function checkCommsAvailability(record: {
  hasValidPhone: boolean
  hasMobilePhone: boolean
  hasEmail: boolean
  hasDncPhone: boolean
  allPhonesDnc: boolean
  smsOptOut?: boolean
  emailOptOut?: boolean
}): CommsAvailability {
  const canCall = record.hasValidPhone && !record.allPhonesDnc
  const canSms = record.hasMobilePhone && !record.allPhonesDnc && !record.smsOptOut
  const canRvm = record.hasMobilePhone && !record.allPhonesDnc
  const canEmail = record.hasEmail && !record.emailOptOut

  // Determine preferred channel
  let preferredChannel: string | null = null
  let fallbackChannel: string | null = null

  if (canCall) {
    preferredChannel = 'CALL'
    if (canSms) fallbackChannel = 'SMS'
    else if (canEmail) fallbackChannel = 'EMAIL'
  } else if (canSms) {
    preferredChannel = 'SMS'
    if (canEmail) fallbackChannel = 'EMAIL'
  } else if (canEmail) {
    preferredChannel = 'EMAIL'
  }

  return {
    canCall,
    canSms,
    canRvm,
    canEmail,
    preferredChannel,
    fallbackChannel,
  }
}

// ==========================================
// ACTION FALLBACK RULES
// ==========================================

export type ActionType = 'CALL' | 'SMS' | 'RVM' | 'EMAIL'

export function getActionFallback(
  requestedAction: ActionType,
  comms: CommsAvailability
): { action: ActionType | null; reason: string } {
  // Check if requested action is available
  switch (requestedAction) {
    case 'CALL':
      if (comms.canCall) return { action: 'CALL', reason: 'Primary action' }
      if (comms.canSms) return { action: 'SMS', reason: 'Fallback: no callable phone' }
      if (comms.canEmail) return { action: 'EMAIL', reason: 'Fallback: no phone' }
      return { action: null, reason: 'No available channels' }

    case 'SMS':
      if (comms.canSms) return { action: 'SMS', reason: 'Primary action' }
      if (comms.canCall) return { action: 'CALL', reason: 'Fallback: no mobile phone' }
      if (comms.canEmail) return { action: 'EMAIL', reason: 'Fallback: no phone' }
      return { action: null, reason: 'No available channels' }

    case 'RVM':
      if (comms.canRvm) return { action: 'RVM', reason: 'Primary action' }
      if (comms.canCall) return { action: 'CALL', reason: 'Fallback: no mobile phone' }
      if (comms.canSms) return { action: 'SMS', reason: 'Fallback: RVM not available' }
      return { action: null, reason: 'No available channels' }

    case 'EMAIL':
      if (comms.canEmail) return { action: 'EMAIL', reason: 'Primary action' }
      if (comms.canCall) return { action: 'CALL', reason: 'Fallback: no email' }
      if (comms.canSms) return { action: 'SMS', reason: 'Fallback: no email' }
      return { action: null, reason: 'No available channels' }

    default:
      return { action: null, reason: 'Unknown action type' }
  }
}

// ==========================================
// QUEUE SECTION ASSIGNMENT
// ==========================================

export type QueueSection = 
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'TASKS_DUE'
  | 'VERIFY_FIRST'
  | 'GET_NUMBERS'
  | 'UPCOMING'
  | 'NOT_WORKABLE'

export interface QueueAssignment {
  section: QueueSection
  priority: number
  reason: string
}

export function assignToQueueSection(record: {
  cadenceState: CadenceState
  nextActionDue: Date | null
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  hasValidPhone: boolean
  hasUnverifiedPhone: boolean
  phoneCount: number
  isWorkable: boolean
}): QueueAssignment {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Not workable
  if (!record.isWorkable) {
    return {
      section: 'NOT_WORKABLE',
      priority: 0,
      reason: 'Record is not workable',
    }
  }

  // Get numbers (no phones)
  if (record.phoneCount === 0) {
    return {
      section: 'GET_NUMBERS',
      priority: 10,
      reason: 'No phone numbers',
    }
  }

  // Verify first (has phones but none verified)
  if (!record.hasValidPhone && record.hasUnverifiedPhone) {
    return {
      section: 'VERIFY_FIRST',
      priority: 20,
      reason: 'Phone numbers need verification',
    }
  }

  // Tasks due (overdue or today)
  if (record.hasOverdueTask) {
    return {
      section: 'TASKS_DUE',
      priority: 100,
      reason: 'Overdue task',
    }
  }

  if (record.hasDueTodayTask) {
    return {
      section: 'TASKS_DUE',
      priority: 90,
      reason: 'Task due today',
    }
  }

  // Check cadence action due
  if (record.nextActionDue && record.cadenceState === 'ACTIVE') {
    const dueDate = new Date(record.nextActionDue)
    
    // Overdue
    if (dueDate < today) {
      return {
        section: 'OVERDUE',
        priority: 95,
        reason: 'Cadence action overdue',
      }
    }

    // Due today
    if (dueDate < tomorrow) {
      return {
        section: 'DUE_TODAY',
        priority: 80,
        reason: 'Cadence action due today',
      }
    }

    // Upcoming
    return {
      section: 'UPCOMING',
      priority: 50,
      reason: 'Cadence action upcoming',
    }
  }

  // Default to upcoming if active but no due date
  if (record.cadenceState === 'ACTIVE') {
    return {
      section: 'DUE_TODAY',
      priority: 70,
      reason: 'Active in cadence',
    }
  }

  // Not in queue (snoozed, paused, etc.)
  return {
    section: 'UPCOMING',
    priority: 0,
    reason: 'Not currently in active queue',
  }
}

// ==========================================
// QUEUE SECTION DISPLAY INFO
// ==========================================

export const QUEUE_SECTION_INFO: Record<QueueSection, { label: string; color: string; order: number }> = {
  OVERDUE: { label: 'Overdue', color: 'red', order: 1 },
  DUE_TODAY: { label: 'Due Today', color: 'orange', order: 2 },
  TASKS_DUE: { label: 'Tasks Due', color: 'yellow', order: 3 },
  VERIFY_FIRST: { label: 'Verify First', color: 'blue', order: 4 },
  GET_NUMBERS: { label: 'Get Numbers', color: 'purple', order: 5 },
  UPCOMING: { label: 'Upcoming', color: 'gray', order: 6 },
  NOT_WORKABLE: { label: 'Not Workable', color: 'gray', order: 99 },
}
