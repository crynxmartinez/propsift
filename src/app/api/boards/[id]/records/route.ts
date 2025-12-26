import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';
import { findMatchingAutomations, executeAutomation } from '@/lib/automation/engine';

// POST /api/boards/[id]/records - Add a record to a board column
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
    const { recordId, columnId } = body;

    if (!recordId || !columnId) {
      return NextResponse.json({ error: 'Record ID and Column ID are required' }, { status: 400 });
    }

    // Check record exists and belongs to team
    const record = await prisma.record.findFirst({
      where: { id: recordId, createdById: authUser.ownerId },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Check column exists and belongs to this board
    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId, boardId: params.id },
    });

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    // Check if record is already on this board (in any column)
    const existingPosition = await prisma.recordBoardPosition.findFirst({
      where: {
        recordId,
        column: { boardId: params.id },
      },
    });

    if (existingPosition) {
      // Move to new column instead of creating duplicate
      const maxOrder = await prisma.recordBoardPosition.aggregate({
        where: { columnId },
        _max: { order: true },
      });

      const updated = await prisma.recordBoardPosition.update({
        where: { id: existingPosition.id },
        data: {
          columnId,
          order: (maxOrder._max.order ?? -1) + 1,
        },
        include: {
          record: {
            include: {
              status: true,
              assignedTo: { select: { id: true, name: true, email: true } },
              recordTags: { include: { tag: true } },
              phoneNumbers: { take: 1, orderBy: { createdAt: 'asc' } },
            },
          },
        },
      });

      return NextResponse.json(updated);
    }

    // Get max order for the column
    const maxOrder = await prisma.recordBoardPosition.aggregate({
      where: { columnId },
      _max: { order: true },
    });

    const position = await prisma.recordBoardPosition.create({
      data: {
        recordId,
        columnId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        record: {
          include: {
            status: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            recordTags: { include: { tag: true } },
            phoneNumbers: { take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    // Trigger added_to_board automation
    findMatchingAutomations('added_to_board', authUser.ownerId).then(automations => {
      for (const automation of automations) {
        executeAutomation(automation.id, recordId, 'added_to_board').catch(err => {
          console.error(`Error executing automation ${automation.id}:`, err);
        });
      }
    }).catch(err => console.error('Error finding automations:', err));

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error('Error adding record to board:', error);
    return NextResponse.json({ error: 'Failed to add record to board' }, { status: 500 });
  }
}

// PUT /api/boards/[id]/records - Move a record between columns or reorder
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
    const { positionId, columnId, order } = body;

    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    // Check position exists
    const existing = await prisma.recordBoardPosition.findFirst({
      where: { id: positionId },
      include: { column: true },
    });

    if (!existing || existing.column.boardId !== params.id) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (columnId !== undefined) {
      // Check new column exists and belongs to this board
      const column = await prisma.boardColumn.findFirst({
        where: { id: columnId, boardId: params.id },
      });

      if (!column) {
        return NextResponse.json({ error: 'Column not found' }, { status: 404 });
      }

      updateData.columnId = columnId;
    }

    if (order !== undefined) {
      updateData.order = order;
    }

    const position = await prisma.recordBoardPosition.update({
      where: { id: positionId },
      data: updateData,
      include: {
        record: {
          include: {
            status: true,
            assignedTo: { select: { id: true, name: true, email: true } },
            recordTags: { include: { tag: true } },
            phoneNumbers: { take: 1, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    // Trigger moved_to_column automation if column changed
    if (columnId !== undefined && columnId !== existing.columnId) {
      findMatchingAutomations('moved_to_column', authUser.ownerId).then(automations => {
        for (const automation of automations) {
          executeAutomation(automation.id, existing.recordId, 'moved_to_column').catch(err => {
            console.error(`Error executing automation ${automation.id}:`, err);
          });
        }
      }).catch(err => console.error('Error finding automations:', err));
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error('Error moving record:', error);
    return NextResponse.json({ error: 'Failed to move record' }, { status: 500 });
  }
}

// DELETE /api/boards/[id]/records - Remove a record from the board
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { searchParams } = new URL(request.url);
    const positionId = searchParams.get('positionId');

    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    // Check position exists and belongs to this board
    const existing = await prisma.recordBoardPosition.findFirst({
      where: { id: positionId },
      include: { column: true },
    });

    if (!existing || existing.column.boardId !== params.id) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    await prisma.recordBoardPosition.delete({
      where: { id: positionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing record from board:', error);
    return NextResponse.json({ error: 'Failed to remove record from board' }, { status: 500 });
  }
}
