import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'

interface LogActionRequest {
  recordId: string
  action: 'call' | 'skip' | 'snooze' | 'complete' | 'temperature'
  result?: 'answered' | 'voicemail' | 'no_answer' | 'wrong_number' | 'busy' | 'disconnected'
  notes?: string
  snoozeDuration?: number // minutes
  taskId?: string
  newTemperature?: 'HOT' | 'WARM' | 'COLD'
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
        // Increment call attempts
        updateData = {
          callAttempts: { increment: 1 },
          lastContactedAt: now,
          lastContactType: 'CALL',
          lastContactResult: result?.toUpperCase() || 'NO_ANSWER',
        }
        
        // If answered, mark as engaged
        if (result === 'answered') {
          updateData.hasEngaged = true
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
