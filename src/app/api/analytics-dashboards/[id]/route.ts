import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/analytics-dashboards/[id] - Get a specific dashboard
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

    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
      include: {
        widgets: {
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}

// PUT /api/analytics-dashboards/[id] - Update a dashboard
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
    const existing = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      isDefault,
      gridCols,
      rowHeight,
      backgroundColor,
      autoRefresh,
      dateRangeType,
      dateRangeStart,
      dateRangeEnd,
    } = body

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.analyticsDashboard.updateMany({
        where: {
          createdById: authUser.ownerId,
          isDefault: true,
          id: { not: params.id },
        },
        data: { isDefault: false },
      })
    }

    const dashboard = await prisma.analyticsDashboard.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        gridCols: gridCols !== undefined ? gridCols : existing.gridCols,
        rowHeight: rowHeight !== undefined ? rowHeight : existing.rowHeight,
        backgroundColor: backgroundColor !== undefined ? backgroundColor : existing.backgroundColor,
        autoRefresh: autoRefresh !== undefined ? autoRefresh : existing.autoRefresh,
        dateRangeType: dateRangeType !== undefined ? dateRangeType : existing.dateRangeType,
        dateRangeStart: dateRangeStart !== undefined ? (dateRangeStart ? new Date(dateRangeStart) : null) : existing.dateRangeStart,
        dateRangeEnd: dateRangeEnd !== undefined ? (dateRangeEnd ? new Date(dateRangeEnd) : null) : existing.dateRangeEnd,
      },
      include: {
        widgets: {
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Error updating dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    )
  }
}

// DELETE /api/analytics-dashboards/[id] - Delete a dashboard
export async function DELETE(
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
    const existing = await prisma.analyticsDashboard.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    // Delete dashboard (widgets will cascade delete)
    await prisma.analyticsDashboard.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    )
  }
}
