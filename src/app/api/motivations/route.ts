import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const motivations = await prisma.motivation.findMany({
      where: { createdById: decoded.userId },
      include: {
        _count: {
          select: { records: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formattedMotivations = motivations.map(motivation => ({
      id: motivation.id,
      name: motivation.name,
      recordCount: motivation._count.records,
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

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Motivation name is required' }, { status: 400 })
    }

    const existingMotivation = await prisma.motivation.findFirst({
      where: { 
        name: name.trim(),
        createdById: decoded.userId
      }
    })

    if (existingMotivation) {
      return NextResponse.json({ error: 'Motivation with this name already exists' }, { status: 409 })
    }

    const motivation = await prisma.motivation.create({
      data: { 
        name: name.trim(),
        createdById: decoded.userId
      }
    })

    return NextResponse.json(motivation, { status: 201 })
  } catch (error) {
    console.error('Create motivation error:', error)
    return NextResponse.json({ error: 'Failed to create motivation' }, { status: 500 })
  }
}
