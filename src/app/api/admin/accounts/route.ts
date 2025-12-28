/**
 * Platform Admin - Accounts API
 * GET /api/admin/accounts - List all account owners with their team stats
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
    const skip = (page - 1) * limit

    // Build where clause for owners only (accounts)
    const whereClause: any = {
      role: 'owner',
      accountOwnerId: null // Only get account owners, not team members
    }

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [accounts, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          status: true,
          isPlatformAdmin: true,
          createdAt: true,
          _count: {
            select: {
              teamMembers: true,
              createdRecords: true,
              createdTasks: true
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
      accounts: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        name: acc.name,
        companyName: acc.companyName,
        status: acc.status,
        isPlatformAdmin: acc.isPlatformAdmin,
        createdAt: acc.createdAt,
        teamMemberCount: acc._count.teamMembers,
        recordCount: acc._count.createdRecords,
        taskCount: acc._count.createdTasks
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
