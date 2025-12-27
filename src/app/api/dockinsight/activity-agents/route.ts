/**
 * DockInsight 3.0 - Activity Agents API
 * 
 * GET /api/dockinsight/activity-agents
 * Returns top agents ranked by activity count
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

function getDateRange(preset: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let startDate: Date
  let endDate: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  switch (preset) {
    case 'today':
      startDate = today
      break
    case 'yesterday':
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      endDate = today
      break
    case 'last_7_days':
      startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
      break
    case 'last_30_days':
    default:
      startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      break
  }

  return { startDate, endDate }
}

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
    const preset = searchParams.get('preset') || 'last_30_days'
    const isExecutiveView = searchParams.get('executive') === 'true'

    // Only show for executive view
    if (!isExecutiveView) {
      return NextResponse.json({ agents: [] })
    }

    const { startDate, endDate } = getDateRange(preset)

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { id: authUser.ownerId },
          { accountOwnerId: authUser.ownerId }
        ],
        status: 'active'
      },
      select: { id: true, name: true }
    })

    // Get activity counts per user
    const agentStats = await Promise.all(
      teamMembers.map(async (member) => {
        const [activityCount, tasksCompleted] = await Promise.all([
          prisma.recordActivityLog.count({
            where: {
              userId: member.id,
              createdAt: { gte: startDate, lt: endDate }
            }
          }),
          prisma.task.count({
            where: {
              assignedToId: member.id,
              status: 'COMPLETED',
              completedAt: { gte: startDate, lt: endDate }
            }
          })
        ])

        return {
          id: member.id,
          name: member.name || 'Unknown',
          activityCount,
          tasksCompleted
        }
      })
    )

    // Sort by activity count descending and take top 10
    const sortedAgents = agentStats
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 10)

    return NextResponse.json({ agents: sortedAgents })
    
  } catch (error) {
    console.error('Activity Agents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
