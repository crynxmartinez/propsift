import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Motivation name is required' }, { status: 400 })
    }

    const existingMotivation = await prisma.motivation.findFirst({
      where: { id, createdById: authUser.ownerId }
    })

    if (!existingMotivation) {
      return NextResponse.json({ error: 'Motivation not found' }, { status: 404 })
    }

    const duplicateMotivation = await prisma.motivation.findFirst({
      where: {
        name: name.trim(),
        createdById: authUser.ownerId,
        NOT: { id }
      }
    })

    if (duplicateMotivation) {
      return NextResponse.json({ error: 'Motivation with this name already exists' }, { status: 409 })
    }

    const motivation = await prisma.motivation.update({
      where: { id },
      data: { name: name.trim() }
    })

    return NextResponse.json(motivation)
  } catch (error) {
    console.error('Update motivation error:', error)
    return NextResponse.json({ error: 'Failed to update motivation' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    const motivation = await prisma.motivation.findFirst({
      where: { id, createdById: authUser.ownerId },
      include: {
        _count: {
          select: { records: true }
        }
      }
    })

    if (!motivation) {
      return NextResponse.json({ error: 'Motivation not found' }, { status: 404 })
    }

    if (motivation._count.records > 0) {
      return NextResponse.json(
        { error: `Cannot delete motivation. It has ${motivation._count.records} record(s) connected to it.` },
        { status: 400 }
      )
    }

    await prisma.motivation.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Motivation deleted successfully' })
  } catch (error) {
    console.error('Delete motivation error:', error)
    return NextResponse.json({ error: 'Failed to delete motivation' }, { status: 500 })
  }
}
