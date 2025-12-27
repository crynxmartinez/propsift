/**
 * DockInsight 2.2.2 Widget API
 * 
 * GET /api/analytics/dashboards/[id]/widgets/[widgetId] - Get a widget
 * PUT /api/analytics/dashboards/[id]/widgets/[widgetId] - Update a widget
 * DELETE /api/analytics/dashboards/[id]/widgets/[widgetId] - Delete a widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string; widgetId: string }
}

/**
 * GET handler - Get a specific widget
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
    
    const widget = await prisma.analyticsWidget.findFirst({
      where: { 
        id: params.widgetId,
        dashboardId: params.id 
      }
    })
    
    if (!widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      widget
    })
    
  } catch (error) {
    console.error('Widget GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT handler - Update a widget
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    
    // Get existing widget
    const existing = await prisma.analyticsWidget.findFirst({
      where: { 
        id: params.widgetId,
        dashboardId: params.id 
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const { 
      title, type, entityKey, segmentKey, metric, dimension,
      filters, dateRange, dateMode, granularity, sort, limit,
      x, y, w, h 
    } = body
    
    const widget = await prisma.analyticsWidget.update({
      where: { id: params.widgetId },
      data: {
        title: title?.trim() ?? existing.title,
        type: type ?? existing.type,
        entityKey: entityKey ?? existing.entityKey,
        segmentKey: segmentKey !== undefined ? segmentKey : existing.segmentKey,
        metric: metric ?? existing.metric,
        dimension: dimension !== undefined ? dimension : existing.dimension,
        filters: filters !== undefined ? filters : existing.filters,
        dateRange: dateRange !== undefined ? dateRange : existing.dateRange,
        dateMode: dateMode !== undefined ? dateMode : existing.dateMode,
        granularity: granularity !== undefined ? granularity : existing.granularity,
        sort: sort !== undefined ? sort : existing.sort,
        limit: limit !== undefined ? limit : existing.limit,
        x: x ?? existing.x,
        y: y ?? existing.y,
        w: w ?? existing.w,
        h: h ?? existing.h
      }
    })
    
    return NextResponse.json({
      success: true,
      widget
    })
    
  } catch (error) {
    console.error('Widget PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE handler - Delete a widget
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    
    // Check widget exists
    const existing = await prisma.analyticsWidget.findFirst({
      where: { 
        id: params.widgetId,
        dashboardId: params.id 
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 })
    }
    
    await prisma.analyticsWidget.delete({
      where: { id: params.widgetId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Widget deleted'
    })
    
  } catch (error) {
    console.error('Widget DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
