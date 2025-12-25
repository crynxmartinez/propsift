import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/filter-templates - List all templates grouped by folder
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

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Get all folders with their templates for this team
    const folders = await prisma.filterFolder.findMany({
      where: { createdById: authUser.ownerId },
      orderBy: { order: 'asc' },
      include: {
        templates: {
          where: { createdById: authUser.ownerId },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Get uncategorized templates (no folder) for this team
    const uncategorized = await prisma.filterTemplate.findMany({
      where: { folderId: null, createdById: authUser.ownerId },
      orderBy: { order: 'asc' },
    });

    // Get total template count for this team
    const totalCount = await prisma.filterTemplate.count({
      where: { createdById: authUser.ownerId },
    });

    return NextResponse.json({
      folders,
      uncategorized,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching filter templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter templates' },
      { status: 500 }
    );
  }
}

// POST /api/filter-templates - Create a new template
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

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const body = await request.json();
    const { name, filters, folderId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!filters || !Array.isArray(filters)) {
      return NextResponse.json(
        { error: 'Filters array is required' },
        { status: 400 }
      );
    }

    // If folderId provided, verify folder exists and belongs to team
    if (folderId) {
      const folder = await prisma.filterFolder.findFirst({
        where: { id: folderId, createdById: authUser.ownerId },
      });
      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Get max order for the folder (or uncategorized) for this team
    const maxOrder = await prisma.filterTemplate.aggregate({
      where: { folderId: folderId || null, createdById: authUser.ownerId },
      _max: { order: true },
    });

    const template = await prisma.filterTemplate.create({
      data: {
        name: name.trim(),
        filters: filters,
        folderId: folderId || null,
        order: (maxOrder._max.order ?? -1) + 1,
        createdById: authUser.ownerId,
      },
      include: {
        folder: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating filter template:', error);
    return NextResponse.json(
      { error: 'Failed to create filter template' },
      { status: 500 }
    );
  }
}
