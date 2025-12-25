import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/automations/[id] - Get a specific automation
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

    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: { logs: true },
        },
      },
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    return NextResponse.json(automation)
  } catch (error) {
    console.error('Error fetching automation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation' },
      { status: 500 }
    )
  }
}

// PUT /api/automations/[id] - Update an automation
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

    // Check automation exists and belongs to user
    const existing = await prisma.automation.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, folderId, isActive, isDraft, workflowData } = body

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.automation.findFirst({
        where: {
          name: name.trim(),
          createdById: authUser.ownerId,
          id: { not: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'An automation with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Verify folder belongs to user if provided
    if (folderId) {
      const folder = await prisma.automationFolder.findFirst({
        where: {
          id: folderId,
          createdById: authUser.ownerId,
        },
      })

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 400 }
        )
      }
    }

    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(folderId !== undefined && { folderId: folderId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(isDraft !== undefined && { isDraft }),
        ...(workflowData !== undefined && { workflowData }),
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: { logs: true },
        },
      },
    })

    return NextResponse.json(automation)
  } catch (error) {
    console.error('Error updating automation:', error)
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    )
  }
}

// DELETE /api/automations/[id] - Delete an automation
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

    // Check automation exists and belongs to user
    const existing = await prisma.automation.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Delete the automation (logs will cascade delete)
    await prisma.automation.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}
