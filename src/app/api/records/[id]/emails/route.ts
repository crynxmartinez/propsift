import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/records/[id]/emails - Get all emails for a record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const emails = await prisma.recordEmail.findMany({
      where: { recordId: params.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// POST /api/records/[id]/emails - Add a new email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { email: emailAddress, isPrimary } = body;

    if (!emailAddress) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Check if record exists
    const record = await prisma.record.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Check email count limit (max 15)
    const emailCount = await prisma.recordEmail.count({
      where: { recordId: params.id },
    });

    if (emailCount >= 15) {
      return NextResponse.json(
        { error: 'Maximum of 15 emails allowed per record' },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await prisma.recordEmail.updateMany({
        where: { recordId: params.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const email = await prisma.recordEmail.create({
      data: {
        recordId: params.id,
        email: emailAddress,
        isPrimary: isPrimary || false,
      },
    });

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId: params.id,
        action: 'created',
        field: 'email',
        newValue: emailAddress,
        source: 'Property Details Page',
      },
    });

    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    console.error('Error creating email:', error);
    return NextResponse.json(
      { error: 'Failed to create email' },
      { status: 500 }
    );
  }
}
