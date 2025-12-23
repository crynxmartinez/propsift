import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/records/[id]/phones/[phoneId] - Update a phone number
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; phoneId: string } }
) {
  try {
    const body = await request.json();
    const { number, type, status } = body;

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

    const updateData: Record<string, string> = {};
    if (number !== undefined) updateData.number = number;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;

    const phone = await prisma.recordPhoneNumber.update({
      where: { id: params.phoneId },
      data: updateData,
    });

    // Log activity if status changed
    if (status !== undefined && status !== existingPhone.status) {
      await prisma.recordActivityLog.create({
        data: {
          recordId: params.id,
          action: 'updated',
          field: 'phoneStatus',
          oldValue: existingPhone.status,
          newValue: status,
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
