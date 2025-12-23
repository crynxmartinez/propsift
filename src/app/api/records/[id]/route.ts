import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';

// GET /api/records/[id] - Get a single record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.record.findUnique({
      where: { id: params.id },
      include: {
        status: true,
        recordTags: {
          include: {
            tag: true,
          },
        },
        recordMotivations: {
          include: {
            motivation: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    );
  }
}

// PUT /api/records/[id] - Update a record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      ownerFirstName,
      ownerLastName,
      ownerFullName,
      isCompanyOverride,
      propertyStreet,
      propertyCity,
      propertyState,
      propertyZip,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      statusId,
      skiptraceDate,
    } = body;

    // Check if record exists
    const existingRecord = await prisma.record.findUnique({
      where: { id: params.id },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Auto-detect company if ownerFullName changed
    let isCompany = existingRecord.isCompany;
    if (ownerFullName && ownerFullName !== existingRecord.ownerFullName) {
      isCompany = detectCompany(ownerFullName);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (ownerFirstName !== undefined) updateData.ownerFirstName = ownerFirstName || null;
    if (ownerLastName !== undefined) updateData.ownerLastName = ownerLastName || null;
    if (ownerFullName !== undefined) {
      updateData.ownerFullName = ownerFullName;
      updateData.isCompany = isCompany;
    }
    if (isCompanyOverride !== undefined) updateData.isCompanyOverride = isCompanyOverride;
    if (propertyStreet !== undefined) updateData.propertyStreet = propertyStreet || null;
    if (propertyCity !== undefined) updateData.propertyCity = propertyCity || null;
    if (propertyState !== undefined) updateData.propertyState = propertyState || null;
    if (propertyZip !== undefined) updateData.propertyZip = propertyZip || null;
    if (mailingStreet !== undefined) updateData.mailingStreet = mailingStreet || null;
    if (mailingCity !== undefined) updateData.mailingCity = mailingCity || null;
    if (mailingState !== undefined) updateData.mailingState = mailingState || null;
    if (mailingZip !== undefined) updateData.mailingZip = mailingZip || null;
    if (statusId !== undefined) updateData.statusId = statusId || null;
    if (skiptraceDate !== undefined) updateData.skiptraceDate = skiptraceDate ? new Date(skiptraceDate) : null;

    // Calculate completeness with merged data
    const mergedData = {
      ...existingRecord,
      ...updateData,
    };
    updateData.isComplete = isRecordComplete({
      ownerFirstName: mergedData.ownerFirstName as string | null,
      ownerLastName: mergedData.ownerLastName as string | null,
      isCompany: mergedData.isCompany as boolean,
      isCompanyOverride: mergedData.isCompanyOverride as boolean | null,
      propertyStreet: mergedData.propertyStreet as string | null,
      propertyCity: mergedData.propertyCity as string | null,
      propertyState: mergedData.propertyState as string | null,
      propertyZip: mergedData.propertyZip as string | null,
      mailingStreet: mergedData.mailingStreet as string | null,
      mailingCity: mergedData.mailingCity as string | null,
      mailingState: mergedData.mailingState as string | null,
      mailingZip: mergedData.mailingZip as string | null,
    });

    // Update record
    const record = await prisma.record.update({
      where: { id: params.id },
      data: updateData,
      include: {
        status: true,
        recordTags: {
          include: {
            tag: true,
          },
        },
        recordMotivations: {
          include: {
            motivation: true,
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}

// DELETE /api/records/[id] - Delete a record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if record exists
    const existingRecord = await prisma.record.findUnique({
      where: { id: params.id },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Delete record (cascade will handle related records)
    await prisma.record.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { error: 'Failed to delete record' },
      { status: 500 }
    );
  }
}
