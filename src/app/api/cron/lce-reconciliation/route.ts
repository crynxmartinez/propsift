import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * LCE v3.0 Daily Reconciliation Cron Job
 * 
 * Runs daily to:
 * 1. Auto-unsnooze expired snoozes
 * 2. Auto-enroll NEW records with valid phones
 * 3. Check for stale records (no activity in 7+ days)
 * 4. Reset blitz for records stuck in DEEP_PROSPECT with new phones
 * 
 * Triggered by Vercel Cron at midnight UTC
 */

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
      autoEnrolled: 0,
      staleChecked: 0,
      deepProspectReactivated: 0,
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
        },
      })
      results.unsnoozed = expiredSnoozes.count
    } catch (error) {
      results.errors.push(`Unsnooze error: ${error}`)
    }

    // 2. NOTE: Auto-enrollment removed - LCE enrollment now triggers when 
    //    status changes to "New Lead" (see /api/records/[id]/route.ts)
    //    This ensures users explicitly mark records as ready to work before
    //    they enter the First-to-Market cadence system.

    // 3. Check for DEEP_PROSPECT records that now have new phones
    try {
      const deepProspectRecords = await prisma.record.findMany({
        where: {
          currentPhase: 'DEEP_PROSPECT',
          phoneNumbers: {
            some: {
              phoneStatus: { notIn: ['WRONG', 'DISCONNECTED', 'DNC'] },
              attemptCount: 0, // New phone that hasn't been tried
            },
          },
        },
        select: { id: true },
        take: 50,
      })

      for (const record of deepProspectRecords) {
        try {
          await prisma.record.update({
            where: { id: record.id },
            data: {
              currentPhase: 'BLITZ_2',
              cadenceState: 'ACTIVE',
              nextActionDue: now,
              nextActionType: 'CALL',
              blitzAttempts: 0,
            } as Parameters<typeof prisma.record.update>[0]['data'],
          })
          results.deepProspectReactivated++
        } catch (error) {
          results.errors.push(`Reactivate ${record.id}: ${error}`)
        }
      }
    } catch (error) {
      results.errors.push(`Deep prospect query error: ${error}`)
    }

    // 4. Check for stale ACTIVE records (no activity in 7+ days)
    try {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const staleRecords = await prisma.record.count({
        where: {
          cadenceState: 'ACTIVE',
          updatedAt: { lt: sevenDaysAgo },
          nextActionDue: { lt: sevenDaysAgo },
        },
      })
      results.staleChecked = staleRecords
    } catch (error) {
      results.errors.push(`Stale check error: ${error}`)
    }

    // Log reconciliation run
    try {
      await prisma.reconciliationLog.create({
        data: {
          runType: 'DAILY',
          status: results.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
          recordsProcessed: results.unsnoozed + results.autoEnrolled + results.deepProspectReactivated,
          issuesFound: results.staleChecked,
          issuesFixed: results.unsnoozed + results.autoEnrolled + results.deepProspectReactivated,
          details: JSON.stringify(results),
        },
      })
    } catch (error) {
      // Log creation failed, but don't fail the whole job
      console.error('Failed to create reconciliation log:', error)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('LCE Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed', details: String(error) },
      { status: 500 }
    )
  }
}
