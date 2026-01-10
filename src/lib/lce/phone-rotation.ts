/**
 * LCE v2.3.1 Phone Rotation Module
 * Lead Cadence Engine - Multi-Phone Handling
 * 
 * This module handles phone priority ordering, rotation rules,
 * and status transitions as defined in the LCE v2.3.1 specification.
 */

import {
  PhoneStatus,
  CallOutcome,
} from './types'

// ==========================================
// PHONE DATA INTERFACE
// ==========================================

export interface PhoneData {
  id: string
  number: string
  type: string // MOBILE, LANDLINE, etc.
  phoneStatus: PhoneStatus
  isPrimary: boolean
  attemptCount: number
  lastAttemptAt: Date | null
  lastOutcome: CallOutcome | null
  consecutiveNoAnswer: number
}

// ==========================================
// PHONE PRIORITY ORDERING
// ==========================================

const PHONE_TYPE_PRIORITY: Record<string, number> = {
  'MOBILE': 1,
  'CELL': 1,
  'WIRELESS': 1,
  'LANDLINE': 2,
  'HOME': 2,
  'WORK': 3,
  'OFFICE': 3,
  'FAX': 4,
  'OTHER': 5,
}

const PHONE_STATUS_PRIORITY: Record<PhoneStatus, number> = {
  'VALID': 1,
  'UNVERIFIED': 2,
  'WRONG': 99,
  'DISCONNECTED': 99,
  'DNC': 99,
}

export function sortPhonesByPriority(phones: PhoneData[]): PhoneData[] {
  return [...phones].sort((a, b) => {
    // Primary first
    if (a.isPrimary && !b.isPrimary) return -1
    if (!a.isPrimary && b.isPrimary) return 1

    // Then by status (VALID > UNVERIFIED > bad statuses)
    const statusA = PHONE_STATUS_PRIORITY[a.phoneStatus] || 99
    const statusB = PHONE_STATUS_PRIORITY[b.phoneStatus] || 99
    if (statusA !== statusB) return statusA - statusB

    // Then by type (MOBILE > LANDLINE > etc.)
    const typeA = PHONE_TYPE_PRIORITY[a.type.toUpperCase()] || 5
    const typeB = PHONE_TYPE_PRIORITY[b.type.toUpperCase()] || 5
    if (typeA !== typeB) return typeA - typeB

    // Then by attempt count (fewer attempts first)
    return a.attemptCount - b.attemptCount
  })
}

// ==========================================
// GET NEXT PHONE TO CALL
// ==========================================

export interface NextPhoneResult {
  phone: PhoneData | null
  reason: string
  allPhonesExhausted: boolean
}

export function getNextPhoneToCall(
  phones: PhoneData[],
  lastCalledPhoneId: string | null
): NextPhoneResult {
  // Filter to callable phones
  const callablePhones = phones.filter(p => 
    p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
  )

  if (callablePhones.length === 0) {
    return {
      phone: null,
      reason: 'No callable phones available',
      allPhonesExhausted: true,
    }
  }

  // Sort by priority
  const sortedPhones = sortPhonesByPriority(callablePhones)

  // If we have a last called phone, check if we should rotate
  if (lastCalledPhoneId) {
    const lastPhone = phones.find(p => p.id === lastCalledPhoneId)
    
    if (lastPhone) {
      // Check rotation rule: 2 consecutive no-answers = rotate
      if (lastPhone.consecutiveNoAnswer >= 2) {
        // Find next phone that isn't the last one
        const nextPhone = sortedPhones.find(p => p.id !== lastCalledPhoneId)
        if (nextPhone) {
          return {
            phone: nextPhone,
            reason: 'Rotated after 2 consecutive no-answers',
            allPhonesExhausted: false,
          }
        }
      }
    }
  }

  // Return highest priority phone
  return {
    phone: sortedPhones[0],
    reason: 'Highest priority phone',
    allPhonesExhausted: false,
  }
}

// ==========================================
// PHONE STATUS TRANSITIONS
// ==========================================

export interface PhoneStatusUpdate {
  newStatus: PhoneStatus
  resetConsecutiveNoAnswer: boolean
  incrementAttemptCount: boolean
}

export function getPhoneStatusUpdate(
  currentStatus: PhoneStatus,
  outcome: CallOutcome
): PhoneStatusUpdate {
  const result: PhoneStatusUpdate = {
    newStatus: currentStatus,
    resetConsecutiveNoAnswer: false,
    incrementAttemptCount: true,
  }

  switch (outcome) {
    case 'ANSWERED_INTERESTED':
    case 'ANSWERED_CALLBACK':
    case 'ANSWERED_NEUTRAL':
    case 'ANSWERED_NOT_NOW':
    case 'ANSWERED_NOT_INTERESTED':
      // Phone is verified as valid
      result.newStatus = 'VALID'
      result.resetConsecutiveNoAnswer = true
      break

    case 'VOICEMAIL':
      // Real voicemail = phone is valid
      result.newStatus = 'VALID'
      // Don't reset no-answer streak for voicemail
      break

    case 'NO_ANSWER':
    case 'BUSY':
      // Keep current status, increment no-answer if applicable
      break

    case 'WRONG_NUMBER':
      result.newStatus = 'WRONG'
      break

    case 'DISCONNECTED':
      result.newStatus = 'DISCONNECTED'
      break

    case 'DNC':
      result.newStatus = 'DNC'
      break
  }

  return result
}

// ==========================================
// CHECK IF PHONE IS CALLABLE
// ==========================================

export function isPhoneCallable(phone: PhoneData): boolean {
  return phone.phoneStatus === 'VALID' || phone.phoneStatus === 'UNVERIFIED'
}

export function hasCallablePhone(phones: PhoneData[]): boolean {
  return phones.some(isPhoneCallable)
}

export function countCallablePhones(phones: PhoneData[]): number {
  return phones.filter(isPhoneCallable).length
}

// ==========================================
// CHECK IF ALL PHONES EXHAUSTED
// ==========================================

export function areAllPhonesExhausted(phones: PhoneData[]): boolean {
  return !hasCallablePhone(phones)
}

// ==========================================
// GET PHONE SUMMARY
// ==========================================

export interface PhoneSummary {
  total: number
  valid: number
  unverified: number
  wrong: number
  disconnected: number
  dnc: number
  callable: number
  hasValidPhone: boolean
  hasVerifiedPhone: boolean
  hasMultiplePhones: boolean
  primaryPhone: PhoneData | null
}

export function getPhoneSummary(phones: PhoneData[]): PhoneSummary {
  const valid = phones.filter(p => p.phoneStatus === 'VALID').length
  const unverified = phones.filter(p => p.phoneStatus === 'UNVERIFIED').length
  const wrong = phones.filter(p => p.phoneStatus === 'WRONG').length
  const disconnected = phones.filter(p => p.phoneStatus === 'DISCONNECTED').length
  const dnc = phones.filter(p => p.phoneStatus === 'DNC').length
  const callable = valid + unverified

  return {
    total: phones.length,
    valid,
    unverified,
    wrong,
    disconnected,
    dnc,
    callable,
    hasValidPhone: callable > 0,
    hasVerifiedPhone: valid > 0,
    hasMultiplePhones: callable > 1,
    primaryPhone: phones.find(p => p.isPrimary) || null,
  }
}

// ==========================================
// UPDATE PHONE AFTER CALL
// ==========================================

export interface PhoneUpdateResult {
  phoneId: string
  updates: {
    phoneStatus?: PhoneStatus
    attemptCount?: number
    lastAttemptAt?: Date
    lastOutcome?: CallOutcome
    consecutiveNoAnswer?: number
  }
  shouldRotate: boolean
  rotateReason: string | null
}

export function updatePhoneAfterCall(
  phone: PhoneData,
  outcome: CallOutcome
): PhoneUpdateResult {
  const statusUpdate = getPhoneStatusUpdate(phone.phoneStatus, outcome)
  
  const updates: PhoneUpdateResult['updates'] = {
    lastAttemptAt: new Date(),
    lastOutcome: outcome,
  }

  if (statusUpdate.incrementAttemptCount) {
    updates.attemptCount = phone.attemptCount + 1
  }

  if (statusUpdate.newStatus !== phone.phoneStatus) {
    updates.phoneStatus = statusUpdate.newStatus
  }

  // Handle consecutive no-answer
  if (statusUpdate.resetConsecutiveNoAnswer) {
    updates.consecutiveNoAnswer = 0
  } else if (outcome === 'NO_ANSWER') {
    updates.consecutiveNoAnswer = phone.consecutiveNoAnswer + 1
  }

  // Check if we should rotate
  const shouldRotate = 
    (updates.consecutiveNoAnswer !== undefined && updates.consecutiveNoAnswer >= 2) ||
    statusUpdate.newStatus === 'WRONG' ||
    statusUpdate.newStatus === 'DISCONNECTED' ||
    statusUpdate.newStatus === 'DNC'

  let rotateReason: string | null = null
  if (shouldRotate) {
    if (statusUpdate.newStatus === 'WRONG') {
      rotateReason = 'Phone marked as wrong number'
    } else if (statusUpdate.newStatus === 'DISCONNECTED') {
      rotateReason = 'Phone disconnected'
    } else if (statusUpdate.newStatus === 'DNC') {
      rotateReason = 'DNC requested'
    } else {
      rotateReason = '2 consecutive no-answers'
    }
  }

  return {
    phoneId: phone.id,
    updates,
    shouldRotate,
    rotateReason,
  }
}

// ==========================================
// MARK PHONE AS PRIMARY
// ==========================================

export function markPhoneAsPrimary(
  phones: PhoneData[],
  phoneId: string
): Array<{ id: string; isPrimary: boolean }> {
  return phones.map(p => ({
    id: p.id,
    isPrimary: p.id === phoneId,
  }))
}
