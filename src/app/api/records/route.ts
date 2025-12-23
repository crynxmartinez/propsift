import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';

// GET /api/records - List records with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || 'all'; // all, complete, incomplete

    // Validate limit
    const validLimits = [10, 20, 50, 100];
    const safeLimit = validLimits.includes(limit) ? limit : 10;
    const skip = (page - 1) * safeLimit;

    // Build where clause based on filter
    let whereClause = {};
    if (filter === 'complete') {
      whereClause = { isComplete: true };
    } else if (filter === 'incomplete') {
      whereClause = { isComplete: false };
    }

    // Get total count for pagination
    const totalCount = await prisma.record.count({ where: whereClause });

    // Get records with relations
    const records = await prisma.record.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    });

    // Calculate counts for each filter
    const completeCount = await prisma.record.count({ where: { isComplete: true } });
    const incompleteCount = await prisma.record.count({ where: { isComplete: false } });
    const allCount = await prisma.record.count();

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
      counts: {
        all: allCount,
        complete: completeCount,
        incomplete: incompleteCount,
      },
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}

// POST /api/records - Create a new record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerFirstName,
      ownerLastName,
      ownerFullName,
      isCompany: isCompanyInput,
      propertyStreet,
      propertyCity,
      propertyState,
      propertyZip,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      phone,
      email,
      notes,
      statusId,
      assignedToId,
      motivationIds,
      tagIds,
    } = body;

    // Validate required field
    if (!ownerFullName) {
      return NextResponse.json(
        { error: 'Owner full name is required' },
        { status: 400 }
      );
    }

    // Use provided isCompany or auto-detect
    const isCompany = isCompanyInput !== undefined ? isCompanyInput : detectCompany(ownerFullName);

    // Build record data for completeness check
    const recordDataForCheck = {
      ownerFirstName: ownerFirstName || null,
      ownerLastName: ownerLastName || null,
      isCompany,
      isCompanyOverride: null,
      propertyStreet: propertyStreet || null,
      propertyCity: propertyCity || null,
      propertyState: propertyState || null,
      propertyZip: propertyZip || null,
      mailingStreet: mailingStreet || null,
      mailingCity: mailingCity || null,
      mailingState: mailingState || null,
      mailingZip: mailingZip || null,
    };

    // Calculate completeness
    const isComplete = isRecordComplete(recordDataForCheck);

    // Create record with relations
    const record = await prisma.record.create({
      data: {
        ownerFirstName: ownerFirstName || null,
        ownerLastName: ownerLastName || null,
        ownerFullName,
        isCompany,
        isCompanyOverride: null,
        propertyStreet: propertyStreet || null,
        propertyCity: propertyCity || null,
        propertyState: propertyState || null,
        propertyZip: propertyZip || null,
        mailingStreet: mailingStreet || null,
        mailingCity: mailingCity || null,
        mailingState: mailingState || null,
        mailingZip: mailingZip || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        statusId: statusId || null,
        assignedToId: assignedToId || null,
        isComplete,
        // Create phone number entry if provided
        phoneNumbers: phone ? {
          create: {
            number: phone,
            type: 'MOBILE',
            status: 'NONE',
          },
        } : undefined,
        // Create email entry if provided
        emails: email ? {
          create: {
            email: email,
            isPrimary: true,
          },
        } : undefined,
        // Create tag relations
        recordTags: tagIds && tagIds.length > 0 ? {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        } : undefined,
        // Create motivation relations
        recordMotivations: motivationIds && motivationIds.length > 0 ? {
          create: motivationIds.map((motivationId: string) => ({
            motivationId,
          })),
        } : undefined,
      },
      include: {
        status: true,
        assignedTo: true,
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
        phoneNumbers: true,
        emails: true,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    );
  }
}
