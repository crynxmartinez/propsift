import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/activity - List activity logs with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // upload, download, action
    const status = searchParams.get('status') // pending, processing, completed, failed
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status

    const [activities, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}

// POST /api/activity - Create a new activity log
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, action, filename, description, total, metadata } = body

    if (!type || !action) {
      return NextResponse.json(
        { error: 'Type and action are required' },
        { status: 400 }
      )
    }

    const activity = await prisma.activityLog.create({
      data: {
        type,
        action,
        filename,
        description,
        total: total || 0,
        processed: 0,
        status: 'pending',
        metadata,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    )
  }
}
