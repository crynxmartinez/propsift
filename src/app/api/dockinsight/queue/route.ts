import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { computePriority, sortByPriority, filterByBucket, getBucketCounts, RecordWithRelations, Bucket } from '@/lib/scoring'
import { headers } from 'next/headers'

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

    // Format response for archived QueueList component
    const formattedRecords = paginatedRecords.map((r, index) => {
      return {
        id: r.id,
        ownerFullName: r.ownerFullName,
        propertyStreet: r.propertyStreet,
        propertyCity: r.propertyCity,
        propertyState: r.propertyState,
        temperature: r.temperature,
        score: r.priority.score,
        nextAction: r.priority.nextAction,
        topReason: r.priority.topReason,
        reasonString: r.priority.reasonString,
        confidence: r.priority.confidence,
        phoneCount: r.phoneNumbers.length,
        hasMobile: r.phoneNumbers.some(p => p.type?.toUpperCase() === 'MOBILE'),
        motivationCount: r.recordMotivations.length,
        topMotivation: r.recordMotivations[0]?.motivation.name || null,
        hasOverdueTask: r.priority.flags.hasOverdueTask,
        queuePosition: offset + index + 1,
      }
    })

    return NextResponse.json({
      bucket,
      total: filteredRecords.length,
      offset,
      limit,
      records: formattedRecords,
      hasMore: offset + limit < filteredRecords.length,
    })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
