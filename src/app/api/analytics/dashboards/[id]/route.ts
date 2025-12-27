/**
 * DockInsight 2.2.2 Dashboard API
 * 
 * GET /api/analytics/dashboards/[id] - Get a specific dashboard
 * PUT /api/analytics/dashboards/[id] - Update a dashboard
 * DELETE /api/analytics/dashboards/[id] - Delete a dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

/**
 * GET handler - Get a specific dashboard
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
    
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId 
      },
      include: {
        widgets: {
          orderBy: [{ y: 'asc' }, { x: 'asc' }]
        }
      }
    })
    
    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      dashboard
    })
    
  } catch (error) {
    console.error('Dashboard GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT handler - Update a dashboard
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
    
    // Check dashboard exists and belongs to user
    const existing = await prisma.analyticsDashboard.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId 
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const { name, description, isDefault, globalFilters } = body
    
    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.analyticsDashboard.updateMany({
        where: { createdById: authUser.ownerId, isDefault: true },
        data: { isDefault: false }
      })
    }
    
    const dashboard = await prisma.analyticsDashboard.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        globalFilters: globalFilters !== undefined ? globalFilters : existing.globalFilters
      },
      include: {
        widgets: {
          orderBy: [{ y: 'asc' }, { x: 'asc' }]
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      dashboard
    })
    
  } catch (error) {
    console.error('Dashboard PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE handler - Delete a dashboard
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
    
    // Check dashboard exists and belongs to user
    const existing = await prisma.analyticsDashboard.findFirst({
      where: { 
        id: params.id,
        createdById: authUser.ownerId 
      }
    })
    
    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    // Delete dashboard (widgets cascade delete)
    await prisma.analyticsDashboard.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Dashboard deleted'
    })
    
  } catch (error) {
    console.error('Dashboard DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
