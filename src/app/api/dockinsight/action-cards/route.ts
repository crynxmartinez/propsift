/**
 * DockInsight 3.0 - Action Cards API
 * 
 * GET /api/dockinsight/action-cards
 * Returns counts for action cards (Hot+Unassigned, No Phone, Call Ready, Stale Leads)
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
    const isExecutiveView = searchParams.get('executive') === 'true'
    const market = searchParams.get('market') || undefined
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const temperature = searchParams.get('temperature')?.split(',').filter(Boolean) || undefined
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || undefined
    const callReady = searchParams.get('callReady')
    
    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    // Apply filters (except assignee for some cards)
    if (market) {
      baseWhere.propertyState = market
    }
    
    if (temperature && temperature.length > 0) {
      baseWhere.temperature = { in: temperature }
    }
    
    if (tagIds && tagIds.length > 0) {
      baseWhere.tags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }
    
    if (callReady === 'true') {
      baseWhere.isComplete = true
    } else if (callReady === 'false') {
      baseWhere.isComplete = false
    }

    // Calculate stale date (30 days ago)
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 30)

    // Fetch action card counts in parallel
    const [hotUnassigned, noPhone, callReadyToday, staleLeads] = await Promise.all([
      // Hot + Unassigned
      prisma.record.count({
        where: {
          ...baseWhere,
          temperature: 'hot',
          assignedToId: null
        }
      }),
      // No Phone Number (phoneCount = 0 or no phone numbers)
      prisma.record.count({
        where: {
          ...baseWhere,
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {}),
          phoneCount: 0
        }
      }),
      // Call Ready Today (complete records)
      prisma.record.count({
        where: {
          ...baseWhere,
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {}),
          isComplete: true
        }
      }),
      // Stale Leads (no update in 30 days)
      prisma.record.count({
        where: {
          ...baseWhere,
          ...(isExecutiveView ? {} : { assignedToId: authUser.id }),
          ...(assigneeIds && assigneeIds.length > 0 && isExecutiveView ? { assignedToId: { in: assigneeIds } } : {}),
          updatedAt: { lt: staleDate }
        }
      })
    ])

    return NextResponse.json({
      hotUnassigned: {
        count: hotUnassigned,
        filterKey: 'hot_unassigned'
      },
      noPhone: {
        count: noPhone,
        filterKey: 'no_phone'
      },
      callReady: {
        count: callReadyToday,
        filterKey: 'call_ready'
      },
      staleLeads: {
        count: staleLeads,
        filterKey: 'stale_leads'
      }
    })
    
  } catch (error) {
    console.error('Action Cards API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
