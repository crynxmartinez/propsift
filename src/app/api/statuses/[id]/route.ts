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
    const body = await request.json()
    const { name, color, isActive } = body

    const existingStatus = await prisma.status.findFirst({
      where: { id, createdById: authUser.ownerId }
    })

    if (!existingStatus) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    const updateData: { name?: string; color?: string; isActive?: boolean } = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Status name is required' }, { status: 400 })
      }

      const duplicateStatus = await prisma.status.findFirst({
        where: {
          name: name.trim(),
          createdById: authUser.ownerId,
          NOT: { id }
        }
      })

      if (duplicateStatus) {
        return NextResponse.json({ error: 'Status with this name already exists' }, { status: 409 })
      }

      updateData.name = name.trim()
    }

    if (color !== undefined) {
      if (!color.trim()) {
        return NextResponse.json({ error: 'Status color is required' }, { status: 400 })
      }
      updateData.color = color.trim()
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const status = await prisma.status.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
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

    const status = await prisma.status.findFirst({
      where: { id, createdById: authUser.ownerId },
      include: {
        _count: {
          select: { records: true }
        }
      }
    })

    if (!status) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    if (status.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default status. You can only toggle it off.' },
        { status: 400 }
      )
    }

    if (status._count.records > 0) {
      return NextResponse.json(
        { error: `Cannot delete status. It has ${status._count.records} record(s) connected to it.` },
        { status: 400 }
      )
    }

    await prisma.status.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Status deleted successfully' })
  } catch (error) {
    console.error('Delete status error:', error)
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 })
  }
}
