import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/task-templates - Get all task templates
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
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Use ownerId for team data sharing - all team members see the same templates
    const where: Record<string, unknown> = { createdById: authUser.ownerId };
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
        createdById: decoded.userId,
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
