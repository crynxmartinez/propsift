import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

const DEFAULT_CALL_RESULTS = [
  { name: 'No Answer', color: '#6B7280', isDefault: true, order: 0 },
  { name: 'Left Voicemail', color: '#3B82F6', isDefault: true, order: 1 },
  { name: 'Callback Requested', color: '#F59E0B', isDefault: true, order: 2 },
  { name: 'Not Interested', color: '#EF4444', isDefault: true, order: 3 },
  { name: 'Interested', color: '#22C55E', isDefault: true, order: 4 },
  { name: 'Wrong Number', color: '#F97316', isDefault: true, order: 5 },
  { name: 'Do Not Call', color: '#991B1B', isDefault: true, order: 6 },
  { name: 'Appointment Set', color: '#8B5CF6', isDefault: true, order: 7 },
]

async function seedDefaultCallResults(userId: string) {
  const existingCount = await prisma.callResult.count({
    where: { createdById: userId }
  })
  
  if (existingCount === 0) {
    for (const callResult of DEFAULT_CALL_RESULTS) {
      await prisma.callResult.create({
        data: { ...callResult, createdById: userId }
      })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
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

    await seedDefaultCallResults(authUser.ownerId)

    const callResults = await prisma.callResult.findMany({
      where: { createdById: authUser.ownerId },
      include: {
        _count: {
          select: { records: true }
        }
      },
      orderBy: { order: 'asc' }
    })

    const formattedCallResults = callResults.map(callResult => ({
      id: callResult.id,
      name: callResult.name,
      color: callResult.color,
      isDefault: callResult.isDefault,
      isActive: callResult.isActive,
      order: callResult.order,
      recordCount: callResult._count.records,
      createdAt: callResult.createdAt,
      updatedAt: callResult.updatedAt
    }))

    return NextResponse.json(formattedCallResults)
  } catch (error) {
    console.error('Get call results error:', error)
    return NextResponse.json({ error: 'Failed to fetch call results' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Call result name is required' }, { status: 400 })
    }

    if (!color || !color.trim()) {
      return NextResponse.json({ error: 'Call result color is required' }, { status: 400 })
    }

    const existingCallResult = await prisma.callResult.findFirst({
      where: { 
        name: name.trim(),
        createdById: authUser.ownerId
      }
    })

    if (existingCallResult) {
      return NextResponse.json({ error: 'Call result with this name already exists' }, { status: 409 })
    }

    const maxOrder = await prisma.callResult.aggregate({
      where: { createdById: authUser.ownerId },
      _max: { order: true }
    })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const callResult = await prisma.callResult.create({
      data: {
        name: name.trim(),
        color: color.trim(),
        isDefault: false,
        isActive: true,
        order: newOrder,
        createdById: authUser.ownerId
      }
    })

    return NextResponse.json(callResult, { status: 201 })
  } catch (error) {
    console.error('Create call result error:', error)
    return NextResponse.json({ error: 'Failed to create call result' }, { status: 500 })
  }
}
