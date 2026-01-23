/**
 * LCE v4.0 Enroll API
 * POST /api/lce/enroll
 * 
 * Enrolls a record into the LCE v4.0 cadence system
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  enrollRecord,
  type TemperatureBand,
} from '@/lib/lce/v4'

interface EnrollRequest {
  recordId: string
  temperatureBand?: TemperatureBand
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

    const body: EnrollRequest = await request.json()
    const { recordId, temperatureBand = 'WARM' } = body

    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 })
    }

    // Fetch record with phones
    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        createdById: authUser.ownerId,
      },
      include: {
        phoneNumbers: true,
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Check if record has valid phones
    const hasValidPhone = record.phoneNumbers.some(p =>
      p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
    )

    // Get enrollment data from LCE v4.0
    const enrollmentData = enrollRecord(hasValidPhone, temperatureBand)

    // Update record with enrollment data
    await prisma.record.update({
      where: { id: recordId },
      data: {
        cadencePhase: enrollmentData.cadencePhase,
        cadenceState: enrollmentData.cadenceState,
        cadenceType: enrollmentData.cadenceType,
        cadenceStep: enrollmentData.cadenceStep,
        cadenceStartDate: enrollmentData.cadenceStartDate,
        cadenceProgress: enrollmentData.cadenceProgress,
        nextActionDue: enrollmentData.nextActionDue,
        nextActionType: enrollmentData.nextActionType,
        blitzAttempts: enrollmentData.blitzAttempts,
        blitzStartedAt: enrollmentData.blitzStartedAt,
        enrollmentCount: enrollmentData.enrollmentCount,
        queueTier: enrollmentData.queueTier,
      } as any,
    })

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId,
        userId: authUser.id,
        action: 'lce_enrolled',
        field: 'cadencePhase',
        oldValue: null,
        newValue: enrollmentData.cadencePhase,
        source: 'api',
      },
    })

    return NextResponse.json({
      success: true,
      recordId,
      enrollment: {
        phase: enrollmentData.cadencePhase,
        state: enrollmentData.cadenceState,
        cadenceType: enrollmentData.cadenceType,
        step: enrollmentData.cadenceStep,
        nextActionDue: enrollmentData.nextActionDue,
        nextActionType: enrollmentData.nextActionType,
        queueTier: enrollmentData.queueTier,
      },
    })
  } catch (error) {
    console.error('Error enrolling record:', error)
    return NextResponse.json(
      { error: 'Failed to enroll record' },
      { status: 500 }
    )
  }
}
