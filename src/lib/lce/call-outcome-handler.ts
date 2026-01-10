/**
 * LCE v3.0 - Call Outcome Handler
 * 
 * Handles call outcomes and advances the First-to-Market cadence
 */

import { prisma } from '@/lib/prisma'
import { 
  calculatePhaseTransition, 
  type LCEPhase, 
  OUTCOME_CONFIG 
} from './first-to-market'
import type { CallOutcome } from './first-to-market'

export type { CallOutcome } from './first-to-market'

// ============================================
// PROCESS CALL OUTCOME
// ============================================

export interface CallOutcomeResult {
  success: boolean
  newPhase: LCEPhase
  nextActionDue: Date | null
  nextActionType: string
  movedToDeepProspect: boolean
  movedToNotWorkable: boolean
  reason: string
}

export async function processCallOutcome(
  recordId: string,
  phoneId: string,
  outcome: CallOutcome,
  userId: string,
  callbackDate?: Date,
  notes?: string
): Promise<CallOutcomeResult> {
  try {
    // Fetch current record state
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        currentPhase: true,
        blitzAttempts: true,
        callAttempts: true,
        noResponseStreak: true,
        hasEngaged: true,
        temperature: true,
      },
    })

    if (!record) {
      return {
        success: false,
        newPhase: 'NEW',
        nextActionDue: null,
        nextActionType: 'NONE',
        movedToDeepProspect: false,
        movedToNotWorkable: false,
        reason: 'Record not found',
      }
    }

    const currentPhase = (record.currentPhase || 'NEW') as LCEPhase
    const blitzAttempts = record.blitzAttempts || 0
    const outcomeConfig = OUTCOME_CONFIG[outcome]

    // Calculate phase transition
    const transition = calculatePhaseTransition(
      currentPhase,
      blitzAttempts,
      outcome,
      callbackDate
    )

    // Prepare update data
    const now = new Date()
    const updateData: Record<string, unknown> = {
      // Phase tracking
      currentPhase: transition.newPhase,
      blitzAttempts: transition.newBlitzAttempts,
      lastBlitzDate: now,
      
      // Next action
      nextActionDue: transition.nextActionDue,
      nextActionType: transition.nextActionType,
      
      // Call tracking
      callAttempts: { increment: 1 },
      lastContactedAt: now,
      lastContactType: 'CALL',
      lastContactResult: outcome,
      
      // Engagement tracking
      hasEngaged: outcomeConfig.isContact ? true : record.hasEngaged,
      noResponseStreak: outcomeConfig.isContact ? 0 : (record.noResponseStreak || 0) + 1,
    }

    // Handle callback scheduling
    if (outcome === 'ANSWERED_CALLBACK' && callbackDate) {
      updateData.callbackScheduledFor = callbackDate
      updateData.callbackRequestedAt = now
    }

    // Handle deep prospecting
    if (transition.shouldMoveToDeepProspect) {
      updateData.deepProspectEnteredAt = now
    }

    // Handle not workable (DNC)
    if (transition.shouldMoveToNotWorkable) {
      updateData.cadenceState = 'EXITED_DNC'
      updateData.cadenceExitDate = now
      updateData.cadenceExitReason = 'DNC'
    }

    // Update record
    await prisma.record.update({
      where: { id: recordId },
      data: updateData as Parameters<typeof prisma.record.update>[0]['data'],
    })

    // Update phone stats
    await prisma.recordPhoneNumber.update({
      where: { id: phoneId },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
        lastOutcome: outcome,
        consecutiveNoAnswer: outcomeConfig.isContact ? 0 : { increment: 1 },
        // Mark phone as bad if wrong/disconnected
        phoneStatus: outcome === 'WRONG_NUMBER' ? 'WRONG' : 
                     outcome === 'DISCONNECTED' ? 'DISCONNECTED' :
                     outcome === 'ANSWERED_DNC' ? 'DNC' : undefined,
      },
    })

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId,
        userId,
        action: 'call_logged',
        field: 'callAttempts',
        oldValue: String(record.callAttempts),
        newValue: String((record.callAttempts || 0) + 1),
        source: 'lce_call_handler',
      },
    })

    // Log phase transition if changed
    if (transition.newPhase !== currentPhase) {
      await prisma.recordActivityLog.create({
        data: {
          recordId,
          userId,
          action: 'lce_phase_changed',
          field: 'currentPhase',
          oldValue: currentPhase,
          newValue: transition.newPhase,
          source: 'lce_call_handler',
        },
      })
    }

    // Add note if provided
    if (notes) {
      await prisma.recordComment.create({
        data: {
          recordId,
          userId,
          content: notes,
        },
      })
    }

    return {
      success: true,
      newPhase: transition.newPhase,
      nextActionDue: transition.nextActionDue,
      nextActionType: transition.nextActionType,
      movedToDeepProspect: transition.shouldMoveToDeepProspect,
      movedToNotWorkable: transition.shouldMoveToNotWorkable,
      reason: transition.reason,
    }
  } catch (error) {
    console.error('Process call outcome error:', error)
    return {
      success: false,
      newPhase: 'NEW',
      nextActionDue: null,
      nextActionType: 'NONE',
      movedToDeepProspect: false,
      movedToNotWorkable: false,
      reason: 'Database error',
    }
  }
}

// ============================================
// MAP CALL RESULT TO OUTCOME
// ============================================

export function mapCallResultToOutcome(
  callResultName: string,
  wasAnswered: boolean
): CallOutcome {
  const name = callResultName.toLowerCase()

  // Answered outcomes
  if (wasAnswered || name.includes('answered') || name.includes('spoke')) {
    if (name.includes('interested') || name.includes('hot') || name.includes('deal')) {
      return 'ANSWERED_INTERESTED'
    }
    if (name.includes('callback') || name.includes('call back') || name.includes('schedule')) {
      return 'ANSWERED_CALLBACK'
    }
    if (name.includes('not interested') || name.includes('no interest')) {
      return 'ANSWERED_NOT_INTERESTED'
    }
    if (name.includes('not now') || name.includes('later') || name.includes('busy')) {
      return 'ANSWERED_NOT_NOW'
    }
    if (name.includes('dnc') || name.includes('do not call') || name.includes('stop')) {
      return 'ANSWERED_DNC'
    }
    return 'ANSWERED_NEUTRAL'
  }

  // Non-answered outcomes
  if (name.includes('voicemail') || name.includes('vm') || name.includes('left message')) {
    return 'VOICEMAIL'
  }
  if (name.includes('wrong') || name.includes('incorrect')) {
    return 'WRONG_NUMBER'
  }
  if (name.includes('disconnect') || name.includes('not in service') || name.includes('invalid')) {
    return 'DISCONNECTED'
  }
  if (name.includes('busy')) {
    return 'BUSY'
  }

  // Default to no answer
  return 'NO_ANSWER'
}
