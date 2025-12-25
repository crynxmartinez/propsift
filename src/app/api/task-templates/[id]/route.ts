import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/task-templates/[id] - Get a single task template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
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
    const body = await request.json();
    const {
      name,
      title,
      description,
      category,
      priority,
      dueDaysFromNow,
      dueTime,
      recurrence,
      recurrenceDays,
      skipWeekends,
      assignmentType,
      roundRobinUsers,
    } = body;

    // Check if template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
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
    // Check if template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
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
