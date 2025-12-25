import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/automations - Get all automations for the user
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

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const isActive = searchParams.get('isActive')

    const automations = await prisma.automation.findMany({
      where: {
        createdById: authUser.ownerId,
        ...(folderId === 'null' ? { folderId: null } : folderId ? { folderId } : {}),
        ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(automations)
  } catch (error) {
    console.error('Error fetching automations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

// POST /api/automations - Create a new automation
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
    const { name, description, folderId } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Automation name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const existing = await prisma.automation.findFirst({
      where: {
        name: name.trim(),
        createdById: authUser.ownerId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An automation with this name already exists' },
        { status: 400 }
      )
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

    // Create with default empty workflow
    const defaultWorkflow = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const automation = await prisma.automation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        folderId: folderId || null,
        workflowData: defaultWorkflow,
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
      },
    })

    return NextResponse.json(automation, { status: 201 })
  } catch (error) {
    console.error('Error creating automation:', error)
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}
