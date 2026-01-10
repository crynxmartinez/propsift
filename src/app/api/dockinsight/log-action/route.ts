import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { mapCallResultToOutcome, type CallOutcome } from '@/lib/lce/call-outcome-handler'
import { calculatePhaseTransition, OUTCOME_CONFIG, type LCEPhase } from '@/lib/lce/first-to-market'

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

    switch (action) {
      case 'call':
        // Map call result to LCE outcome
        const callResultName = body.callResultName || result || 'no_answer'
        const wasAnswered = result === 'answered' || callResultName.toLowerCase().includes('answered')
        const lceOutcome: CallOutcome = mapCallResultToOutcome(callResultName, wasAnswered)
        const outcomeConfig = OUTCOME_CONFIG[lceOutcome]
        
        // Get current phase and blitz attempts (with fallbacks for new schema)
        const currentPhase = ((record as Record<string, unknown>).currentPhase as string) || 'NEW'
        const blitzAttempts = ((record as Record<string, unknown>).blitzAttempts as number) || 0
        const noResponseStreak = ((record as Record<string, unknown>).noResponseStreak as number) || 0
        
        // Calculate phase transition
        const callbackDateParsed = body.callbackDate ? new Date(body.callbackDate) : undefined
        const transition = calculatePhaseTransition(
          currentPhase as LCEPhase,
          blitzAttempts,
          lceOutcome,
          callbackDateParsed
        )
        
        // Build update data with LCE v3.0 First-to-Market logic
        updateData = {
          // Basic call tracking
          callAttempts: { increment: 1 },
          lastContactedAt: now,
          lastContactType: 'CALL',
          lastContactResult: lceOutcome,
          
          // LCE v3.0: Phase tracking
          currentPhase: transition.newPhase,
          blitzAttempts: transition.newBlitzAttempts,
          lastBlitzDate: now,
          
          // LCE v3.0: Next action scheduling
          nextActionDue: transition.nextActionDue,
          nextActionType: transition.nextActionType,
          
          // Engagement tracking
          hasEngaged: outcomeConfig.isContact ? true : (record.hasEngaged || false),
          noResponseStreak: outcomeConfig.isContact ? 0 : noResponseStreak + 1,
        }
        
        // Handle callback scheduling
        if (lceOutcome === 'ANSWERED_CALLBACK' && callbackDateParsed) {
          updateData.callbackScheduledFor = callbackDateParsed
          updateData.callbackRequestedAt = now
        }
        
        // Handle deep prospecting
        if (transition.shouldMoveToDeepProspect) {
          updateData.deepProspectEnteredAt = now
        }
        
        // Handle DNC (not workable)
        if (transition.shouldMoveToNotWorkable) {
          updateData.cadenceState = 'EXITED_DNC'
          updateData.cadenceExitDate = now
          updateData.cadenceExitReason = 'DNC'
        }
        
        // Update phone stats if phoneId provided
        if (body.phoneId) {
          await prisma.recordPhoneNumber.update({
            where: { id: body.phoneId },
            data: {
              attemptCount: { increment: 1 },
              lastAttemptAt: now,
              lastOutcome: lceOutcome,
              consecutiveNoAnswer: outcomeConfig.isContact ? 0 : { increment: 1 },
              phoneStatus: lceOutcome === 'WRONG_NUMBER' ? 'WRONG' : 
                           lceOutcome === 'DISCONNECTED' ? 'DISCONNECTED' :
                           lceOutcome === 'ANSWERED_DNC' ? 'DNC' : undefined,
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
