import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/records/[id]/phones/[phoneId] - Update a phone number
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; phoneId: string } }
) {
  try {
    const body = await request.json();
    const { number, type, statuses, status } = body;

    // Check if phone exists
    const existingPhone = await prisma.recordPhoneNumber.findUnique({
      where: { id: params.phoneId },
    });

    if (!existingPhone || existingPhone.recordId !== params.id) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (number !== undefined) updateData.number = number;
    if (type !== undefined) updateData.type = type;
    
    // Handle statuses array or single status toggle
    if (statuses !== undefined) {
      updateData.statuses = statuses;
    } else if (status !== undefined) {
      // Toggle single status - add if not present, remove if present
      const currentStatuses = existingPhone.statuses || [];
      if (currentStatuses.includes(status)) {
        updateData.statuses = currentStatuses.filter(s => s !== status);
      } else {
        updateData.statuses = [...currentStatuses, status];
      }
    }

    const phone = await prisma.recordPhoneNumber.update({
      where: { id: params.phoneId },
      data: updateData,
    });

    // Log activity if statuses changed
    if (statuses !== undefined || status !== undefined) {
      await prisma.recordActivityLog.create({
        data: {
          recordId: params.id,
          action: 'updated',
          field: 'phoneStatuses',
          oldValue: existingPhone.statuses.join(', '),
          newValue: (phone.statuses || []).join(', '),
          source: 'DockInsight',
        },
      });
    }

    return NextResponse.json(phone);
  } catch (error) {
    console.error('Error updating phone:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// PUT /api/records/[id]/phones/[phoneId] - Update a phone number
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; phoneId: string } }
) {
  try {
    const body = await request.json();
    const { number, type, statuses } = body;

    // Check if phone exists
    const existingPhone = await prisma.recordPhoneNumber.findUnique({
      where: { id: params.phoneId },
    });

    if (!existingPhone || existingPhone.recordId !== params.id) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (number !== undefined) updateData.number = number;
    if (type !== undefined) updateData.type = type;
    if (statuses !== undefined) updateData.statuses = statuses;

    const phone = await prisma.recordPhoneNumber.update({
      where: { id: params.phoneId },
      data: updateData,
    });

    // Log activity if statuses changed
    if (statuses !== undefined) {
      await prisma.recordActivityLog.create({
        data: {
          recordId: params.id,
          action: 'updated',
          field: 'phoneStatuses',
          oldValue: existingPhone.statuses.join(', '),
          newValue: statuses.join(', '),
          source: 'Property Details Page',
        },
      });
    }

    return NextResponse.json(phone);
  } catch (error) {
    console.error('Error updating phone:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// DELETE /api/records/[id]/phones/[phoneId] - Delete a phone number
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; phoneId: string } }
) {
  try {
    // Check if phone exists
    const existingPhone = await prisma.recordPhoneNumber.findUnique({
      where: { id: params.phoneId },
    });

    if (!existingPhone || existingPhone.recordId !== params.id) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    await prisma.recordPhoneNumber.delete({
      where: { id: params.phoneId },
    });

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId: params.id,
        action: 'deleted',
        field: 'phoneNumber',
        oldValue: existingPhone.number,
        source: 'Property Details Page',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phone:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
