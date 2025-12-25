import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// POST /api/boards/[id]/columns - Add a new column to a board
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check board exists and belongs to team
    const board = await prisma.board.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Column name is required' }, { status: 400 });
    }

    // Get max order for this board
    const maxOrder = await prisma.boardColumn.aggregate({
      where: { boardId: params.id },
      _max: { order: true },
    });

    const column = await prisma.boardColumn.create({
      data: {
        name: name.trim(),
        color: color || '#6366f1',
        order: (maxOrder._max.order ?? -1) + 1,
        boardId: params.id,
      },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    console.error('Error creating column:', error);
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 });
  }
}

// PUT /api/boards/[id]/columns - Reorder columns
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check board exists and belongs to team
    const board = await prisma.board.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const body = await request.json();
    const { columnIds } = body;

    if (!columnIds || !Array.isArray(columnIds)) {
      return NextResponse.json({ error: 'Column IDs array is required' }, { status: 400 });
    }

    // Update order for each column
    await Promise.all(
      columnIds.map((columnId: string, index: number) =>
        prisma.boardColumn.update({
          where: { id: columnId },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering columns:', error);
    return NextResponse.json({ error: 'Failed to reorder columns' }, { status: 500 });
  }
}
