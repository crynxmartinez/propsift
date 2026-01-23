/**
 * LCE v4.0 Maintenance Cron Job
 * 
 * Runs daily to:
 * 1. Auto-unsnooze expired snoozes
 * 2. Process re-enrollment queue
 * 3. Detect stale engaged records (21+ days)
 * 4. Check for phone exhaustion
 * 5. Reactivate DEEP_PROSPECT records with new phones
 * 6. Refresh queue tiers
 * 
 * Triggered by Vercel Cron at midnight UTC
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  reEnrollRecord,
  handlePhoneAdded,
  calculateReEnrollmentDate,
  isStaleEngaged,
  assignQueueTier,
  type CadencePhase,
  type CadenceState,
  type TemperatureBand,
  STALE_ENGAGED_DAYS,
  NEVER_RE_ENROLL_STATES,
} from '@/lib/lce/v4'

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = {
      unsnoozed: 0,
      reEnrolled: 0,
      staleEngagedMarked: 0,
      phoneExhaustedMarked: 0,
      deepProspectReactivated: 0,
      queueTiersRefreshed: 0,
      errors: [] as string[],
    }

    // 1. Auto-unsnooze expired snoozes
    try {
      const expiredSnoozes = await prisma.record.updateMany({
        where: {
          snoozedUntil: { lte: now },
          cadenceState: 'SNOOZED',
        },
        data: {
          snoozedUntil: null,
          cadenceState: 'ACTIVE',
          nextActionDue: now,
        } as any,
      })
      results.unsnoozed = expiredSnoozes.count
    } catch (error) {
      results.errors.push(`Unsnooze error: ${error}`)
    }

    // 2. Process re-enrollment queue
    try {
      const reEnrollmentCandidates = await prisma.record.findMany({
        where: {
          reEnrollmentDate: { lte: now },
          cadenceState: { in: ['COMPLETED_NO_CONTACT', 'LONG_TERM_NURTURE'] },
        },
        select: {
          id: true,
          temperature: true,
          enrollmentCount: true,
          cadenceState: true,
        },
        take: 100,
      })

      for (const record of reEnrollmentCandidates) {
        try {
          const reEnrollData = reEnrollRecord({
            temperatureBand: (record.temperature as TemperatureBand) || 'WARM',
            enrollmentCount: (record as any).enrollmentCount || 0,
            cadenceState: (record as any).cadenceState as CadenceState,
          })

          if (reEnrollData) {
            await prisma.record.update({
              where: { id: record.id },
              data: reEnrollData as any,
            })
            results.reEnrolled++
          }
        } catch (error) {
          results.errors.push(`Re-enroll ${record.id}: ${error}`)
        }
      }
    } catch (error) {
      results.errors.push(`Re-enrollment query error: ${error}`)
    }

    // 3. Detect stale engaged records (21+ days without activity)
    try {
      const staleDaysAgo = new Date(now.getTime() - STALE_ENGAGED_DAYS * 24 * 60 * 60 * 1000)

      const staleEngagedRecords = await prisma.record.findMany({
        where: {
          cadenceState: 'EXITED_ENGAGED',
          updatedAt: { lt: staleDaysAgo },
        },
        select: { id: true, temperature: true, enrollmentCount: true },
        take: 100,
      })

      for (const record of staleEngagedRecords) {
        try {
          // Re-enroll stale engaged records with GENTLE cadence
          const reEnrollData = reEnrollRecord({
            temperatureBand: (record.temperature as TemperatureBand) || 'WARM',
            enrollmentCount: (record as any).enrollmentCount || 0,
            cadenceState: 'EXITED_ENGAGED' as CadenceState,
          }, true) // isStaleEngaged = true

          if (reEnrollData) {
            await prisma.record.update({
              where: { id: record.id },
              data: {
                ...reEnrollData,
                cadenceState: 'STALE_ENGAGED',
              } as any,
            })
            results.staleEngagedMarked++
          }
        } catch (error) {
          results.errors.push(`Stale engaged ${record.id}: ${error}`)
        }
      }
    } catch (error) {
      results.errors.push(`Stale engaged query error: ${error}`)
    }

    // 4. Check for phone exhaustion
    try {
      const activeRecords = await prisma.record.findMany({
        where: {
          cadenceState: 'ACTIVE',
        },
        include: {
          phoneNumbers: true,
        },
        take: 200,
      })

      for (const record of activeRecords) {
        const rec = record as any
        // Skip if already marked as exhausted
        if (rec.phoneExhaustedAt) continue

        const hasCallablePhone = record.phoneNumbers.some(
          (p: any) => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
        )

        if (!hasCallablePhone && record.phoneNumbers.length > 0) {
          try {
            await prisma.record.update({
              where: { id: record.id },
              data: {
                phoneExhaustedAt: now,
                currentPhase: 'DEEP_PROSPECT',
                nextActionType: 'SKIPTRACE',
                nextActionDue: null,
              } as any,
            })
            results.phoneExhaustedMarked++
          } catch (error) {
            results.errors.push(`Phone exhausted ${record.id}: ${error}`)
          }
        }
      }
    } catch (error) {
      results.errors.push(`Phone exhaustion query error: ${error}`)
    }

    // 5. Reactivate DEEP_PROSPECT records with new phones
    try {
      const deepProspectRecords = await prisma.record.findMany({
        where: {
          currentPhase: 'DEEP_PROSPECT',
          phoneNumbers: {
            some: {
              phoneStatus: { in: ['VALID', 'UNVERIFIED'] },
              attemptCount: 0,
            },
          },
        },
        select: { id: true, currentPhase: true },
        take: 50,
      })

      for (const record of deepProspectRecords) {
        try {
          const reactivateData = handlePhoneAdded({
            cadencePhase: ((record as any).currentPhase || 'DEEP_PROSPECT') as CadencePhase,
            cadenceState: 'ACTIVE' as CadenceState,
          })

          await prisma.record.update({
            where: { id: record.id },
            data: {
              ...reactivateData,
              phoneExhaustedAt: null,
            } as any,
          })
          results.deepProspectReactivated++
        } catch (error) {
          results.errors.push(`Reactivate ${record.id}: ${error}`)
        }
      }
    } catch (error) {
      results.errors.push(`Deep prospect query error: ${error}`)
    }

    // 6. Refresh queue tiers for active records
    try {
      const activeRecordsForTier = await prisma.record.findMany({
        where: {
          cadenceState: { in: ['ACTIVE', 'NOT_ENROLLED'] },
        },
        include: {
          phoneNumbers: true,
          tasks: {
            where: {
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
          },
        },
        take: 500,
      })

      for (const record of activeRecordsForTier) {
        const rec = record as any
        const hasValidPhone = record.phoneNumbers.some(
          p => p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
        )
        const hasOverdueTask = record.tasks.some(
          t => t.dueDate && new Date(t.dueDate) < now
        )
        const hasDueTodayTask = record.tasks.some(t => {
          if (!t.dueDate) return false
          const taskDate = new Date(t.dueDate)
          return taskDate.toDateString() === now.toDateString()
        })

        const queueAssignment = assignQueueTier({
          cadencePhase: rec.cadencePhase || 'NEW',
          cadenceState: rec.cadenceState || 'ACTIVE',
          callbackScheduledFor: rec.callbackScheduledFor || null,
          nextActionDue: rec.nextActionDue || null,
          callAttempts: record.callAttempts || 0,
          hasOverdueTask,
          hasDueTodayTask,
          priorityScore: record.priorityScore || 50,
          confidenceLevel: 'MEDIUM',
          phoneExhaustedAt: rec.phoneExhaustedAt || null,
          hasValidPhone,
          phoneCount: record.phoneNumbers.length,
        })

        if (rec.queueTier !== queueAssignment.tier) {
          try {
            await prisma.record.update({
              where: { id: record.id },
              data: { queueTier: queueAssignment.tier } as any,
            })
            results.queueTiersRefreshed++
          } catch (error) {
            // Silently skip tier update errors
          }
        }
      }
    } catch (error) {
      results.errors.push(`Queue tier refresh error: ${error}`)
    }

    // Log maintenance run
    try {
      await prisma.reconciliationLog.create({
        data: {
          runType: 'LCE_V4_MAINTENANCE',
          status: results.errors.length === 0 ? 'COMPLETED' : 'PARTIAL',
          recordsScanned:
            results.unsnoozed +
            results.reEnrolled +
            results.staleEngagedMarked +
            results.phoneExhaustedMarked +
            results.deepProspectReactivated +
            results.queueTiersRefreshed,
          issuesFound: results.staleEngagedMarked + results.phoneExhaustedMarked,
          issuesFixed:
            results.unsnoozed +
            results.reEnrolled +
            results.deepProspectReactivated,
          fixes: results as object,
          completedAt: new Date(),
          errorMessage: results.errors.length > 0 ? results.errors.join('; ') : null,
        },
      })
    } catch (error) {
      console.error('Failed to create maintenance log:', error)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('LCE v4.0 Maintenance error:', error)
    return NextResponse.json(
      { error: 'Maintenance failed', details: String(error) },
      { status: 500 }
    )
  }
}
