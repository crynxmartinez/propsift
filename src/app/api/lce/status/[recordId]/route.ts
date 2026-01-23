/**
 * LCE v4.0 Status API
 * GET /api/lce/status/[recordId]
 * 
 * Returns detailed LCE status for a record including:
 * - Phase and state
 * - Cadence progress
 * - Phone summary
 * - Queue tier
 * - Re-enrollment info
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  getRecordLCEStatus,
  type PhoneData,
  type LCERecord,
  type CadencePhase,
  type CadenceState,
  type CadenceType,
  type TemperatureBand,
  type QueueTier,
} from '@/lib/lce/v4'

export async function GET(
  request: Request,
  { params }: { params: { recordId: string } }
) {
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

    const { recordId } = params

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

    const rec = record as any

    // Convert phones to PhoneData format
    const phoneData: PhoneData[] = record.phoneNumbers.map(p => ({
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

    // Build LCE record
    const lceRecord: LCERecord = {
      id: record.id,
      priorityScore: record.priorityScore || 50,
      temperatureBand: (record.temperature as TemperatureBand) || 'WARM',
      confidenceLevel: 'MEDIUM',
      cadencePhase: (rec.cadencePhase as CadencePhase) || 'NEW',
      cadenceState: (rec.cadenceState as CadenceState) || 'ACTIVE',
      cadenceType: (rec.cadenceType as CadenceType) || null,
      cadenceStep: rec.cadenceStep || 0,
      cadenceStartDate: rec.cadenceStartDate || null,
      cadenceProgress: rec.cadenceProgress || null,
      nextActionDue: rec.nextActionDue || null,
      nextActionType: rec.nextActionType || null,
      callbackScheduledFor: rec.callbackScheduledFor || null,
      blitzAttempts: rec.blitzAttempts || 0,
      blitzStartedAt: rec.blitzStartedAt || null,
      temperatureStartedAt: rec.temperatureStartedAt || null,
      enrollmentCount: rec.enrollmentCount || 0,
      reEnrollmentDate: rec.reEnrollmentDate || null,
      cadenceExitDate: rec.cadenceExitDate || null,
      cadenceExitReason: rec.cadenceExitReason || null,
      lastPhoneCalledId: rec.lastPhoneCalledId || null,
      phoneExhaustedAt: rec.phoneExhaustedAt || null,
      hasValidPhone: phoneData.some(p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'),
      phoneCount: phoneData.length,
      queueTier: (rec.queueTier as QueueTier) || 9,
      callAttempts: record.callAttempts || 0,
      lastContactedAt: record.lastContactedAt || null,
      hasEngaged: record.hasEngaged || false,
      noResponseStreak: rec.noResponseStreak || 0,
      snoozedUntil: rec.snoozedUntil || null,
      pausedReason: rec.pausedReason || null,
      hasOverdueTask: false,
      hasDueTodayTask: false,
    }

    // Get LCE status
    const lceStatus = getRecordLCEStatus(lceRecord, phoneData)

    return NextResponse.json({
      success: true,
      recordId,
      lce: lceStatus,
    })
  } catch (error) {
    console.error('Error fetching LCE status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LCE status' },
      { status: 500 }
    )
  }
}
