import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

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

    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 })
    }

    // Update order for each call result
    for (let i = 0; i < orderedIds.length; i++) {
      await prisma.callResult.updateMany({
        where: {
          id: orderedIds[i],
          createdById: authUser.ownerId
        },
        data: { order: i }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder call results error:', error)
    return NextResponse.json({ error: 'Failed to reorder call results' }, { status: 500 })
  }
}
