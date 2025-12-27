/**
 * DockInsight 3.0 - Drilldown API
 * 
 * GET /api/dockinsight/drilldown
 * Returns paginated records for drilldown view based on filter type
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const isExecutiveView = searchParams.get('executive') === 'true'
    
    // Build where clause based on filter type
    // Build base where clause - include legacy records with null createdById
    const baseWhere: any = {
      OR: [
        { createdById: authUser.ownerId },
        { createdById: null }
      ]
    }

    // Calculate stale date (30 days ago)
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 30)

    switch (filterType) {
      case 'hot_unassigned':
        baseWhere.temperature = { in: ['hot', 'Hot', 'HOT'] }
        baseWhere.assignedToId = null
        break
      case 'no_phone':
        baseWhere.phoneCount = 0
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      case 'call_ready':
        baseWhere.isComplete = true
        baseWhere.phoneCount = { gt: 0 }
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      case 'stale_leads':
        baseWhere.updatedAt = { lt: staleDate }
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      case 'temperature_hot':
        baseWhere.temperature = { in: ['hot', 'Hot', 'HOT'] }
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      case 'temperature_warm':
        baseWhere.temperature = { in: ['warm', 'Warm', 'WARM'] }
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      case 'temperature_cold':
        baseWhere.temperature = { in: ['cold', 'Cold', 'COLD'] }
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
        break
      default:
        if (!isExecutiveView) baseWhere.assignedToId = authUser.id
    }

    // Get total count
    const total = await prisma.record.count({ where: baseWhere })

    // Get paginated records
    const records = await prisma.record.findMany({
      where: baseWhere,
      select: {
        id: true,
        ownerFullName: true,
        propertyStreet: true,
        propertyCity: true,
        propertyState: true,
        phone: true,
        temperature: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    const formattedRecords = records.map(r => ({
      id: r.id,
      ownerName: r.ownerFullName || 'Unknown',
      propertyAddress: [r.propertyStreet, r.propertyCity, r.propertyState]
        .filter(Boolean)
        .join(', ') || null,
      phone: r.phone,
      temperature: r.temperature,
      assigneeId: r.assignedToId,
      assigneeName: r.assignedTo?.name || null
    }))

    return NextResponse.json({
      records: formattedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
    
  } catch (error) {
    console.error('Drilldown API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
