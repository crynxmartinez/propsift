import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/boards/[id] - Get a single board with columns and records
export async function GET(
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

    const board = await prisma.board.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            records: {
              orderBy: { order: 'asc' },
              include: {
                record: {
                  include: {
                    status: true,
                    assignedTo: {
                      select: { id: true, name: true, email: true },
                    },
                    recordTags: {
                      include: { tag: true },
                    },
                    phoneNumbers: {
                      take: 1,
                      orderBy: { createdAt: 'asc' },
                    },
                    tasks: {
                      select: { id: true, status: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// PUT /api/boards/[id] - Update a board (rename, description)
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
    const existing = await prisma.board.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Board name cannot be empty' }, { status: 400 });
      }

      // Check for duplicate name (excluding current board)
      const duplicate = await prisma.board.findFirst({
        where: {
          name: name.trim(),
          createdById: authUser.ownerId,
          id: { not: params.id },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: 'A board with this name already exists' }, { status: 400 });
      }

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const board = await prisma.board.update({
      where: { id: params.id },
      data: updateData,
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
      totalRecords: board.columns.reduce((sum, col) => sum + col._count.records, 0),
    });
  } catch (error) {
    console.error('Error updating board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE /api/boards/[id] - Delete a board
export async function DELETE(
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
    const existing = await prisma.board.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Delete board (cascade will delete columns and record positions)
    await prisma.board.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
