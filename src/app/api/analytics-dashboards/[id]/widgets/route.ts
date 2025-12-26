import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/analytics-dashboards/[id]/widgets - Get all widgets for a dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify dashboard exists and belongs to user
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const widgets = await prisma.analyticsWidget.findMany({
      where: { dashboardId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(widgets)
  } catch (error) {
    console.error('Error fetching widgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch widgets' },
      { status: 500 }
    )
  }
}

// POST /api/analytics-dashboards/[id]/widgets - Create a new widget
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify dashboard exists and belongs to user
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      type,
      title,
      subtitle,
      icon,
      x,
      y,
      w,
      h,
      minW,
      minH,
      maxW,
      maxH,
      config,
      appearance,
    } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Widget type and title are required' },
        { status: 400 }
      )
    }

    // Validate widget type
    const validTypes = [
      'number',
      'bar_chart',
      'horizontal_bar',
      'pie_chart',
      'donut_chart',
      'line_chart',
      'area_chart',
      'progress',
      'gauge',
      'table',
      'leaderboard',
      'funnel',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid widget type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const widget = await prisma.analyticsWidget.create({
      data: {
        dashboardId: params.id,
        type,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        icon: icon || null,
        x: x ?? 0,
        y: y ?? 0,
        w: w ?? 4,
        h: h ?? 2,
        minW: minW ?? null,
        minH: minH ?? null,
        maxW: maxW ?? null,
        maxH: maxH ?? null,
        config: config || { dataSource: 'records', metric: 'count' },
        appearance: appearance || null,
      },
    })

    return NextResponse.json(widget, { status: 201 })
  } catch (error) {
    console.error('Error creating widget:', error)
    return NextResponse.json(
      { error: 'Failed to create widget' },
      { status: 500 }
    )
  }
}

// PUT /api/analytics-dashboards/[id]/widgets - Bulk update widget positions
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Verify dashboard exists and belongs to user
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const body = await request.json()
    const { layouts } = body

    if (!Array.isArray(layouts)) {
      return NextResponse.json(
        { error: 'Layouts must be an array' },
        { status: 400 }
      )
    }

    // Update each widget's position
    await Promise.all(
      layouts.map((layout: { i: string; x: number; y: number; w: number; h: number }) =>
        prisma.analyticsWidget.update({
          where: { id: layout.i },
          data: {
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
          },
        })
      )
    )

    // Fetch updated widgets
    const widgets = await prisma.analyticsWidget.findMany({
      where: { dashboardId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(widgets)
  } catch (error) {
    console.error('Error updating widget positions:', error)
    return NextResponse.json(
      { error: 'Failed to update widget positions' },
      { status: 500 }
    )
  }
}
