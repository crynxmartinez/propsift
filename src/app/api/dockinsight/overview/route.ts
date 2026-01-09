import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { computePriority, getBucketCounts, RecordWithRelations } from '@/lib/scoring'
import { headers } from 'next/headers'

export async function GET() {
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
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    const startOfLastWeek = new Date(startOfWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

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
        },
        status: true,
      },
    })

    // Compute priority for all records
    const scoredRecords = records.map(record => ({
      ...record,
      priority: computePriority(record as unknown as RecordWithRelations),
    }))

    // Get bucket counts
    const bucketCounts = getBucketCounts(scoredRecords)

    // Temperature distribution
    const temperatureCounts = {
      hot: records.filter(r => r.temperature?.toUpperCase() === 'HOT').length,
      warm: records.filter(r => r.temperature?.toUpperCase() === 'WARM').length,
      cold: records.filter(r => r.temperature?.toUpperCase() === 'COLD' || !r.temperature).length,
    }

    // Records this week vs last week
    const recordsThisWeek = records.filter(r => new Date(r.createdAt) >= startOfWeek).length
    const recordsLastWeek = records.filter(r => 
      new Date(r.createdAt) >= startOfLastWeek && new Date(r.createdAt) < startOfWeek
    ).length

    // Today's activity (from activity logs)
    const todayActivity = await prisma.recordActivityLog.findMany({
      where: {
        record: {
          createdById: ownerId,
        },
        createdAt: {
          gte: today,
        },
      },
    })

    const callsMade = todayActivity.filter(a => 
      a.action.toLowerCase().includes('call') || 
      a.field === 'callAttempts'
    ).length

    const contacts = todayActivity.filter(a => 
      a.action.toLowerCase().includes('contact') ||
      a.newValue?.toLowerCase().includes('answered')
    ).length

    // Tasks due today
    const tasksDueToday = await prisma.task.count({
      where: {
        createdById: ownerId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })

    // Tasks completed today
    const tasksCompletedToday = await prisma.task.count({
      where: {
        createdById: ownerId,
        status: 'COMPLETED',
        completedAt: {
          gte: today,
        },
      },
    })

    // Top motivations
    const motivationCounts = await prisma.recordMotivation.groupBy({
      by: ['motivationId'],
      where: {
        record: {
          createdById: ownerId,
        },
      },
      _count: {
        motivationId: true,
      },
      orderBy: {
        _count: {
          motivationId: 'desc',
        },
      },
      take: 5,
    })

    const motivationIds = motivationCounts.map(m => m.motivationId)
    const motivations = await prisma.motivation.findMany({
      where: {
        id: { in: motivationIds },
      },
    })

    const topMotivations = motivationCounts.map(mc => {
      const motivation = motivations.find(m => m.id === mc.motivationId)
      return {
        name: motivation?.name || 'Unknown',
        count: mc._count.motivationId,
      }
    })

    // Top tags
    const tagCounts = await prisma.recordTag.groupBy({
      by: ['tagId'],
      where: {
        record: {
          createdById: ownerId,
        },
      },
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: 'desc',
        },
      },
      take: 5,
    })

    const tagIds = tagCounts.map(t => t.tagId)
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
      },
    })

    const topTags = tagCounts.map(tc => {
      const tag = tags.find(t => t.id === tc.tagId)
      return {
        name: tag?.name || 'Unknown',
        count: tc._count.tagId,
      }
    })

    // Unassigned hot leads
    const unassignedHot = records.filter(r => 
      r.temperature?.toUpperCase() === 'HOT' && !r.assignedToId
    ).length

    return NextResponse.json({
      buckets: {
        callNow: bucketCounts['call-now'],
        followUpToday: bucketCounts['follow-up-today'],
        callQueue: bucketCounts['call-queue'],
        verifyFirst: bucketCounts['verify-first'],
        getNumbers: bucketCounts['get-numbers'],
        nurture: bucketCounts['nurture'],
        notWorkable: bucketCounts['not-workable'],
      },
      kpis: {
        totalRecords: records.length,
        hotLeads: temperatureCounts.hot,
        callReady: bucketCounts['call-now'] + bucketCounts['call-queue'],
        tasksDue: tasksDueToday,
        unassignedHot,
      },
      today: {
        callsMade,
        contacts,
        appointments: 0, // Would need appointment tracking
        tasksCompleted: tasksCompletedToday,
      },
      temperature: temperatureCounts,
      trends: {
        recordsThisWeek,
        recordsLastWeek,
        weekOverWeekChange: recordsLastWeek > 0 
          ? Math.round(((recordsThisWeek - recordsLastWeek) / recordsLastWeek) * 100) 
          : 0,
      },
      topMotivations,
      topTags,
    })
  } catch (error) {
    console.error('Error fetching overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview' },
      { status: 500 }
    )
  }
}
