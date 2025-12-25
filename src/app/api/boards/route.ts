import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/boards - List all boards for the team
export async function GET(request: NextRequest) {
  try {
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

    const boards = await prisma.board.findMany({
      where: { createdById: authUser.ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { records: true },
            },
          },
        },
        _count: {
          select: { columns: true },
        },
      },
    });

    // Calculate total records per board
    const boardsWithCounts = boards.map(board => ({
      ...board,
      totalRecords: board.columns.reduce((sum, col) => sum + col._count.records, 0),
    }));

    return NextResponse.json(boardsWithCounts);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST /api/boards - Create a new board
export async function POST(request: NextRequest) {
  try {
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await prisma.board.findFirst({
      where: { name: name.trim(), createdById: authUser.ownerId },
    });

    if (existing) {
      return NextResponse.json({ error: 'A board with this name already exists' }, { status: 400 });
    }

    // Create board with default columns
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: authUser.ownerId,
        columns: {
          create: [
            { name: 'New', color: '#6366f1', order: 0 },
            { name: 'In Progress', color: '#f59e0b', order: 1 },
            { name: 'Done', color: '#10b981', order: 2 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { records: true },
            },
          },
        },
        _count: {
          select: { columns: true },
        },
      },
    });

    return NextResponse.json({
      ...board,
      totalRecords: 0,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
