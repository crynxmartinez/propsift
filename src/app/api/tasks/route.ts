import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser, canViewAllData } from '@/lib/roles';
import { findMatchingAutomations, executeAutomation } from '@/lib/automation/engine';

// GET /api/tasks - Get all tasks with filters
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedToId = searchParams.get('assignedToId');
    const recordId = searchParams.get('recordId');
    const priority = searchParams.get('priority');
    const dueDateFrom = searchParams.get('dueDateFrom');
    const dueDateTo = searchParams.get('dueDateTo');
    const includeNoDueDate = searchParams.get('includeNoDueDate') === 'true';

    // Build where clause - filter by team's tasks
    const where: Record<string, unknown> = {
      createdById: authUser.ownerId, // Team data sharing
    };

    // Members can only see tasks assigned to them
    if (!canViewAllData(authUser.role)) {
      where.assignedToId = authUser.id;
    }

    if (status) {
      if (status === 'ACTIVE') {
        where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      } else {
        where.status = status;
      }
    }

    if (assignedToId) {
      if (assignedToId === 'UNASSIGNED') {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignedToId;
      }
    }

    if (recordId) {
      where.recordId = recordId;
    }

    if (priority) {
      where.priority = priority;
    }

    // Date filtering
    if (dueDateFrom || dueDateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dueDateFrom) {
        dateFilter.gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        dateFilter.lte = new Date(dueDateTo);
      }
      
      if (includeNoDueDate) {
        where.OR = [
          { dueDate: dateFilter },
          { dueDate: null }
        ];
      } else {
        where.dueDate = dateFilter;
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        record: {
          select: {
            id: true,
            ownerFullName: true,
            propertyStreet: true,
            propertyCity: true,
            propertyState: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      dueDate,
      dueTime,
      notifyAfter,
      notifyAfterUnit,
      repeatCount,
      startDate,
      recurrence,
      recurrenceDays,
      skipWeekends,
      priority,
      assignmentType,
      assignedToId,
      recordId,
      templateId,
      saveAsTemplate,
      templateName,
      templateCategory,
      roundRobinUsers,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Use ownerId for team data sharing
    const createdById = authUser.ownerId;

    // Handle round robin assignment
    let finalAssignedToId = assignedToId;
    if (assignmentType === 'ROUND_ROBIN' && roundRobinUsers && roundRobinUsers.length > 0) {
      // Get or create round robin state
      const identifier = templateId || 'global';
      let roundRobinState = await prisma.roundRobinState.findUnique({
        where: { identifier },
      });

      if (!roundRobinState) {
        roundRobinState = await prisma.roundRobinState.create({
          data: {
            identifier,
            userIds: roundRobinUsers,
            currentIndex: 0,
          },
        });
      }

      // Get next user in rotation
      const currentIndex = roundRobinState.currentIndex;
      const userIds = roundRobinState.userIds.length > 0 ? roundRobinState.userIds : roundRobinUsers;
      finalAssignedToId = userIds[currentIndex % userIds.length];

      // Update index for next assignment
      await prisma.roundRobinState.update({
        where: { identifier },
        data: {
          currentIndex: (currentIndex + 1) % userIds.length,
          userIds: roundRobinUsers, // Update user list if changed
        },
      });
    }

    // Calculate due date if using days from now
    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    
    // Skip weekends if needed
    if (calculatedDueDate && skipWeekends) {
      const day = calculatedDueDate.getDay();
      if (day === 0) calculatedDueDate.setDate(calculatedDueDate.getDate() + 1); // Sunday -> Monday
      if (day === 6) calculatedDueDate.setDate(calculatedDueDate.getDate() + 2); // Saturday -> Monday
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: calculatedDueDate,
        dueTime: dueTime || null,
        notifyAfter: notifyAfter ?? null,
        notifyAfterUnit: notifyAfterUnit || null,
        repeatCount: repeatCount ?? null,
        startDate: startDate ? new Date(startDate) : null,
        recurrence: recurrence || null,
        recurrenceDays: recurrenceDays || [],
        skipWeekends: skipWeekends || false,
        priority: priority || 'MEDIUM',
        assignmentType: assignmentType || 'MANUAL',
        assignedToId: finalAssignedToId || null,
        recordId: recordId || null,
        createdById,
        templateId: templateId || null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        record: {
          select: {
            id: true,
            ownerFullName: true,
            propertyStreet: true,
            propertyCity: true,
            propertyState: true,
          },
        },
      },
    });

    // Save as template if requested
    if (saveAsTemplate && templateName) {
      await prisma.taskTemplate.create({
        data: {
          name: templateName,
          title,
          description: description || null,
          category: templateCategory || null,
          priority: priority || 'MEDIUM',
          dueDaysFromNow: dueDate ? 0 : null, // Will be calculated differently for templates
          dueTime: dueTime || null,
          recurrence: recurrence || null,
          recurrenceDays: recurrenceDays || [],
          skipWeekends: skipWeekends || false,
          assignmentType: assignmentType || 'MANUAL',
          roundRobinUsers: roundRobinUsers || [],
        },
      });
    }

    // Create notification for assigned user
    if (task.assignedToId && task.assignedToId !== createdById) {
      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You have been assigned: "${task.title}"`,
          taskId: task.id,
          recordId: task.recordId,
          deliveryType: 'IMMEDIATE',
        },
      });
    }

    // Create system log
    await prisma.activityLog.create({
      data: {
        type: 'action',
        action: 'task_created',
        description: `Task created: "${task.title}"`,
        total: 1,
        processed: 1,
        status: 'completed',
      },
    });

    // Trigger task_created automations if task is linked to a record
    if (task.recordId) {
      findMatchingAutomations('task_created', authUser.ownerId).then(automations => {
        for (const automation of automations) {
          executeAutomation(automation.id, task.recordId!, 'task_created').catch(err => {
            console.error(`Error executing automation ${automation.id}:`, err);
          });
        }
      }).catch(err => console.error('Error finding automations:', err));
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
