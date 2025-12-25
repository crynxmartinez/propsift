import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

const DEFAULT_MOTIVATIONS = [
  'Probate',
  'Pre-Foreclosure',
  'Foreclosure',
  'Tax Lien',
  'Divorce',
  'Bankruptcy',
  'Vacant',
  'Absentee Owner',
  'High Equity',
  'Tired Landlord',
  'Code Violation',
  'Off Market',
]

async function seedDefaultMotivations(userId: string) {
  const existingCount = await prisma.motivation.count({
    where: { createdById: userId }
  })
  
  if (existingCount === 0) {
    for (const name of DEFAULT_MOTIVATIONS) {
      await prisma.motivation.create({
        data: { name, createdById: userId }
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

    await seedDefaultMotivations(authUser.ownerId)

    const motivations = await prisma.motivation.findMany({
      where: { createdById: authUser.ownerId },
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

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Motivation name is required' }, { status: 400 })
    }

    const existingMotivation = await prisma.motivation.findFirst({
      where: { 
        name: name.trim(),
        createdById: authUser.ownerId
      }
    })

    if (existingMotivation) {
      return NextResponse.json({ error: 'Motivation with this name already exists' }, { status: 409 })
    }

    const motivation = await prisma.motivation.create({
      data: { 
        name: name.trim(),
        createdById: authUser.ownerId
      }
    })

    return NextResponse.json(motivation, { status: 201 })
  } catch (error) {
    console.error('Create motivation error:', error)
    return NextResponse.json({ error: 'Failed to create motivation' }, { status: 500 })
  }
}
