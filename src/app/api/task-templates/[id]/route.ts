import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/task-templates/[id] - Get a single task template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const template = await prisma.taskTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching task template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task template' },
      { status: 500 }
    );
  }
}

// PUT /api/task-templates/[id] - Update a task template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const {
      name,
      title,
      description,
      category,
      priority,
      dueDaysFromNow,
      dueTime,
      noDueDate,
      notifyAfter,
      notifyAfterUnit,
      repeatCount,
      recurrence,
      recurrenceDays,
      skipWeekends,
      assignmentType,
      roundRobinUsers,
    } = body;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (category !== undefined) updateData.category = category || null;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDaysFromNow !== undefined) updateData.dueDaysFromNow = dueDaysFromNow;
    if (dueTime !== undefined) updateData.dueTime = dueTime || null;
    if (noDueDate !== undefined) updateData.noDueDate = noDueDate;
    if (notifyAfter !== undefined) updateData.notifyAfter = notifyAfter;
    if (notifyAfterUnit !== undefined) updateData.notifyAfterUnit = notifyAfterUnit || null;
    if (repeatCount !== undefined) updateData.repeatCount = repeatCount;
    if (recurrence !== undefined) updateData.recurrence = recurrence || null;
    if (recurrenceDays !== undefined) updateData.recurrenceDays = recurrenceDays || [];
    if (skipWeekends !== undefined) updateData.skipWeekends = skipWeekends;
    if (assignmentType !== undefined) updateData.assignmentType = assignmentType;
    if (roundRobinUsers !== undefined) updateData.roundRobinUsers = roundRobinUsers || [];

    const template = await prisma.taskTemplate.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating task template:', error);
    return NextResponse.json(
      { error: 'Failed to update task template' },
      { status: 500 }
    );
  }
}

// DELETE /api/task-templates/[id] - Delete a task template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    await prisma.taskTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task template:', error);
    return NextResponse.json(
      { error: 'Failed to delete task template' },
      { status: 500 }
    );
  }
}
