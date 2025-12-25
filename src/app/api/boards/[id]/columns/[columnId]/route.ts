import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// PUT /api/boards/[id]/columns/[columnId] - Update a column (rename, color)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; columnId: string } }
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

    // Check column exists and belongs to this board
    const existing = await prisma.boardColumn.findFirst({
      where: { id: params.columnId, boardId: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Column name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (color !== undefined) {
      updateData.color = color;
    }

    const column = await prisma.boardColumn.update({
      where: { id: params.columnId },
      data: updateData,
      include: {
        _count: {
          select: { records: true },
        },
      },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error('Error updating column:', error);
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 });
  }
}

// DELETE /api/boards/[id]/columns/[columnId] - Delete a column
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; columnId: string } }
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

    // Check column exists and belongs to this board
    const existing = await prisma.boardColumn.findFirst({
      where: { id: params.columnId, boardId: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    // Delete column (cascade will delete record positions)
    await prisma.boardColumn.delete({
      where: { id: params.columnId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting column:', error);
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 });
  }
}
