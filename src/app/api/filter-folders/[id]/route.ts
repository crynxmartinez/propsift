import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/filter-folders/[id] - Get a single folder
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const folder = await prisma.filterFolder.findFirst({
      where: { id: params.id, createdById: decoded.userId },
      include: {
        templates: {
          where: { createdById: decoded.userId },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { templates: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error fetching filter folder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter folder' },
      { status: 500 }
    );
  }
}

// PUT /api/filter-folders/[id] - Update a folder (rename)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check folder exists and belongs to user
    const existing = await prisma.filterFolder.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current folder) for this user
    const duplicate = await prisma.filterFolder.findFirst({
      where: {
        name: name.trim(),
        createdById: decoded.userId,
        id: { not: params.id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 400 }
      );
    }

    const folder = await prisma.filterFolder.update({
      where: { id: params.id },
      data: { name: name.trim() },
      include: {
        _count: {
          select: { templates: true },
        },
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error updating filter folder:', error);
    return NextResponse.json(
      { error: 'Failed to update filter folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/filter-folders/[id] - Delete a folder (templates become uncategorized)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check folder exists and belongs to user
    const existing = await prisma.filterFolder.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Delete folder - templates will have folderId set to null due to onDelete: SetNull
    await prisma.filterFolder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete filter folder' },
      { status: 500 }
    );
  }
}
