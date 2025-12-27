/**
 * DockInsight 2.2.2 Widgets API
 * 
 * GET /api/analytics/dashboards/[id]/widgets - List widgets for a dashboard
 * POST /api/analytics/dashboards/[id]/widgets - Add a widget to a dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

/**
 * GET handler - List widgets for a dashboard
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    
    // Verify dashboard belongs to user
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId 
      }
    })
    
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    const widgets = await prisma.analyticsWidget.findMany({
      where: { dashboardId: params.id },
      orderBy: [{ y: 'asc' }, { x: 'asc' }]
    })
    
    return NextResponse.json({
      success: true,
      widgets
    })
    
  } catch (error) {
    console.error('Widgets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST handler - Add a widget to a dashboard
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    
    // Verify dashboard belongs to user
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId 
      }
    })
    
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const { 
      title, type, entityKey, segmentKey, metric, dimension,
      filters, dateRange, dateMode, granularity, sort, limit,
      x, y, w, h 
    } = body
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!type || !['metric', 'chart', 'pie', 'table', 'line'].includes(type)) {
      return NextResponse.json({ error: 'Valid type is required (metric, chart, pie, table, line)' }, { status: 400 })
    }
    if (!entityKey || typeof entityKey !== 'string') {
      return NextResponse.json({ error: 'Entity key is required' }, { status: 400 })
    }
    if (!metric || typeof metric !== 'object' || !metric.key) {
      return NextResponse.json({ error: 'Metric with key is required' }, { status: 400 })
    }
    
    const widget = await prisma.analyticsWidget.create({
      data: {
        dashboardId: params.id,
        title: title.trim(),
        type,
        entityKey,
        segmentKey: segmentKey || null,
        metric,
        dimension: dimension || null,
        filters: filters || null,
        dateRange: dateRange || null,
        dateMode: dateMode || null,
        granularity: granularity || null,
        sort: sort || null,
        limit: limit || null,
        x: x ?? 0,
        y: y ?? 0,
        w: w ?? 6,
        h: h ?? 2
      }
    })
    
    return NextResponse.json({
      success: true,
      widget
    })
    
  } catch (error) {
    console.error('Widgets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
