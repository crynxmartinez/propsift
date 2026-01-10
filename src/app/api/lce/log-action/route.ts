import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { 
  logCall, 
  snoozeRecordService, 
  pauseRecordService, 
  resumeRecordService,
  enrollRecordInCadence,
  scoreRecord,
  CallOutcome,
} from '@/lib/lce'

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

    const ownerId = authUser.ownerId
    const body = await request.json()
    const { recordId, action, ...data } = body

    if (!recordId || !action) {
      return NextResponse.json(
        { error: 'recordId and action are required' },
        { status: 400 }
      )
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'call':
        // Log a call with outcome
        const outcome = (data.outcome || 'NO_ANSWER') as CallOutcome
        const phoneId = data.phoneId || null
        const notes = data.notes || null
        const callbackTime = data.callbackTime ? new Date(data.callbackTime) : undefined
        
        result = await logCall(recordId, ownerId, phoneId, outcome, notes, callbackTime)
        break

      case 'snooze':
        // Snooze the record
        const snoozeDays = data.days || 1
        result = await snoozeRecordService(recordId, ownerId, snoozeDays)
        break

      case 'pause':
        // Pause the record
        const pauseReason = data.reason || 'Manual pause'
        result = await pauseRecordService(recordId, ownerId, pauseReason)
        break

      case 'resume':
        // Resume the record
        result = await resumeRecordService(recordId, ownerId)
        break

      case 'enroll':
        // Enroll in cadence
        result = await enrollRecordInCadence(recordId, ownerId)
        break

      case 'score':
        // Recalculate score
        const scoreResult = await scoreRecord(recordId, ownerId)
        if (scoreResult) {
          return NextResponse.json({
            success: true,
            score: scoreResult.priorityScore,
            temperatureBand: scoreResult.temperatureBand,
            confidenceLevel: scoreResult.confidenceLevel,
          })
        }
        result = { success: false, error: 'Failed to calculate score' }
        break

      case 'skip':
        // Skip just moves to next record - no state change needed
        result = { success: true }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('Error logging LCE action:', error)
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    )
  }
}
