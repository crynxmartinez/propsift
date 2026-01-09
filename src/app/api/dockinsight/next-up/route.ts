import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { computePriority, sortByPriority, RecordWithRelations, PriorityResult } from '@/lib/scoring'
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

export async function GET() {
  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    const authUser = await getAuthUser(authHeader || '')
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ownerId = authUser.ownerId

    // Fetch all workable records with relations
    // Note: snoozedUntil filter will work after schema migration is applied
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
      })
    }

    // Sort by priority and get the top one
    const sorted = sortByPriority(workableRecords)
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
      totalInQueue: workableRecords.filter(r => r.priority.nextAction === topRecord.priority.nextAction).length,
    })
  } catch (error) {
    console.error('Error fetching next-up record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch next-up record' },
      { status: 500 }
    )
  }
}
