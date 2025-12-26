import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/analytics-dashboards/[id]/widgets/[widgetId] - Get a specific widget
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
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

    const widget = await prisma.analyticsWidget.findFirst({
      where: {
        id: params.widgetId,
        dashboardId: params.id,
      },
    })

    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    return NextResponse.json(widget)
  } catch (error) {
    console.error('Error fetching widget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch widget' },
      { status: 500 }
    )
  }
}

// PUT /api/analytics-dashboards/[id]/widgets/[widgetId] - Update a widget
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
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

    // Verify widget exists
    const existing = await prisma.analyticsWidget.findFirst({
      where: {
        id: params.widgetId,
        dashboardId: params.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
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

    const widget = await prisma.analyticsWidget.update({
      where: { id: params.widgetId },
      data: {
        type: type ?? existing.type,
        title: title?.trim() ?? existing.title,
        subtitle: subtitle !== undefined ? subtitle?.trim() || null : existing.subtitle,
        icon: icon !== undefined ? icon : existing.icon,
        x: x ?? existing.x,
        y: y ?? existing.y,
        w: w ?? existing.w,
        h: h ?? existing.h,
        minW: minW !== undefined ? minW : existing.minW,
        minH: minH !== undefined ? minH : existing.minH,
        maxW: maxW !== undefined ? maxW : existing.maxW,
        maxH: maxH !== undefined ? maxH : existing.maxH,
        config: config ?? existing.config,
        appearance: appearance !== undefined ? appearance : existing.appearance,
      },
    })

    return NextResponse.json(widget)
  } catch (error) {
    console.error('Error updating widget:', error)
    return NextResponse.json(
      { error: 'Failed to update widget' },
      { status: 500 }
    )
  }
}

// DELETE /api/analytics-dashboards/[id]/widgets/[widgetId] - Delete a widget
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
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

    // Verify widget exists
    const existing = await prisma.analyticsWidget.findFirst({
      where: {
        id: params.widgetId,
        dashboardId: params.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    await prisma.analyticsWidget.delete({
      where: { id: params.widgetId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting widget:', error)
    return NextResponse.json(
      { error: 'Failed to delete widget' },
      { status: 500 }
    )
  }
}
