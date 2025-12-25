import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/filter-folders - List all folders with template count
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

    const folders = await prisma.filterFolder.findMany({
      where: { createdById: decoded.userId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { templates: true },
        },
      },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching filter folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter folders' },
      { status: 500 }
    );
  }
}

// POST /api/filter-folders - Create a new folder
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
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name for this user
    const existing = await prisma.filterFolder.findFirst({
      where: { name: name.trim(), createdById: decoded.userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 400 }
      );
    }

    // Get max order for this user
    const maxOrder = await prisma.filterFolder.aggregate({
      where: { createdById: decoded.userId },
      _max: { order: true },
    });

    const folder = await prisma.filterFolder.create({
      data: {
        name: name.trim(),
        order: (maxOrder._max.order ?? -1) + 1,
        createdById: decoded.userId,
      },
      include: {
        _count: {
          select: { templates: true },
        },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating filter folder:', error);
    return NextResponse.json(
      { error: 'Failed to create filter folder' },
      { status: 500 }
    );
  }
}
