/**
 * Platform Admin - Users API
 * GET /api/admin/users - List all users across all accounts
 * PATCH /api/admin/users - Update user (status, isPlatformAdmin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/roles'

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check platform admin
    const isAdmin = await isPlatformAdmin(decoded.userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const accountId = searchParams.get('accountId') || ''
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      whereClause.role = role
    }

    if (status) {
      whereClause.status = status
    }

    if (accountId) {
      whereClause.OR = [
        { id: accountId },
        { accountOwnerId: accountId }
      ]
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isPlatformAdmin: true,
          createdAt: true,
          accountOwnerId: true,
          accountOwner: {
            select: {
              id: true,
              email: true,
              name: true,
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin,
        createdAt: user.createdAt,
        accountOwnerId: user.accountOwnerId,
        accountOwner: user.accountOwner
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check platform admin
    const isAdmin = await isPlatformAdmin(decoded.userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, status, isPlatformAdmin: makePlatformAdmin } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Build update data
    const updateData: any = {}
    
    if (status !== undefined) {
      updateData.status = status
    }
    
    if (makePlatformAdmin !== undefined) {
      updateData.isPlatformAdmin = makePlatformAdmin
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isPlatformAdmin: true
      },
      data: updateData
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
