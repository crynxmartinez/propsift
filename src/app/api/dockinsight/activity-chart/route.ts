/**
 * DockInsight 3.0 - Activity Chart API
 * 
 * GET /api/dockinsight/activity-chart
 * Returns activity data for the chart with hourly or daily granularity
 * 
 * Query params:
 * - range: 'today' | 'last_7_days' | 'last_30_days' | 'custom'
 * - startDate: ISO date string (for custom range)
 * - endDate: ISO date string (for custom range, optional)
 * - executive: 'true' | 'false'
 * - assigneeIds: comma-separated user IDs
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
    const range = searchParams.get('range') || 'last_7_days'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')
    const isExecutiveView = searchParams.get('executive') === 'true'
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined

    // Calculate date range and determine if hourly
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate: Date
    let endDate: Date
    let isHourly = false

    switch (range) {
      case 'today':
        startDate = today
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        isHourly = true
        break
      case 'last_7_days':
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'last_30_days':
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'custom':
        if (!customStartDate) {
          return NextResponse.json({ error: 'startDate required for custom range' }, { status: 400 })
        }
        startDate = new Date(customStartDate)
        startDate.setHours(0, 0, 0, 0)
        
        if (customEndDate && customEndDate !== customStartDate) {
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          // Single day - hourly view
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
          isHourly = true
        }
        break
      default:
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }

    // Build base where clause for records
    const recordWhere: any = {
      createdById: authUser.ownerId,
      createdAt: { gte: startDate, lt: endDate }
    }
    
    if (!isExecutiveView) {
      recordWhere.OR = [
        { assignedToId: authUser.id },
        { createdById: authUser.id }
      ]
    } else if (assigneeIds && assigneeIds.length > 0) {
      recordWhere.OR = [
        { assignedToId: { in: assigneeIds } },
        { createdById: { in: assigneeIds } }
      ]
    }

    // Build base where clause for tasks
    const taskWhere: any = {
      createdById: authUser.ownerId,
      status: 'COMPLETED',
      completedAt: { gte: startDate, lt: endDate }
    }
    
    if (!isExecutiveView) {
      taskWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      taskWhere.assignedToId = { in: assigneeIds }
    }

    // Fetch records and tasks
    const [records, tasks] = await Promise.all([
      prisma.record.findMany({
        where: recordWhere,
        select: { createdAt: true }
      }),
      prisma.task.findMany({
        where: taskWhere,
        select: { completedAt: true }
      })
    ])

    // Generate data points
    let dataPoints: { label: string; records: number; tasks: number }[] = []

    if (isHourly) {
      // Hourly view (24 hours)
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate.getTime() + hour * 60 * 60 * 1000)
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)
        
        const recordCount = records.filter(r => 
          r.createdAt >= hourStart && r.createdAt < hourEnd
        ).length
        
        const taskCount = tasks.filter(t => 
          t.completedAt && t.completedAt >= hourStart && t.completedAt < hourEnd
        ).length

        // Format hour label (12-hour format)
        const hourLabel = hour === 0 ? '12am' : 
                         hour < 12 ? `${hour}am` : 
                         hour === 12 ? '12pm' : 
                         `${hour - 12}pm`

        dataPoints.push({
          label: hourLabel,
          records: recordCount,
          tasks: taskCount
        })
      }
    } else {
      // Daily view
      const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      
      for (let i = 0; i < dayCount; i++) {
        const dayStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        
        const recordCount = records.filter(r => 
          r.createdAt >= dayStart && r.createdAt < dayEnd
        ).length
        
        const taskCount = tasks.filter(t => 
          t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd
        ).length

        // Format day label
        const dayLabel = dayStart.toLocaleDateString('en-US', { 
          weekday: 'short',
          ...(dayCount > 7 ? { month: 'short', day: 'numeric' } : {})
        })

        dataPoints.push({
          label: dayLabel,
          records: recordCount,
          tasks: taskCount
        })
      }
    }

    return NextResponse.json({
      data: dataPoints,
      isHourly,
      range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
    
  } catch (error) {
    console.error('Activity Chart API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
