import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

const DEFAULT_STATUSES = [
  { name: 'New Lead', color: '#3B82F6', isDefault: true, order: 0 },
  { name: 'Contacted', color: '#06B6D4', isDefault: true, order: 1 },
  { name: 'Follow Up', color: '#EAB308', isDefault: true, order: 2 },
  { name: 'Qualified', color: '#22C55E', isDefault: true, order: 3 },
  { name: 'Not Interested', color: '#6B7280', isDefault: true, order: 4 },
  { name: 'Negotiating', color: '#F97316', isDefault: true, order: 5 },
  { name: 'Under Contract', color: '#8B5CF6', isDefault: true, order: 6 },
  { name: 'Closed', color: '#10B981', isDefault: true, order: 7 },
  { name: 'Opt Out', color: '#EF4444', isDefault: true, order: 8 },
  { name: 'DNC', color: '#991B1B', isDefault: true, order: 9 },
]

async function seedDefaultStatuses(userId: string) {
  const existingCount = await prisma.status.count({
    where: { createdById: userId }
  })
  
  if (existingCount === 0) {
    for (const status of DEFAULT_STATUSES) {
      await prisma.status.create({
        data: { ...status, createdById: userId }
      })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    await seedDefaultStatuses(authUser.ownerId)

    const statuses = await prisma.status.findMany({
      where: { createdById: authUser.ownerId },
      include: {
        _count: {
          select: { records: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    const formattedStatuses = statuses.map(status => ({
      id: status.id,
      name: status.name,
      color: status.color,
      isDefault: status.isDefault,
      isActive: status.isActive,
      order: status.order,
      recordCount: status._count.records,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt
    }))

    return NextResponse.json(formattedStatuses)
  } catch (error) {
    console.error('Get statuses error:', error)
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    const { name, color } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 })
    }

    if (!color || !color.trim()) {
      return NextResponse.json({ error: 'Status color is required' }, { status: 400 })
    }

    const existingStatus = await prisma.status.findFirst({
      where: { 
        name: name.trim(),
        createdById: authUser.ownerId
      }
    })

    if (existingStatus) {
      return NextResponse.json({ error: 'Status with this name already exists' }, { status: 409 })
    }

    const maxOrder = await prisma.status.aggregate({
      where: { createdById: authUser.ownerId },
      _max: { order: true }
    })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const status = await prisma.status.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        isDefault: false,
        isActive: true,
        order: newOrder,
        createdById: authUser.ownerId
      }
    })

    return NextResponse.json(status, { status: 201 })
  } catch (error) {
    console.error('Create status error:', error)
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 })
  }
}
