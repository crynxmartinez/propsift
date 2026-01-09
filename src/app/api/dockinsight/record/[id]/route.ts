import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { computePriority, RecordWithRelations } from '@/lib/scoring'
import { headers } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    const recordId = params.id

    // Fetch the record with all relations
    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        createdById: authUser.ownerId,
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

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Compute priority
    const priority = computePriority(record as unknown as RecordWithRelations)

    // Get pending task
    const pendingTask = record.tasks?.find(
      t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ) || null

    // Cast to access new fields
    const r = record as unknown as {
      lastContactedAt?: Date | null
      lastContactType?: string | null
      lastContactResult?: string | null
      hasEngaged?: boolean
      snoozedUntil?: Date | null
    } & typeof record

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
        mailingStreet: record.mailingStreet,
        mailingCity: record.mailingCity,
        mailingState: record.mailingState,
        mailingZip: record.mailingZip,
        temperature: record.temperature,
        callAttempts: record.callAttempts,
        lastContactedAt: r.lastContactedAt || null,
        lastContactType: r.lastContactType || null,
        lastContactResult: r.lastContactResult || null,
        hasEngaged: r.hasEngaged || false,
        skiptraceDate: record.skiptraceDate,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      score: priority.score,
      nextAction: priority.nextAction,
      confidence: priority.confidence,
      reasons: priority.reasons,
      topReason: priority.topReason,
      reasonString: priority.reasonString,
      suggestions: priority.suggestions,
      flags: priority.flags,
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
    })
  } catch (error) {
    console.error('Error fetching record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    )
  }
}
