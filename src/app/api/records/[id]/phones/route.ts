import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/records/[id]/phones - Get all phone numbers for a record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const phones = await prisma.recordPhoneNumber.findMany({
      where: { recordId: params.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(phones);
  } catch (error) {
    console.error('Error fetching phones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/records/[id]/phones - Add a new phone number
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { number, type, status } = body;

    if (!number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // Check phone count limit (max 30)
    const phoneCount = await prisma.recordPhoneNumber.count({
      where: { recordId: params.id },
    });

    if (phoneCount >= 30) {
      return NextResponse.json(
        { error: 'Maximum of 30 phone numbers allowed per record' },
        { status: 400 }
      );
    }

    const phone = await prisma.recordPhoneNumber.create({
      data: {
        recordId: params.id,
        number,
        type: type || 'MOBILE',
        status: status || 'NONE',
      },
    });

    // Log activity
    await prisma.recordActivityLog.create({
      data: {
        recordId: params.id,
        action: 'created',
        field: 'phoneNumber',
        newValue: number,
        source: 'Property Details Page',
      },
    });

    return NextResponse.json(phone, { status: 201 });
  } catch (error) {
    console.error('Error creating phone:', error);
    return NextResponse.json(
      { error: 'Failed to create phone number' },
      { status: 500 }
    );
  }
}
