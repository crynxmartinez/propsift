import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const motivations = await prisma.motivation.findMany({
      include: {
        _count: {
          select: { properties: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formattedMotivations = motivations.map(motivation => ({
      id: motivation.id,
      name: motivation.name,
      recordCount: motivation._count.properties,
      createdAt: motivation.createdAt,
      updatedAt: motivation.updatedAt
    }))

    return NextResponse.json(formattedMotivations)
  } catch (error) {
    console.error('Get motivations error:', error)
    return NextResponse.json({ error: 'Failed to fetch motivations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Motivation name is required' }, { status: 400 })
    }

    const existingMotivation = await prisma.motivation.findUnique({
      where: { name: name.trim() }
    })

    if (existingMotivation) {
      return NextResponse.json({ error: 'Motivation with this name already exists' }, { status: 409 })
    }

    const motivation = await prisma.motivation.create({
      data: { name: name.trim() }
    })

    return NextResponse.json(motivation, { status: 201 })
  } catch (error) {
    console.error('Create motivation error:', error)
    return NextResponse.json({ error: 'Failed to create motivation' }, { status: 500 })
  }
}
