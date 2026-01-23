import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  processAction,
  mapCallResultToOutcome,
  getPhoneSummary,
  type PhoneData,
  type LCERecord,
  type CadencePhase,
  type CadenceState,
  type CadenceType,
  type TemperatureBand,
  type QueueTier,
} from '@/lib/lce/v4'

interface LogActionRequest {
  recordId: string
  action: 'call' | 'skip' | 'snooze' | 'complete' | 'temperature' | 'pause' | 'resume'
  result?: 'answered' | 'voicemail' | 'no_answer' | 'wrong_number' | 'busy' | 'disconnected'
  callResultName?: string // Name of call result for LCE mapping
  phoneId?: string // Phone that was called
  notes?: string
  snoozeDuration?: number // minutes
  taskId?: string
  newTemperature?: 'HOT' | 'WARM' | 'COLD'
  reason?: string // For pause action
  callbackDate?: string // ISO date for callback scheduling
}

export async function POST(request: Request) {
  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''
    
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body: LogActionRequest = await request.json()
    const { recordId, action, result, notes, snoozeDuration, taskId, newTemperature } = body

    if (!recordId || !action) {
      return NextResponse.json(
        { error: 'recordId and action are required' },
        { status: 400 }
      )
    }

    // Verify record belongs to user
    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        createdById: authUser.ownerId,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    let updateData: Record<string, unknown> = {}
    let activityAction = ''
    let activityField = ''
    let activityOldValue = ''
    let activityNewValue = ''

    // Fetch phones for LCE v4.0 processing
    const phones = await prisma.recordPhoneNumber.findMany({
      where: { recordId },
    })

    // Convert to PhoneData format for LCE v4.0
    const phoneData: PhoneData[] = phones.map(p => ({
      id: p.id,
      number: p.number,
      type: p.type || 'OTHER',
      phoneStatus: (p.phoneStatus as 'VALID' | 'UNVERIFIED' | 'WRONG' | 'DISCONNECTED' | 'DNC') || 'UNVERIFIED',
      isPrimary: p.isPrimary || false,
      attemptCount: p.attemptCount || 0,
      lastAttemptAt: p.lastAttemptAt,
      lastOutcome: p.lastOutcome as any || null,
      consecutiveNoAnswer: p.consecutiveNoAnswer || 0,
    }))

    // Build LCE record from database record
    const lceRecord: LCERecord = {
      id: record.id,
      priorityScore: record.priorityScore || 50,
      temperatureBand: (record.temperature as TemperatureBand) || 'WARM',
      confidenceLevel: 'MEDIUM',
      cadencePhase: ((record as any).cadencePhase as CadencePhase) || 'NEW',
      cadenceState: ((record as any).cadenceState as CadenceState) || 'ACTIVE',
      cadenceType: ((record as any).cadenceType as CadenceType) || null,
      cadenceStep: (record as any).cadenceStep || 0,
      cadenceStartDate: (record as any).cadenceStartDate || null,
      cadenceProgress: (record as any).cadenceProgress || null,
      nextActionDue: (record as any).nextActionDue || null,
      nextActionType: (record as any).nextActionType || null,
      callbackScheduledFor: (record as any).callbackScheduledFor || null,
      blitzAttempts: (record as any).blitzAttempts || 0,
      blitzStartedAt: (record as any).blitzStartedAt || null,
      temperatureStartedAt: (record as any).temperatureStartedAt || null,
      enrollmentCount: (record as any).enrollmentCount || 0,
      reEnrollmentDate: (record as any).reEnrollmentDate || null,
      cadenceExitDate: (record as any).cadenceExitDate || null,
      cadenceExitReason: (record as any).cadenceExitReason || null,
      lastPhoneCalledId: (record as any).lastPhoneCalledId || null,
      phoneExhaustedAt: (record as any).phoneExhaustedAt || null,
      hasValidPhone: phoneData.some(p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'),
      phoneCount: phoneData.length,
      queueTier: ((record as any).queueTier as QueueTier) || 9,
      callAttempts: record.callAttempts || 0,
      lastContactedAt: record.lastContactedAt || null,
      hasEngaged: record.hasEngaged || false,
      noResponseStreak: (record as any).noResponseStreak || 0,
      snoozedUntil: (record as any).snoozedUntil || null,
      pausedReason: (record as any).pausedReason || null,
      hasOverdueTask: false,
      hasDueTodayTask: false,
    }

    switch (action) {
      case 'call':
        // Use LCE v4.0 processAction for call handling
        const callResultName = body.callResultName || result || 'no_answer'
        const callbackDateParsed = body.callbackDate ? new Date(body.callbackDate) : undefined
        
        const callResult = processAction({
          record: lceRecord,
          action: 'call',
          phones: phoneData,
          callResultName,
          phoneId: body.phoneId,
          callbackDate: callbackDateParsed,
        })

        if (!callResult.success) {
          return NextResponse.json({ error: callResult.error }, { status: 400 })
        }

        // Build update data from LCE v4.0 result
        const lceOutcome = mapCallResultToOutcome(callResultName)
        
        updateData = {
          callAttempts: { increment: 1 },
          lastContactedAt: now,
          lastContactType: 'CALL',
          lastContactResult: lceOutcome,
          // LCE v4.0 fields
          cadencePhase: callResult.recordUpdates.cadencePhase,
          cadenceState: callResult.recordUpdates.cadenceState,
          cadenceStep: callResult.recordUpdates.cadenceStep,
          cadenceType: callResult.recordUpdates.cadenceType,
          cadenceProgress: callResult.recordUpdates.cadenceProgress,
          blitzAttempts: callResult.recordUpdates.blitzAttempts,
          nextActionDue: callResult.recordUpdates.nextActionDue,
          nextActionType: callResult.recordUpdates.nextActionType,
          lastPhoneCalledId: callResult.recordUpdates.lastPhoneCalledId,
          phoneExhaustedAt: callResult.recordUpdates.phoneExhaustedAt,
          queueTier: callResult.recordUpdates.queueTier,
          hasEngaged: callResult.recordUpdates.hasEngaged ?? record.hasEngaged,
          noResponseStreak: callResult.recordUpdates.noResponseStreak,
        }

        // Handle callback scheduling
        if (lceOutcome === 'ANSWERED_CALLBACK' && callbackDateParsed) {
          updateData.callbackScheduledFor = callbackDateParsed
          updateData.callbackRequestedAt = now
        }

        // Update phone stats if phoneId provided and we have phone update
        if (body.phoneId && callResult.phoneUpdate) {
          await prisma.recordPhoneNumber.update({
            where: { id: body.phoneId },
            data: {
              attemptCount: callResult.phoneUpdate.updates.attemptCount as number,
              lastAttemptAt: callResult.phoneUpdate.updates.lastAttemptAt as Date,
              lastOutcome: callResult.phoneUpdate.updates.lastOutcome as string,
              consecutiveNoAnswer: callResult.phoneUpdate.updates.consecutiveNoAnswer as number,
              phoneStatus: callResult.phoneUpdate.updates.phoneStatus as string || undefined,
            },
          })
        }

        activityAction = 'call_logged'
        activityField = 'callAttempts'
        activityOldValue = String(record.callAttempts)
        activityNewValue = String(record.callAttempts + 1)
        break

      case 'skip':
        // Log skip but don't change record
        activityAction = 'skipped'
        activityNewValue = notes || 'Skipped from queue'
        break

      case 'snooze':
        // Set snooze until time
        const snoozeMinutes = snoozeDuration || 60 // Default 1 hour
        const snoozedUntil = new Date(now.getTime() + snoozeMinutes * 60 * 1000)
        updateData = {
          snoozedUntil,
          cadenceState: 'SNOOZED',
        }
        activityAction = 'snoozed'
        activityNewValue = `Snoozed until ${snoozedUntil.toISOString()}`
        break

      case 'complete':
        // Complete a task
        if (taskId) {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              completedAt: now,
            },
          })
          activityAction = 'task_completed'
          activityNewValue = taskId
        }
        break

      case 'temperature':
        // Change temperature
        if (newTemperature) {
          activityOldValue = record.temperature || 'COLD'
          updateData = {
            temperature: newTemperature,
          }
          activityAction = 'temperature_changed'
          activityField = 'temperature'
          activityNewValue = newTemperature
        }
        break

      case 'pause':
        // Pause cadence
        updateData = {
          cadenceState: 'PAUSED',
          pausedReason: body.reason || 'Manual pause',
        }
        activityAction = 'cadence_paused'
        activityNewValue = body.reason || 'Manual pause'
        break

      case 'resume':
        // Resume cadence
        updateData = {
          cadenceState: 'ACTIVE',
          pausedReason: null,
        }
        activityAction = 'cadence_resumed'
        activityNewValue = 'Cadence resumed'
        break
    }

    // Update record if there are changes
    if (Object.keys(updateData).length > 0) {
      await prisma.record.update({
        where: { id: recordId },
        data: updateData as Parameters<typeof prisma.record.update>[0]['data'],
      })
    }

    // Log activity
    if (activityAction) {
      await prisma.recordActivityLog.create({
        data: {
          recordId,
          userId: authUser.id,
          action: activityAction,
          field: activityField || null,
          oldValue: activityOldValue || null,
          newValue: activityNewValue || null,
          source: 'dockinsight',
        },
      })
    }

    // Add note if provided
    if (notes && action !== 'skip') {
      await prisma.recordComment.create({
        data: {
          recordId,
          userId: authUser.id,
          content: notes,
        },
      })
    }

    return NextResponse.json({
      success: true,
      action,
      recordId,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error logging action:', error)
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    )
  }
}
