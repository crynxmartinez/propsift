import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const { orderedIds } = await request.json()

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 })
    }

    // Verify all statuses belong to the user before updating
    const userStatuses = await prisma.status.findMany({
      where: { 
        id: { in: orderedIds },
        createdById: decoded.userId
      }
    })

    if (userStatuses.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Invalid status IDs' }, { status: 400 })
    }

    const updates = orderedIds.map((id: string, index: number) =>
      prisma.status.update({
        where: { id },
        data: { order: index }
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ message: 'Order updated successfully' })
  } catch (error) {
    console.error('Reorder statuses error:', error)
    return NextResponse.json({ error: 'Failed to reorder statuses' }, { status: 500 })
  }
}
