import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { handleNewPhoneAdded, type LCEPhase } from '@/lib/lce/first-to-market'

interface PhoneAddedRequest {
  recordId: string
  phoneId: string
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

    const body: PhoneAddedRequest = await request.json()
    const { recordId, phoneId } = body

    if (!recordId) {
      return NextResponse.json(
        { error: 'recordId is required' },
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

    // Get current phase (with fallback for new schema)
    const currentPhase = ((record as Record<string, unknown>).currentPhase as string) || 'NEW'

    // Calculate new enrollment based on phone added
    const enrollment = handleNewPhoneAdded(currentPhase as LCEPhase)

    // Update record with new phase
    await prisma.record.update({
      where: { id: recordId },
      data: {
        currentPhase: enrollment.phase,
        cadenceState: enrollment.cadenceState,
        nextActionDue: enrollment.nextActionDue,
        nextActionType: enrollment.nextActionType,
        blitzAttempts: 0, // Reset blitz attempts
        lastBlitzDate: null, // Reset last blitz date
      } as Parameters<typeof prisma.record.update>[0]['data'],
    })

    // Mark the new phone as primary if it's the first valid one
    if (phoneId) {
      const phoneCount = await prisma.recordPhoneNumber.count({
        where: { recordId, isPrimary: true },
      })
      
      if (phoneCount === 0) {
        await prisma.recordPhoneNumber.update({
          where: { id: phoneId },
          data: { isPrimary: true },
        })
      }
    }

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId,
        userId: authUser.id,
        action: 'lce_phone_added',
        field: 'currentPhase',
        oldValue: currentPhase,
        newValue: enrollment.phase,
        source: 'lce_phone_added',
      },
    })

    return NextResponse.json({
      success: true,
      previousPhase: currentPhase,
      newPhase: enrollment.phase,
      nextActionDue: enrollment.nextActionDue,
      reason: enrollment.reason,
    })
  } catch (error) {
    console.error('Error handling phone added:', error)
    return NextResponse.json(
      { error: 'Failed to process phone added' },
      { status: 500 }
    )
  }
}
