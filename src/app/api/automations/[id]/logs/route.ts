import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET /api/automations/[id]/logs - Get logs for an automation
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    const logs = await prisma.automationLog.findMany({
      where: {
        automationId: params.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // Fetch record details for each log
    const recordIds = logs.map(log => log.recordId).filter(Boolean) as string[]
    const records = await prisma.record.findMany({
      where: { id: { in: recordIds } },
      select: {
        id: true,
        ownerFullName: true,
        isCompany: true,
        propertyStreet: true,
        propertyCity: true,
        propertyState: true,
        mailingStreet: true,
        mailingCity: true,
        mailingState: true,
      },
    })

    // Create a map for quick lookup
    const recordMap = new Map(records.map(r => [r.id, r]))

    // Add record details to logs
    const logsWithRecords = logs.map(log => {
      const record = log.recordId ? recordMap.get(log.recordId) : null
      let recordName = 'Unknown Record'
      
      if (record) {
        if (record.ownerFullName) {
          recordName = record.ownerFullName
        } else if (record.propertyStreet) {
          recordName = `${record.propertyStreet}${record.propertyCity ? `, ${record.propertyCity}` : ''}${record.propertyState ? `, ${record.propertyState}` : ''}`
        } else if (record.mailingStreet) {
          recordName = `${record.mailingStreet}${record.mailingCity ? `, ${record.mailingCity}` : ''}${record.mailingState ? `, ${record.mailingState}` : ''}`
        }
      }

      return {
        ...log,
        recordName,
        record: record || null,
      }
    })

    const total = await prisma.automationLog.count({
      where: {
        automationId: params.id,
        ...(status ? { status } : {}),
      },
    })

    return NextResponse.json({
      logs: logsWithRecords,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching automation logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation logs' },
      { status: 500 }
    )
  }
}
