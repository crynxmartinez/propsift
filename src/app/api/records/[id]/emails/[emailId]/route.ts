import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/records/[id]/emails/[emailId] - Update an email
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; emailId: string } }
) {
  try {
    const body = await request.json();
    const { email: emailAddress, isPrimary } = body;

    // Check if email exists
    const existingEmail = await prisma.recordEmail.findUnique({
      where: { id: params.emailId },
    });

    if (!existingEmail || existingEmail.recordId !== params.id) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await prisma.recordEmail.updateMany({
        where: { recordId: params.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (emailAddress !== undefined) updateData.email = emailAddress;
    if (isPrimary !== undefined) updateData.isPrimary = isPrimary;

    const email = await prisma.recordEmail.update({
      where: { id: params.emailId },
      data: updateData,
    });

    return NextResponse.json(email);
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
}

// DELETE /api/records/[id]/emails/[emailId] - Delete an email
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; emailId: string } }
) {
  try {
    // Check if email exists
    const existingEmail = await prisma.recordEmail.findUnique({
      where: { id: params.emailId },
    });

    if (!existingEmail || existingEmail.recordId !== params.id) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    await prisma.recordEmail.delete({
      where: { id: params.emailId },
    });

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId: params.id,
        action: 'deleted',
        field: 'email',
        oldValue: existingEmail.email,
        source: 'Property Details Page',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}
