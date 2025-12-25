import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/filter-folders - List all folders with template count
export async function GET() {
  try {
    const folders = await prisma.filterFolder.findMany({
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
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.filterFolder.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 400 }
      );
    }

    // Get max order
    const maxOrder = await prisma.filterFolder.aggregate({
      _max: { order: true },
    });

    const folder = await prisma.filterFolder.create({
      data: {
        name: name.trim(),
        order: (maxOrder._max.order ?? -1) + 1,
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
