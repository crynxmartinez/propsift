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
      propertyStreet,
      propertyCity,
      propertyState,
      propertyZip,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      statusId,
    } = body;

    // Validate required field
    if (!ownerFullName) {
      return NextResponse.json(
        { error: 'Owner full name is required' },
        { status: 400 }
      );
    }

    // Auto-detect if company
    const isCompany = detectCompany(ownerFullName);

    // Build record data
    const recordData = {
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
      statusId: statusId || null,
      isComplete: false, // Will be calculated below
    };

    // Calculate completeness
    recordData.isComplete = isRecordComplete(recordData);

    // Create record
    const record = await prisma.record.create({
      data: recordData,
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

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    );
  }
}
