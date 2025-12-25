import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/task-templates - Get all task templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task templates' },
      { status: 500 }
    );
  }
}

// POST /api/task-templates - Create a new task template
export async function POST(request: NextRequest) {
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

    if (!name || !title) {
      return NextResponse.json(
        { error: 'Name and title are required' },
        { status: 400 }
      );
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name,
        title,
        description: description || null,
        category: category || null,
        priority: priority || 'MEDIUM',
        dueDaysFromNow: dueDaysFromNow !== undefined ? dueDaysFromNow : null,
        dueTime: dueTime || null,
        recurrence: recurrence || null,
        recurrenceDays: recurrenceDays || [],
        skipWeekends: skipWeekends || false,
        assignmentType: assignmentType || 'MANUAL',
        roundRobinUsers: roundRobinUsers || [],
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating task template:', error);
    return NextResponse.json(
      { error: 'Failed to create task template' },
      { status: 500 }
    );
  }
}
