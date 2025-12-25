import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { executeAutomation } from '@/lib/automation/engine'

// POST /api/automations/[id]/test - Test run an automation with a specific record
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

    // Verify automation belongs to user
    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        createdById: authUser.ownerId,
      },
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { recordId } = body

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required for testing' },
        { status: 400 }
      )
    }

    // Verify record exists and belongs to user
    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        createdById: authUser.ownerId,
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Execute the automation
    await executeAutomation(params.id, recordId, 'manual_test')

    // Get the latest log for this execution
    const log = await prisma.automationLog.findFirst({
      where: {
        automationId: params.id,
        recordId,
        triggeredBy: 'manual_test',
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      message: 'Automation test completed',
      log,
    })
  } catch (error) {
    console.error('Error testing automation:', error)
    return NextResponse.json(
      { error: 'Failed to test automation' },
      { status: 500 }
    )
  }
}
