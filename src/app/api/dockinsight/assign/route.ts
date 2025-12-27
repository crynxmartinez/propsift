/**
 * DockInsight 3.0 - Assign Record API
 * 
 * POST /api/dockinsight/assign
 * Assigns a record to a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

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

    const body = await request.json()
    const { recordId, assigneeId } = body

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    // Verify record belongs to owner
    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        createdById: authUser.ownerId
      }
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // If assigneeId provided, verify they belong to the same team
    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          OR: [
            { id: authUser.ownerId },
            { accountOwnerId: authUser.ownerId }
          ]
        }
      })

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
      }
    }

    // Update record
    const updatedRecord = await prisma.record.update({
      where: { id: recordId },
      data: { assignedToId: assigneeId || null },
      select: {
        id: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      record: {
        id: updatedRecord.id,
        assigneeId: updatedRecord.assignedToId,
        assigneeName: updatedRecord.assignedTo?.name || null
      }
    })
    
  } catch (error) {
    console.error('Assign API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
