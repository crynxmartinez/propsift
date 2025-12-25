import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/filter-templates/[id]/duplicate - Duplicate a template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the original template
    const original = await prisma.filterTemplate.findUnique({
      where: { id: params.id },
    });

    if (!original) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get max order for the folder (or uncategorized)
    const maxOrder = await prisma.filterTemplate.aggregate({
      where: { folderId: original.folderId },
      _max: { order: true },
    });

    // Create duplicate with "(Copy)" suffix
    const duplicate = await prisma.filterTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        filters: original.filters as object,
        folderId: original.folderId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        folder: true,
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (error) {
    console.error('Error duplicating filter template:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate filter template' },
      { status: 500 }
    );
  }
}
