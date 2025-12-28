/**
 * Platform Admin - Stats API
 * GET /api/admin/stats - Get platform-wide statistics
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

    // Get stats
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalOwners,
      activeUsers,
      newUsersLast30Days,
      newUsersLast7Days,
      totalRecords,
      totalTasks,
      recordsLast30Days,
      tasksLast30Days
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'owner', accountOwnerId: null } }),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.record.count(),
      prisma.task.count(),
      prisma.record.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.task.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ])

    return NextResponse.json({
      users: {
        total: totalUsers,
        owners: totalOwners,
        active: activeUsers,
        newLast30Days: newUsersLast30Days,
        newLast7Days: newUsersLast7Days
      },
      records: {
        total: totalRecords,
        last30Days: recordsLast30Days
      },
      tasks: {
        total: totalTasks,
        last30Days: tasksLast30Days
      }
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
