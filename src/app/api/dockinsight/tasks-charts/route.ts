/**
 * DockInsight 3.0 - Tasks Charts API
 * 
 * GET /api/dockinsight/tasks-charts
 * Returns chart data:
 * - Tasks by Status (pie chart)
 * - Top Task Types (bar chart)
 * - Workflow Completion (progress bars)
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
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const priority = searchParams.get('priority')?.split(',').filter(Boolean) || undefined
    const taskStatus = searchParams.get('taskStatus')?.split(',').filter(Boolean) || undefined

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }

    if (priority && priority.length > 0) {
      baseWhere.priority = { in: priority }
    }
    if (taskStatus && taskStatus.length > 0) {
      baseWhere.status = { in: taskStatus }
    }

    // Calculate date boundaries
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Fetch chart data in parallel
    const [
      tasksByStatus,
      tasksByTitle,
      taskTemplates
    ] = await Promise.all([
      // Tasks by Status
      prisma.task.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { id: true }
      }),
      // Tasks by Title (for task types - group by common titles)
      prisma.task.groupBy({
        by: ['title'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      }),
      // Task Templates for workflow completion
      prisma.taskTemplate.findMany({
        where: {
          createdById: authUser.ownerId
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              tasks: true
            }
          }
        },
        take: 5
      })
    ])

    // Format Tasks by Status for pie chart
    // Include overdue as a separate status
    const overdueCount = await prisma.task.count({
      where: {
        ...baseWhere,
        dueDate: { lt: today },
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      }
    })

    const statusColors: Record<string, string> = {
      'Open': '#3b82f6',
      'Overdue': '#ef4444',
      'In Progress': '#f59e0b',
      'Completed': '#22c55e',
      'Cancelled': '#6b7280'
    }

    // Calculate open tasks (PENDING that are not overdue)
    const pendingCount = tasksByStatus.find(s => s.status === 'PENDING')?._count.id || 0
    const inProgressCount = tasksByStatus.find(s => s.status === 'IN_PROGRESS')?._count.id || 0
    const completedCount = tasksByStatus.find(s => s.status === 'COMPLETED')?._count.id || 0
    const cancelledCount = tasksByStatus.find(s => s.status === 'CANCELLED')?._count.id || 0

    // Open = PENDING tasks that are NOT overdue
    const openNotOverdue = Math.max(0, pendingCount - overdueCount)

    const formattedTasksByStatus = [
      { label: 'Open', value: openNotOverdue, color: statusColors['Open'] },
      { label: 'Overdue', value: overdueCount, color: statusColors['Overdue'] },
      { label: 'In Progress', value: inProgressCount, color: statusColors['In Progress'] },
      { label: 'Completed', value: completedCount, color: statusColors['Completed'] },
      { label: 'Cancelled', value: cancelledCount, color: statusColors['Cancelled'] }
    ].filter(s => s.value > 0)

    // Format Top Task Types (categorize by common task type keywords)
    const taskTypeKeywords: Record<string, string[]> = {
      'Call': ['call', 'phone', 'dial'],
      'Meeting': ['meeting', 'meet', 'appointment'],
      'Email': ['email', 'mail', 'send'],
      'Follow-Up': ['follow', 'followup', 'follow-up', 'check in'],
      'Review': ['review', 'check', 'verify']
    }

    const taskTypeCounts: Record<string, number> = {
      'Call': 0,
      'Meeting': 0,
      'Email': 0,
      'Follow-Up': 0,
      'Review': 0,
      'Other': 0
    }

    const typeColors: Record<string, string> = {
      'Call': '#3b82f6',
      'Meeting': '#22c55e',
      'Email': '#f59e0b',
      'Follow-Up': '#8b5cf6',
      'Review': '#ef4444',
      'Other': '#6b7280'
    }

    tasksByTitle.forEach(task => {
      const titleLower = task.title.toLowerCase()
      let matched = false
      
      for (const [type, keywords] of Object.entries(taskTypeKeywords)) {
        if (keywords.some(kw => titleLower.includes(kw))) {
          taskTypeCounts[type] += task._count.id
          matched = true
          break
        }
      }
      
      if (!matched) {
        taskTypeCounts['Other'] += task._count.id
      }
    })

    const formattedTaskTypes = Object.entries(taskTypeCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        label: type,
        value: count,
        color: typeColors[type]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    // Format Workflow Completion (based on task templates)
    const workflowCompletion = await Promise.all(
      taskTemplates.slice(0, 3).map(async (template) => {
        const [total, completed] = await Promise.all([
          prisma.task.count({
            where: {
              ...baseWhere,
              templateId: template.id
            }
          }),
          prisma.task.count({
            where: {
              ...baseWhere,
              templateId: template.id,
              status: 'COMPLETED'
            }
          })
        ])

        return {
          label: template.name,
          completed,
          total
        }
      })
    )

    return NextResponse.json({
      tasksByStatus: formattedTasksByStatus,
      taskTypes: formattedTaskTypes,
      workflowCompletion: workflowCompletion.filter(w => w.total > 0)
    })
    
  } catch (error) {
    console.error('Tasks Charts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
