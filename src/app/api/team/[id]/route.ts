import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owner and super_admin can update team members
    if (!['owner', 'super_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the target member
    const targetMember = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Get the account owner ID
    const ownerId = currentUser.accountOwnerId || currentUser.id

    // Verify target member belongs to the same account
    const targetOwnerId = targetMember.accountOwnerId || targetMember.id
    if (targetOwnerId !== ownerId && targetMember.id !== ownerId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot modify the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify account owner' }, { status: 403 })
    }

    const body = await request.json()
    const { role, status } = body

    // Build update data
    const updateData: Record<string, string> = {}

    if (role !== undefined) {
      // Validate role
      if (!['super_admin', 'admin', 'member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }

    if (status !== undefined) {
      // Validate status
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    const updatedMember = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owner and super_admin can delete team members
    if (!['owner', 'super_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the target member
    const targetMember = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Get the account owner ID
    const ownerId = currentUser.accountOwnerId || currentUser.id

    // Verify target member belongs to the same account
    const targetOwnerId = targetMember.accountOwnerId || targetMember.id
    if (targetOwnerId !== ownerId && targetMember.id !== ownerId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot delete the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot delete account owner' }, { status: 403 })
    }

    // Cannot delete yourself
    if (targetMember.id === decoded.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team member:', error)
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 })
  }
}
