import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_STATUSES = [
  { name: 'New Lead', color: '#3B82F6', isDefault: true },
  { name: 'Contacted', color: '#06B6D4', isDefault: true },
  { name: 'Follow Up', color: '#EAB308', isDefault: true },
  { name: 'Qualified', color: '#22C55E', isDefault: true },
  { name: 'Not Interested', color: '#6B7280', isDefault: true },
  { name: 'Negotiating', color: '#F97316', isDefault: true },
  { name: 'Under Contract', color: '#8B5CF6', isDefault: true },
  { name: 'Closed', color: '#10B981', isDefault: true },
  { name: 'Opt Out', color: '#EF4444', isDefault: true },
  { name: 'DNC', color: '#991B1B', isDefault: true },
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
          select: { properties: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    const formattedStatuses = statuses.map(status => ({
      id: status.id,
      name: status.name,
      color: status.color,
      isDefault: status.isDefault,
      isActive: status.isActive,
      recordCount: status._count.properties,
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

    const status = await prisma.status.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        isDefault: false,
        isActive: true
      }
    })

    return NextResponse.json(status, { status: 201 })
  } catch (error) {
    console.error('Create status error:', error)
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 })
  }
}
