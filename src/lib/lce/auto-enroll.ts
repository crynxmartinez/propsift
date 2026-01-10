/**
 * LCE v3.0 - Auto-Enrollment Service
 * 
 * Automatically enrolls records in the First-to-Market cadence system
 */

import { prisma } from '@/lib/prisma'
import { enrollNewLead, handleNewPhoneAdded, type LCEPhase } from './first-to-market'

// ============================================
// AUTO-ENROLL NEW RECORD
// ============================================

export async function autoEnrollRecord(recordId: string): Promise<{
  success: boolean
  phase: LCEPhase
  reason: string
}> {
  try {
    // Fetch record with phones
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        phoneNumbers: true,
        status: true,
      },
    })

    if (!record) {
      return { success: false, phase: 'NEW', reason: 'Record not found' }
    }

    // Check if already enrolled
    if (record.currentPhase !== 'NEW' && record.cadenceState !== 'NOT_ENROLLED') {
      return { 
        success: false, 
        phase: record.currentPhase as LCEPhase, 
        reason: 'Already enrolled' 
      }
    }

    // Check if record is workable (not DNC, Dead, etc.)
    const statusName = record.status?.name?.toLowerCase() || ''
    const blockedStatuses = ['dead', 'dnc', 'do not call', 'sold', 'closed', 'not interested']
    if (blockedStatuses.some(s => statusName.includes(s))) {
      return { 
        success: false, 
        phase: 'NEW', 
        reason: `Blocked status: ${record.status?.name}` 
      }
    }

    // Check if has valid phone
    const hasValidPhone = record.phoneNumbers.some(p => {
      const statuses = p.statuses || []
      const badStatuses = ['wrong', 'disconnected', 'invalid', 'bad', 'dnc']
      return !statuses.some(s => badStatuses.some(bad => s.toLowerCase().includes(bad)))
    })

    // Get enrollment result
    const enrollment = enrollNewLead(hasValidPhone)

    // Update record
    await prisma.record.update({
      where: { id: recordId },
      data: {
        currentPhase: enrollment.phase,
        cadenceState: enrollment.cadenceState,
        nextActionDue: enrollment.nextActionDue,
        nextActionType: enrollment.nextActionType,
        cadenceStartDate: new Date(),
        blitzAttempts: 0,
        enrollmentCount: { increment: 1 },
      },
    })

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId,
        userId: record.createdById || 'system',
        action: 'lce_enrolled',
        field: 'currentPhase',
        oldValue: 'NEW',
        newValue: enrollment.phase,
        source: 'lce_auto_enroll',
      },
    })

    return {
      success: true,
      phase: enrollment.phase,
      reason: enrollment.reason,
    }
  } catch (error) {
    console.error('Auto-enroll error:', error)
    return { success: false, phase: 'NEW', reason: 'Database error' }
  }
}

// ============================================
// HANDLE NEW PHONE ADDED
// ============================================

export async function handlePhoneAdded(recordId: string): Promise<{
  success: boolean
  phase: LCEPhase
  reason: string
}> {
  try {
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      select: {
        currentPhase: true,
        cadenceState: true,
      },
    })

    if (!record) {
      return { success: false, phase: 'NEW', reason: 'Record not found' }
    }

    const currentPhase = (record.currentPhase || 'NEW') as LCEPhase
    const enrollment = handleNewPhoneAdded(currentPhase)

    // Update record
    await prisma.record.update({
      where: { id: recordId },
      data: {
        currentPhase: enrollment.phase,
        cadenceState: enrollment.cadenceState,
        nextActionDue: enrollment.nextActionDue,
        nextActionType: enrollment.nextActionType,
        blitzAttempts: 0, // Reset blitz attempts
        lastBlitzDate: null, // Reset last blitz date
      },
    })

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId,
        userId: 'system',
        action: 'lce_phone_added',
        field: 'currentPhase',
        oldValue: currentPhase,
        newValue: enrollment.phase,
        source: 'lce_auto_enroll',
      },
    })

    return {
      success: true,
      phase: enrollment.phase,
      reason: enrollment.reason,
    }
  } catch (error) {
    console.error('Handle phone added error:', error)
    return { success: false, phase: 'NEW', reason: 'Database error' }
  }
}

// ============================================
// BULK AUTO-ENROLL (for existing records)
// ============================================

export async function bulkAutoEnroll(ownerId: string): Promise<{
  enrolled: number
  skipped: number
  errors: number
}> {
  let enrolled = 0
  let skipped = 0
  let errors = 0

  try {
    // Find all NEW records that haven't been enrolled
    const records = await prisma.record.findMany({
      where: {
        createdById: ownerId,
        currentPhase: 'NEW',
        cadenceState: 'NOT_ENROLLED',
      },
      select: { id: true },
    })

    for (const record of records) {
      const result = await autoEnrollRecord(record.id)
      if (result.success) {
        enrolled++
      } else if (result.reason === 'Already enrolled') {
        skipped++
      } else {
        errors++
      }
    }

    return { enrolled, skipped, errors }
  } catch (error) {
    console.error('Bulk auto-enroll error:', error)
    return { enrolled, skipped, errors: errors + 1 }
  }
}
