import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
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
            propertyZip: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      status,
      priority,
      assignedToId,
      recordId,
    } = body;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (dueTime !== undefined) updateData.dueTime = dueTime || null;
    if (notifyAfter !== undefined) updateData.notifyAfter = notifyAfter ?? null;
    if (notifyAfterUnit !== undefined) updateData.notifyAfterUnit = notifyAfterUnit || null;
    if (repeatCount !== undefined) updateData.repeatCount = repeatCount ?? null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (recurrence !== undefined) updateData.recurrence = recurrence || null;
    if (recurrenceDays !== undefined) updateData.recurrenceDays = recurrenceDays || [];
    if (skipWeekends !== undefined) updateData.skipWeekends = skipWeekends;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (recordId !== undefined) updateData.recordId = recordId || null;

    // Handle status change to COMPLETED
    if (status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      
      // Handle recurring task - create next occurrence
      if (existingTask.recurrence && existingTask.recurrence !== 'NONE') {
        await createNextRecurringTask(existingTask);
      }
    }

    // Handle status change from COMPLETED to something else
    if (status && status !== 'COMPLETED' && existingTask.status === 'COMPLETED') {
      updateData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
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

    // Create notification if assignee changed
    if (assignedToId && assignedToId !== existingTask.assignedToId && assignedToId !== existingTask.createdById) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned to You',
          message: `You have been assigned: "${task.title}"`,
          taskId: task.id,
          recordId: task.recordId,
          deliveryType: 'IMMEDIATE',
        },
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: params.id },
    });

    // Create system log
    await prisma.activityLog.create({
      data: {
        type: 'action',
        action: 'task_deleted',
        description: `Task deleted: "${existingTask.title}"`,
        total: 1,
        processed: 1,
        status: 'completed',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// Helper function to create next recurring task
async function createNextRecurringTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  dueTime: string | null;
  recurrence: string | null;
  recurrenceDays: string[];
  skipWeekends: boolean;
  priority: string;
  assignmentType: string;
  assignedToId: string | null;
  recordId: string | null;
  createdById: string;
  templateId: string | null;
}) {
  if (!task.dueDate || !task.recurrence) return;

  let nextDueDate = new Date(task.dueDate);

  switch (task.recurrence) {
    case 'DAILY':
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      break;
    case 'WEEKLY':
      if (task.recurrenceDays && task.recurrenceDays.length > 0) {
        // Find next occurrence based on selected days
        const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
        const selectedDays = task.recurrenceDays.map(d => dayMap[d]).sort((a, b) => a - b);
        const currentDay = nextDueDate.getDay();
        
        // Find next day in the list
        let nextDay = selectedDays.find(d => d > currentDay);
        if (nextDay === undefined) {
          // Wrap to next week
          nextDay = selectedDays[0];
          nextDueDate.setDate(nextDueDate.getDate() + (7 - currentDay + nextDay));
        } else {
          nextDueDate.setDate(nextDueDate.getDate() + (nextDay - currentDay));
        }
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      }
      break;
    case 'MONTHLY':
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    default:
      return;
  }

  // Skip weekends if needed
  if (task.skipWeekends) {
    const day = nextDueDate.getDay();
    if (day === 0) nextDueDate.setDate(nextDueDate.getDate() + 1); // Sunday -> Monday
    if (day === 6) nextDueDate.setDate(nextDueDate.getDate() + 2); // Saturday -> Monday
  }

  // Create the next task
  await prisma.task.create({
    data: {
      title: task.title,
      description: task.description,
      dueDate: nextDueDate,
      dueTime: task.dueTime,
      recurrence: task.recurrence,
      recurrenceDays: task.recurrenceDays,
      skipWeekends: task.skipWeekends,
      priority: task.priority,
      assignmentType: task.assignmentType,
      assignedToId: task.assignedToId,
      recordId: task.recordId,
      createdById: task.createdById,
      templateId: task.templateId,
      status: 'PENDING',
    },
  });
}
