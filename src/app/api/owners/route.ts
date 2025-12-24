import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/owners - List unique owners with aggregated stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, incomplete, company, person

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {}
    
    if (search) {
      whereClause.OR = [
        { ownerFullName: { contains: search, mode: 'insensitive' } },
        { mailingStreet: { contains: search, mode: 'insensitive' } },
        { mailingCity: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (filter === 'company') {
      whereClause.isCompany = true
    } else if (filter === 'person') {
      whereClause.isCompany = false
    } else if (filter === 'incomplete') {
      whereClause.isComplete = false
    }

    // Get all records matching the filter
    const allRecords = await prisma.record.findMany({
      where: whereClause,
      include: {
        phoneNumbers: true,
      },
      orderBy: { ownerFullName: 'asc' }
    })

    // Group records by ownerFullName to get unique owners
    const ownerMap = new Map<string, {
      id: string // Use first record's ID as the owner ID
      ownerFullName: string
      isCompany: boolean
      mailingStreet: string | null
      mailingCity: string | null
      mailingState: string | null
      mailingZip: string | null
      propertyCount: number
      totalPhones: number
      verifiedPhones: number
      callAttempts: number
      directMailAttempts: number
      smsAttempts: number
      rvmAttempts: number
      isComplete: boolean
    }>()

    for (const record of allRecords) {
      const ownerName = record.ownerFullName
      
      if (!ownerMap.has(ownerName)) {
        // First record for this owner
        ownerMap.set(ownerName, {
          id: record.id,
          ownerFullName: ownerName,
          isCompany: record.isCompany,
          mailingStreet: record.mailingStreet,
          mailingCity: record.mailingCity,
          mailingState: record.mailingState,
          mailingZip: record.mailingZip,
          propertyCount: 1,
          totalPhones: record.phoneNumbers.length,
          verifiedPhones: record.phoneNumbers.filter(p => 
            p.statuses.includes('CORRECT') || p.statuses.includes('PRIMARY')
          ).length,
          callAttempts: record.callAttempts,
          directMailAttempts: record.directMailAttempts,
          smsAttempts: record.smsAttempts,
          rvmAttempts: record.rvmAttempts,
          isComplete: record.isComplete,
        })
      } else {
        // Aggregate with existing owner data
        const existing = ownerMap.get(ownerName)!
        existing.propertyCount += 1
        existing.totalPhones += record.phoneNumbers.length
        existing.verifiedPhones += record.phoneNumbers.filter(p => 
          p.statuses.includes('CORRECT') || p.statuses.includes('PRIMARY')
        ).length
        existing.callAttempts += record.callAttempts
        existing.directMailAttempts += record.directMailAttempts
        existing.smsAttempts += record.smsAttempts
        existing.rvmAttempts += record.rvmAttempts
        // If any property is incomplete, mark owner as incomplete
        if (!record.isComplete) {
          existing.isComplete = false
        }
      }
    }

    // Convert map to array
    let owners = Array.from(ownerMap.values())

    // Calculate verified percentage for each owner
    const ownersWithPercent = owners.map(owner => ({
      ...owner,
      verifiedPercent: owner.totalPhones > 0 
        ? Math.round((owner.verifiedPhones / owner.totalPhones) * 100)
        : 0
    }))

    // Get total count before pagination
    const total = ownersWithPercent.length

    // Apply pagination
    const skip = (page - 1) * limit
    const paginatedOwners = ownersWithPercent.slice(skip, skip + limit)

    return NextResponse.json({
      owners: paginatedOwners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching owners:', error)
    return NextResponse.json({ error: 'Failed to fetch owners' }, { status: 500 })
  }
}
