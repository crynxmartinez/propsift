import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existingCallResult = await prisma.callResult.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId
      }
    })

    if (!existingCallResult) {
      return NextResponse.json({ error: 'Call result not found' }, { status: 404 })
    }

    const { name, color, isActive, order } = await request.json()

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingCallResult.name) {
      const duplicateName = await prisma.callResult.findFirst({
        where: {
          name: name.trim(),
          createdById: authUser.ownerId,
          id: { not: params.id }
        }
      })
      if (duplicateName) {
        return NextResponse.json({ error: 'Call result with this name already exists' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color.trim()
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    const callResult = await prisma.callResult.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(callResult)
  } catch (error) {
    console.error('Update call result error:', error)
    return NextResponse.json({ error: 'Failed to update call result' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existingCallResult = await prisma.callResult.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId
      }
    })

    if (!existingCallResult) {
      return NextResponse.json({ error: 'Call result not found' }, { status: 404 })
    }

    // Check if any records are using this call result
    const recordsUsingCallResult = await prisma.record.count({
      where: { callResultId: params.id }
    })

    if (recordsUsingCallResult > 0) {
      return NextResponse.json({ 
        error: `Cannot delete call result. ${recordsUsingCallResult} record(s) are using it.` 
      }, { status: 400 })
    }

    await prisma.callResult.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete call result error:', error)
    return NextResponse.json({ error: 'Failed to delete call result' }, { status: 500 })
  }
}
