/**
 * LCE v2.3.1 Service
 * Lead Cadence Engine - Database Integration Service
 * 
 * This module provides the database integration layer for the LCE,
 * connecting the pure logic modules to Prisma.
 */

import { prisma } from '@/lib/prisma'
import {
  calculatePriorityScore,
  RecordForScoring,
  ScoreResult,
  TemperatureBand,
  CadenceState,
  LCE_VERSION,
  SCORE_THRESHOLDS,
} from './index'

import {
  enrollInCadence,
  advanceCadence,
  exitCadence,
  snoozeRecord as snoozeRecordLogic,
  pauseRecord as pauseRecordLogic,
  resumeRecord as resumeRecordLogic,
  applyCallbackOverride,
  getTotalSteps,
} from './cadence'

import {
  logOutcome,
  createCallAttempt,
} from './call-handler'

import {
  CallOutcome,
} from './types'

import {
  getPhoneSummary,
  updatePhoneAfterCall,
  getNextPhoneToCall,
  PhoneData,
} from './phone-rotation'

import {
  checkWorkability,
  assignToQueueSection,
  QueueSection,
} from './workability'

import {
  checkReEnrollmentEligibility,
  executeReEnrollment,
} from './reenrollment'

// ==========================================
// RECORD SCORING SERVICE
// ==========================================

export async function scoreRecord(recordId: string, userId: string): Promise<ScoreResult | null> {
  // Fetch record with all needed relations
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
    include: {
      recordMotivations: {
        include: { motivation: true },
      },
      phoneNumbers: true,
      status: true,
      tasks: {
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      },
    },
  })

  if (!record) return null

  // Build RecordForScoring
  const phones = record.phoneNumbers.map(p => ({
    id: p.id,
    number: p.number,
    type: p.type,
    phoneStatus: (p as unknown as { phoneStatus: string }).phoneStatus || 'UNVERIFIED',
    isPrimary: (p as unknown as { isPrimary: boolean }).isPrimary || false,
    attemptCount: (p as unknown as { attemptCount: number }).attemptCount || 0,
    lastAttemptAt: (p as unknown as { lastAttemptAt: Date | null }).lastAttemptAt || null,
    lastOutcome: (p as unknown as { lastOutcome: string | null }).lastOutcome || null,
    consecutiveNoAnswer: (p as unknown as { consecutiveNoAnswer: number }).consecutiveNoAnswer || 0,
  })) as PhoneData[]

  const phoneSummary = getPhoneSummary(phones)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const recordForScoring: RecordForScoring = {
    id: record.id,
    createdAt: record.createdAt,
    lastContactedAt: record.lastContactedAt,
    hasEngaged: record.hasEngaged,
    callAttempts: record.callAttempts,
    engagementScore: (record as unknown as { engagementScore: number }).engagementScore || 0,
    noResponseStreak: (record as unknown as { noResponseStreak: number }).noResponseStreak || 0,
    temperature: record.temperature,
    statusId: record.statusId,
    statusName: record.status?.name || null,
    skiptraceDate: record.skiptraceDate,
    phoneCount: record.phoneCount,
    emailCount: record.emailCount,
    motivationCount: record.motivationCount,
    motivations: record.recordMotivations.map(rm => rm.motivation.name),
    hasValidPhone: phoneSummary.hasValidPhone,
    hasVerifiedPhone: phoneSummary.hasVerifiedPhone,
    hasMultiplePhones: phoneSummary.hasMultiplePhones,
    hasEmail: record.emailCount > 0,
    hasOverdueTask: record.tasks.some(t => t.dueDate && t.dueDate < today),
    hasDueTodayTask: record.tasks.some(t => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow),
    hasDueTomorrowTask: record.tasks.some(t => {
      if (!t.dueDate) return false
      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
      return t.dueDate >= tomorrow && t.dueDate < dayAfterTomorrow
    }),
    hasCallbackTask: record.tasks.some(t => t.title.toLowerCase().includes('callback')),
    hasFollowUpTask: record.tasks.some(t => t.title.toLowerCase().includes('follow')),
    callbackRequestedAt: (record as unknown as { callbackRequestedAt: Date | null }).callbackRequestedAt || null,
  }

  // Calculate score
  const scoreResult = calculatePriorityScore(recordForScoring)

  // Update record with score
  await prisma.record.update({
    where: { id: recordId },
    data: {
      priorityScore: scoreResult.priorityScore,
      scoreComputedAt: new Date(),
      scoreVersion: LCE_VERSION,
      scoreBreakdown: scoreResult.scoreBreakdown as object,
      confidenceLevel: scoreResult.confidenceLevel,
      temperatureBand: scoreResult.temperatureBand,
    },
  })

  return scoreResult
}

// ==========================================
// CADENCE ENROLLMENT SERVICE
// ==========================================

export async function enrollRecordInCadence(
  recordId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
    include: { phoneNumbers: true },
  })

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  // Check workability
  const phones = record.phoneNumbers.map(p => ({
    phoneStatus: (p as unknown as { phoneStatus: string }).phoneStatus || 'UNVERIFIED',
  }))
  const hasValidPhone = phones.some(p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED')
  const hasDncPhone = phones.some(p => p.phoneStatus === 'DNC')
  const allPhonesDnc = phones.length > 0 && phones.every(p => p.phoneStatus === 'DNC')

  const workability = checkWorkability({
    cadenceState: ((record as unknown as { cadenceState: CadenceState }).cadenceState) || 'NOT_ENROLLED',
    statusName: null,
    hasDncPhone,
    allPhonesDnc,
    hasValidPhone,
  })

  if (!workability.isWorkable) {
    return { success: false, error: workability.blockers.join(', ') }
  }

  if (!hasValidPhone) {
    return { success: false, error: 'No valid phone numbers' }
  }

  // Get current score or calculate
  let score = (record as unknown as { priorityScore: number | null }).priorityScore
  if (!score) {
    const scoreResult = await scoreRecord(recordId, userId)
    score = scoreResult?.priorityScore || 50
  }

  // Determine temperature band
  let band: TemperatureBand = 'WARM'
  if (score >= SCORE_THRESHOLDS.HOT) band = 'HOT'
  else if (score >= SCORE_THRESHOLDS.WARM) band = 'WARM'
  else if (score >= SCORE_THRESHOLDS.COLD) band = 'COLD'
  else band = 'ICE'

  // Enroll
  const currentEnrollmentCount = (record as unknown as { enrollmentCount: number }).enrollmentCount || 0
  const enrollment = enrollInCadence(band, currentEnrollmentCount)

  await prisma.record.update({
    where: { id: recordId },
    data: {
      cadenceState: enrollment.cadenceState,
      cadenceType: enrollment.cadenceType,
      cadenceStep: enrollment.cadenceStep,
      cadenceStartDate: enrollment.cadenceStartDate,
      nextActionType: enrollment.nextActionType,
      nextActionDue: enrollment.nextActionDue,
      enrollmentCount: enrollment.enrollmentCount,
      temperatureBand: band,
    },
  })

  return { success: true }
}

// ==========================================
// CALL LOGGING SERVICE
// ==========================================

export async function logCall(
  recordId: string,
  userId: string,
  phoneId: string | null,
  outcome: CallOutcome,
  notes?: string,
  callbackTime?: Date
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
    include: { phoneNumbers: true },
  })

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  const phone = phoneId ? record.phoneNumbers.find(p => p.id === phoneId) : null
  const phoneNumber = phone?.number || null

  // Create attempt
  const attempt = createCallAttempt(
    recordId,
    phoneId,
    phoneNumber,
    (record as unknown as { cadenceType: string | null }).cadenceType as 'HOT' | 'WARM' | 'COLD' | 'ICE' | null,
    (record as unknown as { cadenceStep: number }).cadenceStep || 1,
    userId
  )

  // Log outcome
  const outcomeResult = logOutcome(
    attempt,
    outcome,
    {
      cadenceState: ((record as unknown as { cadenceState: CadenceState }).cadenceState) || 'ACTIVE',
      cadenceType: (record as unknown as { cadenceType: string | null }).cadenceType as 'HOT' | 'WARM' | 'COLD' | 'ICE' | null,
      cadenceStep: (record as unknown as { cadenceStep: number }).cadenceStep || 1,
      cadenceStartDate: (record as unknown as { cadenceStartDate: Date | null }).cadenceStartDate || new Date(),
      temperatureBand: (record as unknown as { temperatureBand: string }).temperatureBand || 'WARM',
      priorityScore: (record as unknown as { priorityScore: number }).priorityScore || 50,
      enrollmentCount: (record as unknown as { enrollmentCount: number }).enrollmentCount || 1,
      noResponseStreak: (record as unknown as { noResponseStreak: number }).noResponseStreak || 0,
    },
    callbackTime
  )

  // Build update data
  const updateData: Record<string, unknown> = {
    callAttempts: { increment: 1 },
    lastContactedAt: new Date(),
    lastContactType: 'CALL',
    lastContactResult: outcome,
  }

  if (outcomeResult.newCadenceState) {
    updateData.cadenceState = outcomeResult.newCadenceState
  }
  if (outcomeResult.newCadenceStep !== null) {
    updateData.cadenceStep = outcomeResult.newCadenceStep
  }
  if (outcomeResult.nextActionDue) {
    updateData.nextActionDue = outcomeResult.nextActionDue
  }
  if (outcomeResult.nextActionType) {
    updateData.nextActionType = outcomeResult.nextActionType
  }
  if (outcomeResult.cadenceExitDate) {
    updateData.cadenceExitDate = outcomeResult.cadenceExitDate
    updateData.cadenceExitReason = outcomeResult.cadenceExitReason
  }
  if (outcomeResult.reEnrollmentDate) {
    updateData.reEnrollmentDate = outcomeResult.reEnrollmentDate
  }
  if (outcomeResult.resetNoResponseStreak) {
    updateData.noResponseStreak = 0
  } else if (outcomeResult.noResponseStreakDelta > 0) {
    updateData.noResponseStreak = { increment: outcomeResult.noResponseStreakDelta }
  }
  if (outcomeResult.engagementDelta !== 0) {
    updateData.engagementScore = { increment: outcomeResult.engagementDelta }
  }
  if (outcomeResult.isCallback) {
    updateData.callbackRequestedAt = new Date()
    updateData.callbackScheduledFor = outcomeResult.callbackScheduledFor
    updateData.hasEngaged = true
  }
  if (outcome === 'ANSWERED_INTERESTED' || outcome === 'ANSWERED_CALLBACK' || outcome === 'ANSWERED_NEUTRAL') {
    updateData.hasEngaged = true
  }

  // Update record
  await prisma.record.update({
    where: { id: recordId },
    data: updateData,
  })

  // Update phone if applicable
  if (phone && outcomeResult.newPhoneStatus) {
    await prisma.recordPhoneNumber.update({
      where: { id: phone.id },
      data: {
        phoneStatus: outcomeResult.newPhoneStatus,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastOutcome: outcome,
      },
    })
  } else if (phone) {
    await prisma.recordPhoneNumber.update({
      where: { id: phone.id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastOutcome: outcome,
        consecutiveNoAnswer: outcome === 'NO_ANSWER' 
          ? { increment: 1 } 
          : (outcome.startsWith('ANSWERED') ? 0 : undefined),
      },
    })
  }

  // Log to CadenceLog
  await prisma.cadenceLog.create({
    data: {
      recordId,
      createdById: userId,
      attemptId: attempt.attemptId,
      attemptedAt: attempt.attemptedAt,
      cadenceType: attempt.cadenceType,
      stepNumber: attempt.stepNumber,
      actionType: attempt.actionType,
      phoneId: attempt.phoneId,
      phoneNumber: attempt.phoneNumber,
      outcome,
      outcomeLoggedAt: new Date(),
      notes,
      executedById: userId,
    },
  })

  return { success: true }
}

// ==========================================
// SNOOZE SERVICE
// ==========================================

export async function snoozeRecord(
  recordId: string,
  userId: string,
  days: number = 1
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
  })

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  const snooze = snoozeRecordLogic(days)

  await prisma.record.update({
    where: { id: recordId },
    data: {
      cadenceState: snooze.cadenceState,
      snoozedUntil: snooze.snoozedUntil,
    },
  })

  return { success: true }
}

// ==========================================
// PAUSE SERVICE
// ==========================================

export async function pauseRecord(
  recordId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
  })

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  const pause = pauseRecordLogic(reason)

  await prisma.record.update({
    where: { id: recordId },
    data: {
      cadenceState: pause.cadenceState,
      pausedReason: pause.pausedReason,
      pausedUntil: pause.pausedUntil,
    },
  })

  return { success: true }
}

// ==========================================
// RESUME SERVICE
// ==========================================

export async function resumeRecord(
  recordId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, createdById: userId },
  })

  if (!record) {
    return { success: false, error: 'Record not found' }
  }

  const cadenceType = (record as unknown as { cadenceType: string }).cadenceType as 'HOT' | 'WARM' | 'COLD' | 'ICE' || 'WARM'
  const cadenceStep = (record as unknown as { cadenceStep: number }).cadenceStep || 1

  const resume = resumeRecordLogic(cadenceType, cadenceStep)

  await prisma.record.update({
    where: { id: recordId },
    data: {
      cadenceState: resume.cadenceState,
      nextActionDue: resume.nextActionDue,
      nextActionType: resume.nextActionType,
      snoozedUntil: null,
      pausedReason: null,
      pausedUntil: null,
    },
  })

  return { success: true }
}

// ==========================================
// GET QUEUE SERVICE
// ==========================================

export interface QueueRecordData {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  priorityScore: number
  temperatureBand: TemperatureBand
  confidenceLevel: string
  cadenceState: CadenceState
  cadenceType: string | null
  cadenceStep: number
  nextActionType: string | null
  nextActionDue: Date | null
  queueSection: QueueSection
  queuePriority: number
  queueReason: string
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  hasCallback: boolean
  phones: Array<{ id: string; number: string; type: string }>
  motivations: string[]
}

export async function getQueue(userId: string, section?: QueueSection): Promise<QueueRecordData[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fetch active records - use existing fields until LCE migration is applied
  const records = await prisma.record.findMany({
    where: {
      createdById: userId,
    },
    include: {
      phoneNumbers: true,
      recordMotivations: {
        include: { motivation: true },
      },
      tasks: {
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      },
    },
    orderBy: [
      { updatedAt: 'desc' },
    ],
    take: 200,
  })

  const queueRecords: QueueRecordData[] = []

  for (const record of records) {
    const hasOverdueTask = record.tasks.some((t: { dueDate: Date | null }) => t.dueDate && t.dueDate < today)
    const hasDueTodayTask = record.tasks.some((t: { dueDate: Date | null }) => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow)
    const hasCallback = !!(record as unknown as { callbackScheduledFor: Date | null }).callbackScheduledFor

    // Use actual phoneNumbers array length, not the denormalized phoneCount field
    const actualPhoneCount = record.phoneNumbers.length
    const phones = record.phoneNumbers.map((p: { id: string; number: string; type: string }) => ({
      phoneStatus: (p as unknown as { phoneStatus: string }).phoneStatus || 'UNVERIFIED',
    }))
    const hasValidPhone = actualPhoneCount > 0 // All phones are valid until marked otherwise
    const hasUnverifiedPhone = actualPhoneCount > 0

    const queueAssignment = assignToQueueSection({
      cadenceState: ((record as unknown as { cadenceState: CadenceState }).cadenceState) || 'NOT_ENROLLED',
      nextActionDue: (record as unknown as { nextActionDue: Date | null }).nextActionDue,
      hasOverdueTask,
      hasDueTodayTask,
      hasValidPhone,
      hasUnverifiedPhone,
      phoneCount: actualPhoneCount,
      isWorkable: true,
    })

    // Filter by section if specified
    if (section && queueAssignment.section !== section) {
      continue
    }

    queueRecords.push({
      id: record.id,
      ownerFullName: record.ownerFullName,
      propertyStreet: record.propertyStreet,
      propertyCity: record.propertyCity,
      propertyState: record.propertyState,
      priorityScore: (record as unknown as { priorityScore: number }).priorityScore || 50,
      temperatureBand: ((record as unknown as { temperatureBand: TemperatureBand }).temperatureBand) || 'WARM',
      confidenceLevel: (record as unknown as { confidenceLevel: string }).confidenceLevel || 'MEDIUM',
      cadenceState: ((record as unknown as { cadenceState: CadenceState }).cadenceState) || 'NOT_ENROLLED',
      cadenceType: (record as unknown as { cadenceType: string | null }).cadenceType || null,
      cadenceStep: (record as unknown as { cadenceStep: number }).cadenceStep || 0,
      nextActionType: (record as unknown as { nextActionType: string | null }).nextActionType || 'CALL',
      nextActionDue: (record as unknown as { nextActionDue: Date | null }).nextActionDue || null,
      queueSection: queueAssignment.section,
      queuePriority: queueAssignment.priority,
      queueReason: queueAssignment.reason,
      hasOverdueTask,
      hasDueTodayTask,
      hasCallback,
      phones: record.phoneNumbers.map((p: { id: string; number: string; type: string }) => ({
        id: p.id,
        number: p.number,
        type: p.type,
      })),
      motivations: record.recordMotivations.map((rm: { motivation: { name: string } }) => rm.motivation.name),
    })
  }

  // Sort by queue priority then score
  queueRecords.sort((a, b) => {
    if (a.queuePriority !== b.queuePriority) {
      return b.queuePriority - a.queuePriority
    }
    return b.priorityScore - a.priorityScore
  })

  return queueRecords
}

// ==========================================
// GET NEXT UP SERVICE
// ==========================================

export async function getNextUp(userId: string): Promise<QueueRecordData | null> {
  const queue = await getQueue(userId)
  return queue[0] || null
}
