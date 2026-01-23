/**
 * LCE v4.0 Phone Manager
 * Lead Cadence Engine - Phone Rotation & Exhaustion Detection
 * 
 * Handles:
 * - Phone priority ordering
 * - Rotation rules (2 consecutive no-answers = rotate)
 * - Status updates after calls
 * - Exhaustion detection
 */

import type {
  PhoneStatus,
  CallOutcome,
  PhoneData,
} from './types'

import { PHONE_TYPE_PRIORITY, PHONE_STATUS_PRIORITY } from './constants'

// ==========================================
// PHONE PRIORITY SORTING
// ==========================================

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
  phoneId: string | null
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
      phoneId: null,
      reason: 'No callable phones available',
      allPhonesExhausted: phones.length > 0, // Only exhausted if there were phones
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
            phoneId: nextPhone.id,
            reason: 'Rotated after 2 consecutive no-answers',
            allPhonesExhausted: false,
          }
        }
      }

      // Check if last phone is now bad
      if (lastPhone.phoneStatus === 'WRONG' || lastPhone.phoneStatus === 'DISCONNECTED' || lastPhone.phoneStatus === 'DNC') {
        const nextPhone = sortedPhones.find(p => p.id !== lastCalledPhoneId)
        if (nextPhone) {
          return {
            phone: nextPhone,
            phoneId: nextPhone.id,
            reason: 'Previous phone marked bad - trying next',
            allPhonesExhausted: false,
          }
        }
      }
    }
  }

  // Return highest priority phone
  return {
    phone: sortedPhones[0],
    phoneId: sortedPhones[0].id,
    reason: 'Highest priority phone',
    allPhonesExhausted: false,
  }
}

// ==========================================
// PHONE STATUS UPDATE
// ==========================================

export interface PhoneStatusUpdate {
  newStatus: PhoneStatus
  resetConsecutiveNoAnswer: boolean
  incrementAttemptCount: boolean
  incrementNoAnswer: boolean
}

export function getPhoneStatusUpdate(
  currentStatus: PhoneStatus,
  outcome: CallOutcome
): PhoneStatusUpdate {
  const result: PhoneStatusUpdate = {
    newStatus: currentStatus,
    resetConsecutiveNoAnswer: false,
    incrementAttemptCount: true,
    incrementNoAnswer: false,
  }

  switch (outcome) {
    case 'ANSWERED_INTERESTED':
    case 'ANSWERED_CALLBACK':
    case 'ANSWERED_NEUTRAL':
    case 'ANSWERED_NOT_NOW':
    case 'ANSWERED_NOT_INTERESTED':
    case 'ANSWERED_DNC':
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
      // Keep current status, increment no-answer
      result.incrementNoAnswer = true
      break

    case 'BUSY':
      // Keep current status
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
// UPDATE PHONE AFTER CALL
// ==========================================

export interface PhoneUpdateResult {
  phoneId: string
  updates: {
    phoneStatus?: PhoneStatus
    attemptCount: number
    lastAttemptAt: Date
    lastOutcome: CallOutcome
    consecutiveNoAnswer: number
  }
  shouldRotate: boolean
  rotateReason: string | null
  nextPhoneId: string | null
}

export function updatePhoneAfterCall(
  phone: PhoneData,
  outcome: CallOutcome,
  allPhones: PhoneData[]
): PhoneUpdateResult {
  const statusUpdate = getPhoneStatusUpdate(phone.phoneStatus, outcome)

  const updates: PhoneUpdateResult['updates'] = {
    attemptCount: statusUpdate.incrementAttemptCount ? phone.attemptCount + 1 : phone.attemptCount,
    lastAttemptAt: new Date(),
    lastOutcome: outcome,
    consecutiveNoAnswer: statusUpdate.resetConsecutiveNoAnswer
      ? 0
      : statusUpdate.incrementNoAnswer
        ? phone.consecutiveNoAnswer + 1
        : phone.consecutiveNoAnswer,
  }

  if (statusUpdate.newStatus !== phone.phoneStatus) {
    updates.phoneStatus = statusUpdate.newStatus
  }

  // Check if we should rotate
  const shouldRotate =
    updates.consecutiveNoAnswer >= 2 ||
    statusUpdate.newStatus === 'WRONG' ||
    statusUpdate.newStatus === 'DISCONNECTED' ||
    statusUpdate.newStatus === 'DNC'

  let rotateReason: string | null = null
  let nextPhoneId: string | null = null

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

    // Find next phone
    const updatedPhones = allPhones.map(p =>
      p.id === phone.id
        ? { ...p, ...updates, phoneStatus: updates.phoneStatus || p.phoneStatus }
        : p
    )
    const nextResult = getNextPhoneToCall(updatedPhones, phone.id)
    nextPhoneId = nextResult.phoneId
  }

  return {
    phoneId: phone.id,
    updates,
    shouldRotate,
    rotateReason,
    nextPhoneId,
  }
}

// ==========================================
// PHONE EXHAUSTION CHECK
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

export function areAllPhonesExhausted(phones: PhoneData[]): boolean {
  if (phones.length === 0) return false // No phones = not exhausted, just missing
  return !hasCallablePhone(phones)
}

// ==========================================
// PHONE SUMMARY
// ==========================================

export interface PhoneSummary {
  total: number
  valid: number
  unverified: number
  wrong: number
  disconnected: number
  dnc: number
  callable: number
  exhausted: boolean
  hasValidPhone: boolean
  hasMultiplePhones: boolean
  primaryPhone: PhoneData | null
  nextToCall: PhoneData | null
  nextToCallId: string | null
}

export function getPhoneSummary(phones: PhoneData[], lastCalledPhoneId: string | null = null): PhoneSummary {
  const valid = phones.filter(p => p.phoneStatus === 'VALID').length
  const unverified = phones.filter(p => p.phoneStatus === 'UNVERIFIED').length
  const wrong = phones.filter(p => p.phoneStatus === 'WRONG').length
  const disconnected = phones.filter(p => p.phoneStatus === 'DISCONNECTED').length
  const dnc = phones.filter(p => p.phoneStatus === 'DNC').length
  const callable = valid + unverified

  const nextResult = getNextPhoneToCall(phones, lastCalledPhoneId)

  return {
    total: phones.length,
    valid,
    unverified,
    wrong,
    disconnected,
    dnc,
    callable,
    exhausted: phones.length > 0 && callable === 0,
    hasValidPhone: callable > 0,
    hasMultiplePhones: callable > 1,
    primaryPhone: phones.find(p => p.isPrimary) || null,
    nextToCall: nextResult.phone,
    nextToCallId: nextResult.phoneId,
  }
}

// ==========================================
// MARK PHONE EXHAUSTED
// ==========================================

export function shouldMarkPhoneExhausted(phones: PhoneData[]): boolean {
  return phones.length > 0 && !hasCallablePhone(phones)
}
