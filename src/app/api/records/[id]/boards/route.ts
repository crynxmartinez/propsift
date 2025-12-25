import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/records/[id]/boards - Get all board positions for a record
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

    // Check record exists and belongs to team
    const record = await prisma.record.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Get all board positions for this record
    const positions = await prisma.recordBoardPosition.findMany({
      where: { recordId: params.id },
      include: {
        column: {
          include: {
            board: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error fetching record board positions:', error);
    return NextResponse.json({ error: 'Failed to fetch board positions' }, { status: 500 });
  }
}
