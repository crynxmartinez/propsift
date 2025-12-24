import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

async function seedDefaultStatuses() {
  const existingCount = await prisma.status.count()
  
  if (existingCount === 0) {
    await prisma.status.createMany({
      data: DEFAULT_STATUSES,
      skipDuplicates: true,
    })
  }
}

export async function GET() {
  try {
    await seedDefaultStatuses()

    const statuses = await prisma.status.findMany({
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
    const { name, color } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 })
    }

    if (!color || !color.trim()) {
      return NextResponse.json({ error: 'Status color is required' }, { status: 400 })
    }

    const existingStatus = await prisma.status.findUnique({
      where: { name: name.trim() }
    })

    if (existingStatus) {
      return NextResponse.json({ error: 'Status with this name already exists' }, { status: 409 })
    }

    const maxOrder = await prisma.status.aggregate({
      _max: { order: true }
    })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const status = await prisma.status.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        isDefault: false,
        isActive: true,
        order: newOrder
      }
    })

    return NextResponse.json(status, { status: 201 })
  } catch (error) {
    console.error('Create status error:', error)
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 })
  }
}
