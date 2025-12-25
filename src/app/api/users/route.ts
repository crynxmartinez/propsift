import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/users - Get team members for the current user's account
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get all team members for this account (owner + team members)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: authUser.ownerId }, // The owner
          { accountOwnerId: authUser.ownerId } // Team members
        ],
        status: 'active' // Only active users
      },
      select: {
        id: true,
        name: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
