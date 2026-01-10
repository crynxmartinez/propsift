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

    // Filter by bucket if specified - DO NOT fall back to other buckets
    let filteredRecords = workableRecords
    let actualBucket = bucket || 'all'
    
    if (bucket) {
      filteredRecords = filterByBucket(workableRecords, bucket)
      // Do NOT fall back - if bucket is empty, show empty state
    }

    if (filteredRecords.length === 0) {
      return NextResponse.json({
        record: null,
        message: bucket ? `No records in ${bucket} queue` : 'No workable records found',
        bucket: actualBucket,
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

    // Calculate bucket counts for BucketSelector
    const bucketCounts = {
      callNow: filterByBucket(workableRecords, 'call-now').length,
      followUp: filterByBucket(workableRecords, 'follow-up-today').length,
      queue: filterByBucket(workableRecords, 'call-queue').length,
      tasks: workableRecords.filter(r => r.tasks && r.tasks.length > 0).length,
      newLeads: filterByBucket(workableRecords, 'nurture').length,
      getNumbers: filterByBucket(workableRecords, 'get-numbers').length,
    }

    // Map temperature to band
    const tempBand = (record.temperature?.toUpperCase() || 'COLD') as 'HOT' | 'WARM' | 'COLD' | 'ICE'
    const temperatureBand = ['HOT', 'WARM', 'COLD', 'ICE'].includes(tempBand) ? tempBand : 'COLD'

    // Map confidence
    const confidenceMap: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
      'High': 'HIGH',
      'Medium': 'MEDIUM', 
      'Low': 'LOW',
    }
    const confidenceLevel = confidenceMap[topRecord.priority.confidence] || 'MEDIUM'

    // Build score components from reasons
    const scoreComponents = topRecord.priority.reasons.map(r => ({
      name: r.label,
      value: r.delta,
      maxValue: 20,
    }))

    // Format response for NextUpCard component
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
        hasEngaged: record.hasEngaged || false,
      },
      score: topRecord.priority.score,
      confidenceLevel,
      scoreComponents,
      reasonString: topRecord.priority.reasonString,
      temperatureBand,
      cadenceStep: 1,
      totalSteps: 5,
      cadenceName: temperatureBand,
      nextActionType: topRecord.priority.nextAction,
      queueSection: actualBucket,
      queueReason: topRecord.priority.topReason,
      phones: record.phoneNumbers.map(p => ({
        id: p.id,
        number: p.number,
        type: p.type,
        statuses: p.statuses || [],
      })),
      motivations: record.recordMotivations.map(rm => ({
        id: rm.motivation.id,
        name: rm.motivation.name,
      })),
      pendingTask: pendingTask ? {
        id: pendingTask.id,
        title: pendingTask.title,
        dueDate: pendingTask.dueDate,
        priority: pendingTask.priority,
      } : null,
      totalInQueue: filteredRecords.length,
      contactLogs: [],
      flags: {
        hasValidPhone: topRecord.priority.flags.hasValidPhone,
        hasMobilePhone: topRecord.priority.flags.hasMobilePhone,
        hasCallablePhone: topRecord.priority.flags.hasCallablePhone,
        hasEmail: topRecord.priority.flags.hasEmail,
        hasTask: topRecord.priority.flags.hasTask,
        hasOverdueTask: topRecord.priority.flags.hasOverdueTask,
        isDnc: topRecord.priority.flags.isDnc,
        isClosed: topRecord.priority.flags.isClosed,
        isSnoozed: topRecord.priority.flags.isSnoozed,
        neverContacted: topRecord.priority.flags.neverContacted,
        hasCallback: false,
        isPaused: false,
      },
      bucketCounts,
    })
  } catch (error) {
    console.error('Error fetching next-up record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next-up record' },
      { status: 500 }
    )
  }
}
