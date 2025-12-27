/**
 * DockInsight 3.0 - Tasks List API
 * 
 * GET /api/dockinsight/tasks-list
 * Returns paginated task list with search and filters
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
    const priority = searchParams.get('priority') || undefined
    const status = searchParams.get('status') || undefined
    const filterType = searchParams.get('filterType') || 'open_overdue'
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Build base where clause
    const baseWhere: any = {
      createdById: authUser.ownerId
    }
    
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }

    if (priority) {
      baseWhere.priority = priority
    }

    if (status) {
      baseWhere.status = status
    }

    // Calculate date boundaries
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Apply filter type
    switch (filterType) {
      case 'open_overdue':
        baseWhere.status = { notIn: ['COMPLETED', 'CANCELLED'] }
        break
      case 'overdue':
        baseWhere.dueDate = { lt: today }
        baseWhere.status = { notIn: ['COMPLETED', 'CANCELLED'] }
        break
      case 'due_tomorrow':
        baseWhere.dueDate = { gte: tomorrow, lt: dayAfterTomorrow }
        baseWhere.status = { notIn: ['COMPLETED', 'CANCELLED'] }
        break
      case 'due_next_7_days':
        baseWhere.dueDate = { gte: today, lt: next7Days }
        baseWhere.status = { notIn: ['COMPLETED', 'CANCELLED'] }
        break
      case 'completed':
        baseWhere.status = 'COMPLETED'
        break
    }

    // Apply search
    if (search) {
      baseWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count and tasks
    const [total, tasks] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.findMany({
        where: baseWhere,
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          status: true,
          createdAt: true,
          assignedToId: true,
          assignedTo: {
            select: { id: true, name: true }
          },
          record: {
            select: { id: true, ownerFullName: true }
          }
        },
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])

    // Calculate age (days since creation)
    const formattedTasks = tasks.map(task => {
      const createdAt = new Date(task.createdAt)
      const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000))
      
      // Determine task type from title
      const titleLower = task.title.toLowerCase()
      let taskType = 'Task'
      if (titleLower.includes('call') || titleLower.includes('phone')) taskType = 'Call'
      else if (titleLower.includes('meeting') || titleLower.includes('meet')) taskType = 'Meeting'
      else if (titleLower.includes('email') || titleLower.includes('mail')) taskType = 'Email'
      else if (titleLower.includes('follow')) taskType = 'Follow-Up'
      else if (titleLower.includes('review')) taskType = 'Review'

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        taskType,
        dueDate: task.dueDate?.toISOString() || null,
        priority: task.priority,
        status: task.status,
        ageDays,
        assigneeId: task.assignedToId,
        assigneeName: task.assignedTo?.name || null,
        recordId: task.record?.id || null,
        recordName: task.record?.ownerFullName || null
      }
    })

    return NextResponse.json({
      tasks: formattedTasks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
    
  } catch (error) {
    console.error('Tasks List API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Mark task as done
export async function PATCH(request: NextRequest) {
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
    const { taskIds, action } = body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs required' }, { status: 400 })
    }

    if (action === 'complete') {
      await prisma.task.updateMany({
        where: {
          id: { in: taskIds },
          createdById: authUser.ownerId
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Tasks List PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
