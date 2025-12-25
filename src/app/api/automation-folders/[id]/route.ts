import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/automation-folders/[id] - Get a specific folder
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

    const folder = await prisma.automationFolder.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
      include: {
        automations: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            isDraft: true,
            runCount: true,
            lastRunAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { automations: true },
        },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error fetching automation folder:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation folder' },
      { status: 500 }
    )
  }
}

// PUT /api/automation-folders/[id] - Update a folder
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

    // Check folder exists and belongs to user
    const existing = await prisma.automationFolder.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, color, order } = body

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.automationFolder.findFirst({
        where: {
          name: name.trim(),
          createdById: authUser.ownerId,
          id: { not: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A folder with this name already exists' },
          { status: 400 }
        )
      }
    }

    const folder = await prisma.automationFolder.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      },
      include: {
        _count: {
          select: { automations: true },
        },
      },
    })

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error updating automation folder:', error)
    return NextResponse.json(
      { error: 'Failed to update automation folder' },
      { status: 500 }
    )
  }
}

// DELETE /api/automation-folders/[id] - Delete a folder
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

    // Check folder exists and belongs to user
    const existing = await prisma.automationFolder.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
      include: {
        _count: {
          select: { automations: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Move automations to uncategorized (set folderId to null)
    await prisma.automation.updateMany({
      where: { folderId: params.id },
      data: { folderId: null },
    })

    // Delete the folder
    await prisma.automationFolder.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete automation folder' },
      { status: 500 }
    )
  }
}
