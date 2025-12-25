import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/tasks/bulk - Create tasks from template for multiple records
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, recordIds, createdById } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Record IDs are required' },
        { status: 400 }
      );
    }

    if (!createdById) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Fetch the template
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Calculate due date if template has dueDaysFromNow
    let dueDate: Date | null = null;
    if (template.dueDaysFromNow !== null) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.dueDaysFromNow);
      
      // Skip weekends if needed
      if (template.skipWeekends) {
        const day = dueDate.getDay();
        if (day === 0) dueDate.setDate(dueDate.getDate() + 1); // Sunday -> Monday
        if (day === 6) dueDate.setDate(dueDate.getDate() + 2); // Saturday -> Monday
      }
    }

    // Handle round robin assignment
    let roundRobinState = null;
    if (template.assignmentType === 'ROUND_ROBIN' && template.roundRobinUsers.length > 0) {
      roundRobinState = await prisma.roundRobinState.findUnique({
        where: { identifier: templateId },
      });

      if (!roundRobinState) {
        roundRobinState = await prisma.roundRobinState.create({
          data: {
            identifier: templateId,
            userIds: template.roundRobinUsers,
            currentIndex: 0,
          },
        });
      }
    }

    // Create tasks for each record
    const tasks = [];
    let currentRoundRobinIndex = roundRobinState?.currentIndex || 0;

    for (const recordId of recordIds) {
      // Determine assigned user
      let assignedToId: string | null = null;
      if (template.assignmentType === 'ROUND_ROBIN' && template.roundRobinUsers.length > 0) {
        assignedToId = template.roundRobinUsers[currentRoundRobinIndex % template.roundRobinUsers.length];
        currentRoundRobinIndex++;
      }

      const task = await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          dueDate,
          dueTime: template.dueTime,
          recurrence: template.recurrence,
          recurrenceDays: template.recurrenceDays,
          skipWeekends: template.skipWeekends,
          priority: template.priority,
          assignmentType: template.assignmentType,
          assignedToId,
          recordId,
          createdById,
          templateId,
        },
        include: {
          assignedTo: {
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
            },
          },
        },
      });

      tasks.push(task);

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
    }

    // Update round robin state if used
    if (roundRobinState && template.assignmentType === 'ROUND_ROBIN') {
      await prisma.roundRobinState.update({
        where: { identifier: templateId },
        data: {
          currentIndex: currentRoundRobinIndex % template.roundRobinUsers.length,
        },
      });
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'action',
        action: 'bulk_tasks_created',
        description: `Created ${tasks.length} tasks from template "${template.name}"`,
        total: tasks.length,
        processed: tasks.length,
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating bulk tasks:', error);
    return NextResponse.json(
      { error: 'Failed to create tasks' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/bulk - Delete all tasks for specified records
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordIds } = body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Record IDs are required' },
        { status: 400 }
      );
    }

    // Count tasks before deletion
    const taskCount = await prisma.task.count({
      where: {
        recordId: { in: recordIds },
      },
    });

    // Delete all tasks for the specified records
    const result = await prisma.task.deleteMany({
      where: {
        recordId: { in: recordIds },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        type: 'action',
        action: 'bulk_tasks_deleted',
        description: `Deleted ${result.count} tasks from ${recordIds.length} records`,
        total: taskCount,
        processed: result.count,
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      recordCount: recordIds.length,
    });
  } catch (error) {
    console.error('Error deleting bulk tasks:', error);
    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    );
  }
}
