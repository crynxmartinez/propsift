import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { computePriority, sortByPriority, filterByBucket, RecordWithRelations, PriorityResult, Bucket } from '@/lib/scoring'
import { headers } from 'next/headers'

// Type for record with included relations
interface RecordWithIncludes {
  id: string
  ownerFullName: string
  ownerFirstName: string | null
  ownerLastName: string | null
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  temperature: string | null
  callAttempts: number
  skiptraceDate: Date | null
  createdAt: Date
  updatedAt: Date
  lastContactedAt?: Date | null
  lastContactType?: string | null
  lastContactResult?: string | null
  hasEngaged?: boolean
  snoozedUntil?: Date | null
  phoneNumbers: Array<{
    id: string
    number: string
    type: string
    statuses: string[]
  }>
  recordMotivations: Array<{
    motivation: {
      id: string
      name: string
    }
  }>
  recordTags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
  tasks: Array<{
    id: string
    title: string
    dueDate: Date | null
    status: string
    priority: string
  }>
  status: {
    id: string
    name: string
    color: string
  } | null
}

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

    // Get bucket filter from query params
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') as Bucket | null

    // Fetch all workable records with relations
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
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (records.length === 0) {
      return NextResponse.json({
        record: null,
        message: 'No records found',
      })
    }

    // Compute priority for all records
    const scoredRecords = records.map(record => ({
      ...record,
      priority: computePriority(record as unknown as RecordWithRelations),
    }))

    // Filter out not workable records
    const workableRecords = scoredRecords.filter(
      r => r.priority.nextAction !== 'Not Workable'
    )

    if (workableRecords.length === 0) {
      return NextResponse.json({
        record: null,
        message: 'No workable records found',
        bucket: bucket || 'all',
        totalInQueue: 0,
      })
    }

    // Filter by bucket if specified
    let filteredRecords = workableRecords
    if (bucket) {
      filteredRecords = filterByBucket(workableRecords, bucket)
    }

    if (filteredRecords.length === 0) {
      return NextResponse.json({
        record: null,
        message: `No records in ${bucket} bucket`,
        bucket: bucket || 'all',
        totalInQueue: 0,
      })
    }

    // Sort by priority and get the top one
    const sorted = sortByPriority(filteredRecords)
    const topRecord = sorted[0]

    // Get pending task for this record
    const pendingTask = topRecord.tasks?.find(
      t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ) || null

    // Cast to include new fields (will be available after migration)
    const record = topRecord as unknown as RecordWithIncludes

    // Format response
    return NextResponse.json({
      record: {
        id: record.id,
        ownerFullName: record.ownerFullName,
        ownerFirstName: record.ownerFirstName,
        ownerLastName: record.ownerLastName,
        propertyStreet: record.propertyStreet,
        propertyCity: record.propertyCity,
        propertyState: record.propertyState,
        propertyZip: record.propertyZip,
        temperature: record.temperature,
        callAttempts: record.callAttempts,
        lastContactedAt: record.lastContactedAt || null,
        lastContactType: record.lastContactType || null,
        lastContactResult: record.lastContactResult || null,
        hasEngaged: record.hasEngaged || false,
        skiptraceDate: record.skiptraceDate,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      score: topRecord.priority.score,
      nextAction: topRecord.priority.nextAction,
      confidence: topRecord.priority.confidence,
      reasons: topRecord.priority.reasons,
      topReason: topRecord.priority.topReason,
      reasonString: topRecord.priority.reasonString,
      suggestions: topRecord.priority.suggestions,
      flags: topRecord.priority.flags,
      phones: record.phoneNumbers.map(p => ({
        id: p.id,
        number: p.number,
        type: p.type,
        statuses: p.statuses,
      })),
      motivations: record.recordMotivations.map(rm => ({
        id: rm.motivation.id,
        name: rm.motivation.name,
      })),
      tags: record.recordTags.map(rt => ({
        id: rt.tag.id,
        name: rt.tag.name,
      })),
      pendingTask: pendingTask ? {
        id: pendingTask.id,
        title: pendingTask.title,
        dueDate: pendingTask.dueDate,
        status: pendingTask.status,
        priority: pendingTask.priority,
      } : null,
      queuePosition: 1,
      totalInQueue: filteredRecords.length,
      bucket: bucket || 'all',
    })
  } catch (error) {
    console.error('Error fetching next-up record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next-up record' },
      { status: 500 }
    )
  }
}
