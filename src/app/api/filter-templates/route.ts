import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/filter-templates - List all templates grouped by folder
export async function GET() {
  try {
    // Get all folders with their templates
    const folders = await prisma.filterFolder.findMany({
      orderBy: { order: 'asc' },
      include: {
        templates: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Get uncategorized templates (no folder)
    const uncategorized = await prisma.filterTemplate.findMany({
      where: { folderId: null },
      orderBy: { order: 'asc' },
    });

    // Get total template count
    const totalCount = await prisma.filterTemplate.count();

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

    // If folderId provided, verify folder exists
    if (folderId) {
      const folder = await prisma.filterFolder.findUnique({
        where: { id: folderId },
      });
      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Get max order for the folder (or uncategorized)
    const maxOrder = await prisma.filterTemplate.aggregate({
      where: { folderId: folderId || null },
      _max: { order: true },
    });

    const template = await prisma.filterTemplate.create({
      data: {
        name: name.trim(),
        filters: filters,
        folderId: folderId || null,
        order: (maxOrder._max.order ?? -1) + 1,
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
