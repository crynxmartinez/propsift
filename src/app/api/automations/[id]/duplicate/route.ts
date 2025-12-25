import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// POST /api/automations/[id]/duplicate - Duplicate an automation
export async function POST(
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

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Find the automation to duplicate
    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Create a duplicate
    const duplicate = await prisma.automation.create({
      data: {
        name: `${automation.name} (Copy)`,
        description: automation.description,
        folderId: automation.folderId,
        workflowData: automation.workflowData ?? undefined,
        isActive: false, // Always start as inactive
        isDraft: true,
        createdById: authUser.ownerId,
      },
      include: {
        folder: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    return NextResponse.json(duplicate)
  } catch (error) {
    console.error('Error duplicating automation:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate automation' },
      { status: 500 }
    )
  }
}
