import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/automation-folders - Get all automation folders for the user
export async function GET(request: NextRequest) {
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

    const folders = await prisma.automationFolder.findMany({
      where: { createdById: authUser.ownerId },
      include: {
        automations: {
          select: {
            id: true,
            name: true,
            isActive: true,
            isDraft: true,
            runCount: true,
            lastRunAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { automations: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching automation folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation folders' },
      { status: 500 }
    )
  }
}

// POST /api/automation-folders - Create a new automation folder
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, color } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.automationFolder.findFirst({
      where: {
        name: name.trim(),
        createdById: authUser.ownerId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 400 }
      )
    }

    // Get max order for new folder
    const maxOrder = await prisma.automationFolder.aggregate({
      where: { createdById: authUser.ownerId },
      _max: { order: true },
    })

    const folder = await prisma.automationFolder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        order: (maxOrder._max.order ?? -1) + 1,
        createdById: authUser.ownerId,
      },
      include: {
        _count: {
          select: { automations: true },
        },
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating automation folder:', error)
    return NextResponse.json(
      { error: 'Failed to create automation folder' },
      { status: 500 }
    )
  }
}
