import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { computePriority, sortByPriority, filterByBucket, getBucketCounts, RecordWithRelations, Bucket } from '@/lib/scoring'
import { headers } from 'next/headers'
import {
  assignQueueTier,
  type CadencePhase,
  type CadenceState,
  type QueueTier,
  type TemperatureBand,
} from '@/lib/lce/v4'

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

    // Get query params
    const { searchParams } = new URL(request.url)
    const bucket = (searchParams.get('bucket') || 'call-now') as Bucket
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Fetch all records with relations
    const records = await prisma.record.findMany({
      where: {
        createdById: ownerId,
      },
      include: {
        phoneNumbers: true,
        recordMotivations: {
          include: {
            motivation: true,
          },
        },
        recordTags: {
          include: {
            tag: true,
          },
        },
        tasks: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          orderBy: {
            dueDate: 'asc',
          },
        },
        status: true,
      },
    })

    // Compute priority for all records
    const scoredRecords = records.map(record => ({
      ...record,
      priority: computePriority(record as unknown as RecordWithRelations),
    }))

    // Get bucket counts for all buckets
    const bucketCounts = getBucketCounts(scoredRecords)

    // Filter by requested bucket
    const filteredRecords = filterByBucket(scoredRecords, bucket)

    // Sort by priority
    const sortedRecords = sortByPriority(filteredRecords)

    // Apply pagination
    const paginatedRecords = sortedRecords.slice(offset, offset + limit)

    // Format response with LCE v4.0 queue tier info
    const formattedRecords = paginatedRecords.map((r, index) => {
      const rec = r as any
      const phoneCount = r.phoneNumbers.length
      const hasValidPhone = r.phoneNumbers.some(p => 
        p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
      )

      // Calculate LCE v4.0 queue tier
      const confidenceStr = String(r.priority.confidence).toUpperCase()
      const queueAssignment = assignQueueTier({
        cadencePhase: (rec.cadencePhase as CadencePhase) || 'NEW',
        cadenceState: (rec.cadenceState as CadenceState) || 'ACTIVE',
        callbackScheduledFor: rec.callbackScheduledFor || null,
        nextActionDue: rec.nextActionDue || null,
        callAttempts: r.callAttempts || 0,
        hasOverdueTask: r.priority.flags.hasOverdueTask,
        hasDueTodayTask: r.priority.flags.hasTask || false,
        priorityScore: r.priority.score,
        confidenceLevel: confidenceStr === 'HIGH' ? 'HIGH' : confidenceStr === 'LOW' ? 'LOW' : 'MEDIUM',
        phoneExhaustedAt: rec.phoneExhaustedAt || null,
        hasValidPhone,
        phoneCount,
      })

      return {
        id: r.id,
        ownerFullName: r.ownerFullName,
        ownerFirstName: r.ownerFirstName,
        ownerLastName: r.ownerLastName,
        propertyStreet: r.propertyStreet,
        propertyCity: r.propertyCity,
        propertyState: r.propertyState,
        propertyZip: r.propertyZip,
        temperature: r.temperature,
        score: r.priority.score,
        nextAction: r.priority.nextAction,
        topReason: r.priority.topReason,
        reasonString: r.priority.reasonString,
        confidence: r.priority.confidence,
        lastContactedAt: rec.lastContactedAt || null,
        hasEngaged: rec.hasEngaged || false,
        callAttempts: r.callAttempts,
        phoneCount,
        hasMobile: r.phoneNumbers.some(p => p.type?.toUpperCase() === 'MOBILE'),
        motivationCount: r.recordMotivations.length,
        topMotivation: r.recordMotivations[0]?.motivation.name || null,
        hasOverdueTask: r.priority.flags.hasOverdueTask,
        queuePosition: offset + index + 1,
        // LCE v4.0 fields
        cadencePhase: rec.cadencePhase || 'NEW',
        cadenceState: rec.cadenceState || 'ACTIVE',
        cadenceType: rec.cadenceType || null,
        cadenceStep: rec.cadenceStep || 0,
        cadenceProgress: rec.cadenceProgress || null,
        nextActionDue: rec.nextActionDue || null,
        nextActionType: rec.nextActionType || null,
        queueTier: queueAssignment.tier,
        queueBucket: queueAssignment.bucket,
        queueReason: queueAssignment.reason,
        blitzAttempts: rec.blitzAttempts || 0,
        enrollmentCount: rec.enrollmentCount || 0,
        snoozedUntil: rec.snoozedUntil || null,
        hasValidPhone,
      }
    })

    return NextResponse.json({
      bucket,
      total: filteredRecords.length,
      offset,
      limit,
      records: formattedRecords,
      bucketCounts,
    })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
