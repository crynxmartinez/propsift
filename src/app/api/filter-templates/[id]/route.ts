import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/filter-templates/[id] - Get a single template
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

    const template = await prisma.filterTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
      include: {
        folder: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching filter template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter template' },
      { status: 500 }
    );
  }
}

// PUT /api/filter-templates/[id] - Update a template (rename, move folder, update filters)
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
    const { name, filters, folderId } = body;

    // Check template exists and belongs to user
    const existing = await prisma.filterTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { error: 'Template name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (filters !== undefined) {
      if (!Array.isArray(filters)) {
        return NextResponse.json(
          { error: 'Filters must be an array' },
          { status: 400 }
        );
      }
      updateData.filters = filters;
    }

    if (folderId !== undefined) {
      if (folderId !== null) {
        // Verify folder exists and belongs to user
        const folder = await prisma.filterFolder.findFirst({
          where: { id: folderId, createdById: decoded.userId },
        });
        if (!folder) {
          return NextResponse.json(
            { error: 'Folder not found' },
            { status: 404 }
          );
        }
      }
      updateData.folderId = folderId;
    }

    const template = await prisma.filterTemplate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        folder: true,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating filter template:', error);
    return NextResponse.json(
      { error: 'Failed to update filter template' },
      { status: 500 }
    );
  }
}

// DELETE /api/filter-templates/[id] - Delete a template
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

    // Check template exists and belongs to user
    const existing = await prisma.filterTemplate.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    await prisma.filterTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter template:', error);
    return NextResponse.json(
      { error: 'Failed to delete filter template' },
      { status: 500 }
    );
  }
}
