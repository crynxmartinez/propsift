import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/owners/[id] - Get owner details (record + all records by same owner)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First, get the main record
    const record = await prisma.record.findUnique({
      where: { id: params.id },
      include: {
        status: true,
        assignedTo: true,
        recordTags: {
          include: { tag: true }
        },
        recordMotivations: {
          include: { motivation: true }
        },
        phoneNumbers: true,
        emails: true,
      }
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Get all records by the same owner (by ownerFullName)
    const ownerRecords = await prisma.record.findMany({
      where: {
        ownerFullName: record.ownerFullName,
      },
      include: {
        status: true,
        recordTags: {
          include: { tag: true }
        },
        recordMotivations: {
          include: { motivation: true }
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    // Aggregate stats across all owner's records
    const stats = {
      propertyCount: ownerRecords.length,
      totalCallAttempts: ownerRecords.reduce((sum, r) => sum + r.callAttempts, 0),
      totalDirectMailAttempts: ownerRecords.reduce((sum, r) => sum + r.directMailAttempts, 0),
      totalSmsAttempts: ownerRecords.reduce((sum, r) => sum + r.smsAttempts, 0),
      totalRvmAttempts: ownerRecords.reduce((sum, r) => sum + r.rvmAttempts, 0),
    }

    // Get all phones across owner's records
    const allPhones = await prisma.recordPhoneNumber.findMany({
      where: {
        recordId: { in: ownerRecords.map(r => r.id) }
      }
    })
    
    // Get all emails across owner's records
    const allEmails = await prisma.recordEmail.findMany({
      where: {
        recordId: { in: ownerRecords.map(r => r.id) }
      }
    })
    
    // Calculate verified numbers percentage
    const verifiedPhones = allPhones.filter(p => 
      p.statuses.includes('CORRECT') || p.statuses.includes('PRIMARY')
    ).length
    
    const verifiedNumbersPercent = allPhones.length > 0 
      ? Math.round((verifiedPhones / allPhones.length) * 100) 
      : 0

    // Count total motivations across all records
    const totalMotivations = ownerRecords.reduce((sum, r) => sum + r.recordMotivations.length, 0)

    return NextResponse.json({
      record,
      ownerRecords,
      stats: {
        ...stats,
        verifiedNumbersPercent,
        totalPhones: allPhones.length,
        totalEmails: allEmails.length,
        totalMotivations,
        verifiedPhones,
      }
    })
  } catch (error) {
    console.error('Error fetching owner:', error)
    return NextResponse.json({ error: 'Failed to fetch owner' }, { status: 500 })
  }
}

// PUT /api/owners/[id] - Update owner record (same as record update)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { isContact, ...otherFields } = body

    const updateData: Record<string, unknown> = {}

    if (isContact !== undefined) {
      updateData.isContact = isContact
    }

    // Add other fields as needed
    Object.keys(otherFields).forEach(key => {
      if (otherFields[key] !== undefined) {
        updateData[key] = otherFields[key]
      }
    })

    const record = await prisma.record.update({
      where: { id: params.id },
      data: updateData,
      include: {
        status: true,
        assignedTo: true,
        recordTags: {
          include: { tag: true }
        },
        recordMotivations: {
          include: { motivation: true }
        },
        phoneNumbers: true,
        emails: true,
      }
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating owner:', error)
    return NextResponse.json({ error: 'Failed to update owner' }, { status: 500 })
  }
}
