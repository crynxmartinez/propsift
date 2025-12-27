/**
 * DockInsight 2.2.2 Dashboards API
 * 
 * GET /api/analytics/dashboards - List all dashboards
 * POST /api/analytics/dashboards - Create a new dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

/**
 * GET handler - List all dashboards for the user
 */
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
    
    const dashboards = await prisma.analyticsDashboard.findMany({
      where: { createdById: authUser.ownerId },
      include: {
        widgets: {
          orderBy: [{ y: 'asc' }, { x: 'asc' }]
        },
        createdBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    })
    
    return NextResponse.json({
      success: true,
      dashboards
    })
    
  } catch (error) {
    console.error('Dashboards GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST handler - Create a new dashboard
 */
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
    const { name, description, isDefault, globalFilters } = body
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.analyticsDashboard.updateMany({
        where: { createdById: authUser.ownerId, isDefault: true },
        data: { isDefault: false }
      })
    }
    
    const dashboard = await prisma.analyticsDashboard.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault || false,
        globalFilters: globalFilters || null,
        createdById: authUser.ownerId
      },
      include: {
        widgets: true
      }
    })
    
    return NextResponse.json({
      success: true,
      dashboard
    })
    
  } catch (error) {
    console.error('Dashboards POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
