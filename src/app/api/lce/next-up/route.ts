import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { getNextUpService, getQueue, getTotalSteps } from '@/lib/lce'

export async function GET(request: Request) {
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

    // Get section filter from query params
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') as 'OVERDUE' | 'DUE_TODAY' | 'TASKS_DUE' | 'VERIFY_FIRST' | 'GET_NUMBERS' | 'UPCOMING' | null

    // Get queue
    const queue = await getQueue(ownerId, section || undefined)

    if (queue.length === 0) {
      return NextResponse.json({
        record: null,
        message: section ? `No records in ${section} section` : 'No records in queue',
        section: section || 'all',
        totalInQueue: 0,
      })
    }

    const topRecord = queue[0]

    // Calculate total steps for cadence
    const totalSteps = topRecord.cadenceType 
      ? getTotalSteps(topRecord.cadenceType as 'HOT' | 'WARM' | 'COLD' | 'ICE' | 'GENTLE' | 'ANNUAL')
      : 0

    // Build reason string
    const reasonParts: string[] = []
    if (topRecord.hasCallback) reasonParts.push('Callback requested')
    else if (topRecord.hasOverdueTask) reasonParts.push('Task overdue')
    else if (topRecord.hasDueTodayTask) reasonParts.push('Task due today')
    if (topRecord.motivations.length > 0) reasonParts.push(topRecord.motivations[0])
    if (totalSteps > 0) reasonParts.push(`Step ${topRecord.cadenceStep}/${totalSteps}`)
    reasonParts.push(topRecord.temperatureBand)

    const reasonString = reasonParts.join(' • ')

    // Format response
    return NextResponse.json({
      record: {
        id: topRecord.id,
        ownerFullName: topRecord.ownerFullName,
        propertyStreet: topRecord.propertyStreet,
        propertyCity: topRecord.propertyCity,
        propertyState: topRecord.propertyState,
      },
      score: topRecord.priorityScore,
      temperatureBand: topRecord.temperatureBand,
      confidenceLevel: topRecord.confidenceLevel,
      cadenceState: topRecord.cadenceState,
      cadenceType: topRecord.cadenceType,
      cadenceStep: topRecord.cadenceStep,
      totalSteps,
      nextActionType: topRecord.nextActionType,
      nextActionDue: topRecord.nextActionDue,
      queueSection: topRecord.queueSection,
      queueReason: topRecord.queueReason,
      reasonString,
      phones: topRecord.phones,
      motivations: topRecord.motivations,
      hasOverdueTask: topRecord.hasOverdueTask,
      hasDueTodayTask: topRecord.hasDueTodayTask,
      hasCallback: topRecord.hasCallback,
      queuePosition: 1,
      totalInQueue: queue.length,
      section: section || 'all',
    })
  } catch (error) {
    console.error('Error fetching LCE next-up:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next-up record' },
      { status: 500 }
    )
  }
}
