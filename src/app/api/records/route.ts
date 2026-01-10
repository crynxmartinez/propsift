import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';
import { verifyToken } from '@/lib/auth';
import { getAuthUser, canViewAllData } from '@/lib/roles';
import { findMatchingAutomations, executeAutomation } from '@/lib/automation/engine';

// Filter block interface
interface FilterBlock {
  id: string;
  field: string;
  fieldLabel: string;
  fieldType: string;
  operator: string;
  value: string | string[] | number | boolean | null;
  connector: 'AND' | 'OR';
}

// Excluded statuses for "not workable" bucket
const EXCLUDED_STATUSES = ['dead', 'dnc', 'do not call', 'under contract', 'sold', 'not interested', 'wrong number', 'closed'];

// Build bucket filter condition (maps bucket to complex Prisma query)
function buildBucketFilterCondition(bucket: string): Record<string, unknown> | null {
  switch (bucket) {
    case 'call-now':
      // High priority, has phone, not excluded status
      return {
        AND: [
          { priorityScore: { gte: 70 } },
          { phoneNumbers: { some: {} } },
          {
            OR: [
              { status: null },
              { status: { name: { notIn: EXCLUDED_STATUSES, mode: 'insensitive' } } }
            ]
          }
        ]
      };
    
    case 'follow-up-today':
      // Has tasks due today or callbacks scheduled today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        OR: [
          { tasks: { some: { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { gte: today, lt: tomorrow } } } },
          { callbackScheduledFor: { gte: today, lt: tomorrow } }
        ]
      };
    
    case 'call-queue':
      // Medium priority (50-69), has phone, not excluded
      return {
        AND: [
          { priorityScore: { gte: 50, lt: 70 } },
          { phoneNumbers: { some: {} } },
          {
            OR: [
              { status: null },
              { status: { name: { notIn: EXCLUDED_STATUSES, mode: 'insensitive' } } }
            ]
          }
        ]
      };
    
    case 'verify-first':
      // Low confidence or incomplete data
      return {
        OR: [
          { confidenceLevel: 'LOW' },
          { isComplete: false }
        ]
      };
    
    case 'get-numbers':
      // No valid phone numbers, not excluded
      return {
        AND: [
          { phoneNumbers: { none: {} } },
          {
            OR: [
              { status: null },
              { status: { name: { notIn: EXCLUDED_STATUSES, mode: 'insensitive' } } }
            ]
          }
        ]
      };
    
    case 'nurture':
      // Low priority (< 50), not excluded
      return {
        AND: [
          { OR: [{ priorityScore: { lt: 50 } }, { priorityScore: null }] },
          {
            OR: [
              { status: null },
              { status: { name: { notIn: EXCLUDED_STATUSES, mode: 'insensitive' } } }
            ]
          }
        ]
      };
    
    case 'not-workable':
      // Excluded statuses (DNC, Dead, Closed, etc.)
      return {
        status: { name: { in: EXCLUDED_STATUSES, mode: 'insensitive' } }
      };
    
    default:
      return null;
  }
}

// Build Prisma where clause from filter blocks
function buildFilterWhereClause(filters: FilterBlock[]): Record<string, unknown> {
  if (filters.length === 0) return {};

  const conditions: Record<string, unknown>[] = [];

  for (const filter of filters) {
    const condition = buildSingleFilterCondition(filter);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) return {};

  // For now, use AND logic between all filters
  // TODO: Implement proper AND/OR grouping
  return { AND: conditions };
}

function buildSingleFilterCondition(filter: FilterBlock): Record<string, unknown> | null {
  const { field, operator, value } = filter;

  // Handle bucket filter (special LCE filter that maps to complex logic)
  if (field === 'bucket' && typeof value === 'string') {
    return buildBucketFilterCondition(value);
  }

  // Handle empty operators
  if (operator === 'is_empty') {
    if (field === 'tags') return { recordTags: { none: {} } };
    if (field === 'motivations') return { recordMotivations: { none: {} } };
    if (field === 'status') return { statusId: null };
    if (field === 'assignedTo') return { assignedToId: null };
    if (field === 'callResult') return { callResultId: null };
    return { [field]: null };
  }

  if (operator === 'is_not_empty') {
    if (field === 'tags') return { recordTags: { some: {} } };
    if (field === 'motivations') return { recordMotivations: { some: {} } };
    if (field === 'status') return { statusId: { not: null } };
    if (field === 'assignedTo') return { assignedToId: { not: null } };
    if (field === 'callResult') return { callResultId: { not: null } };
    return { [field]: { not: null } };
  }

  // Handle select fields (single value)
  if (filter.fieldType === 'select' && typeof value === 'string' && value) {
    // Map field names to database columns where needed
    const fieldMapping: Record<string, string> = {
      callResult: 'callResultId',
    };
    const dbField = fieldMapping[field] || field;
    
    switch (operator) {
      case 'is':
        return { [dbField]: value };
      case 'is_not':
        return { [dbField]: { not: value } };
    }
  }

  // Handle multiselect fields (tags, motivations, status)
  if (field === 'tags' && Array.isArray(value) && value.length > 0) {
    if (operator === 'contains_any') {
      return { recordTags: { some: { tagId: { in: value } } } };
    }
    if (operator === 'contains_all') {
      return { AND: value.map(tagId => ({ recordTags: { some: { tagId } } })) };
    }
    if (operator === 'not_contains') {
      return { recordTags: { none: { tagId: { in: value } } } };
    }
  }

  if (field === 'motivations' && Array.isArray(value) && value.length > 0) {
    if (operator === 'contains_any') {
      return { recordMotivations: { some: { motivationId: { in: value } } } };
    }
    if (operator === 'contains_all') {
      return { AND: value.map(motivationId => ({ recordMotivations: { some: { motivationId } } })) };
    }
    if (operator === 'not_contains') {
      return { recordMotivations: { none: { motivationId: { in: value } } } };
    }
  }

  if (field === 'status' && Array.isArray(value) && value.length > 0) {
    if (operator === 'contains_any' || operator === 'is') {
      return { statusId: { in: value } };
    }
    if (operator === 'not_contains' || operator === 'is_not') {
      return { statusId: { notIn: value } };
    }
  }

  // Handle user fields
  if (field === 'assignedTo' || field === 'taskAssignedTo') {
    const dbField = field === 'assignedTo' ? 'assignedToId' : 'tasks';
    if (operator === 'is_me') {
      // TODO: Get current user ID from session
      return {};
    }
    if (Array.isArray(value) && value.length > 0) {
      if (operator === 'is' || operator === 'is_any_of') {
        return { [dbField]: { in: value } };
      }
      if (operator === 'is_not') {
        return { [dbField]: { notIn: value } };
      }
    }
  }

  // Handle text fields
  if (filter.fieldType === 'text' && typeof value === 'string' && value) {
    switch (operator) {
      case 'is':
        return { [field]: value };
      case 'is_not':
        return { [field]: { not: value } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'not_contains':
        return { NOT: { [field]: { contains: value, mode: 'insensitive' } } };
      case 'starts_with':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'ends_with':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
    }
  }

  // Handle number fields
  if (filter.fieldType === 'number' && typeof value === 'number') {
    switch (operator) {
      case 'eq':
        return { [field]: value };
      case 'neq':
        return { [field]: { not: value } };
      case 'gt':
        return { [field]: { gt: value } };
      case 'gte':
        return { [field]: { gte: value } };
      case 'lt':
        return { [field]: { lt: value } };
      case 'lte':
        return { [field]: { lte: value } };
    }
  }

  // Handle date fields
  if (filter.fieldType === 'date' && value) {
    if (operator === 'in_last' && typeof value === 'number') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - value);
      return { [field]: { gte: daysAgo } };
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      switch (operator) {
        case 'is':
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          return { [field]: { gte: date, lt: nextDay } };
        case 'is_before':
          return { [field]: { lt: date } };
        case 'is_after':
          return { [field]: { gt: date } };
      }
    }
  }

  // Handle boolean fields
  if (filter.fieldType === 'boolean') {
    const boolValue = operator === 'is_true' ? true : operator === 'is_false' ? false : value === true;
    
    if (field === 'isComplete') {
      return { isComplete: boolValue };
    }
    if (field === 'isCompany') {
      return { isCompany: boolValue };
    }
    if (field === 'hasPhone') {
      return boolValue 
        ? { phoneNumbers: { some: {} } }
        : { phoneNumbers: { none: {} } };
    }
    if (field === 'hasEmail') {
      return boolValue
        ? { emails: { some: {} } }
        : { emails: { none: {} } };
    }
    if (field === 'hasOpenTasks') {
      return boolValue
        ? { tasks: { some: { status: { in: ['PENDING', 'IN_PROGRESS'] } } } }
        : { tasks: { none: { status: { in: ['PENDING', 'IN_PROGRESS'] } } } };
    }
    if (field === 'hasOverdueTasks') {
      const now = new Date();
      return boolValue
        ? { tasks: { some: { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } } } }
        : { NOT: { tasks: { some: { status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } } } } };
    }
    if (field === 'hasEngaged') {
      return { hasEngaged: boolValue };
    }
  }

  return null;
}

// GET /api/records - List records with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user with role info
    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || 'all'; // all, complete, incomplete
    const filtersParam = searchParams.get('filters');
    const search = searchParams.get('search') || '';
    const searchType = searchParams.get('searchType') || 'all';

    // Validate limit
    const validLimits = [10, 20, 50, 100];
    const safeLimit = validLimits.includes(limit) ? limit : 10;
    const skip = (page - 1) * safeLimit;

    // Build where clause based on completion filter and user role
    // Use ownerId for team data sharing (all team members see same data)
    // Also include legacy records with null createdById
    let whereClause: Record<string, unknown> = {
      OR: [
        { createdById: authUser.ownerId },
        { createdById: { equals: null } }
      ]
    };

    // Members can only see records assigned to them
    if (!canViewAllData(authUser.role)) {
      whereClause = {
        ...whereClause,
        assignedToId: authUser.id, // Only show records assigned to this member
      };
    }

    if (filter === 'complete') {
      whereClause = { ...whereClause, isComplete: true };
    } else if (filter === 'incomplete') {
      whereClause = { ...whereClause, isComplete: false };
    }

    // Apply search filter - use AND to combine with existing OR clause
    if (search && search.length >= 2) {
      let searchConditions: Record<string, unknown>[] = [];
      
      if (searchType === 'name' || searchType === 'all') {
        searchConditions.push(
          { ownerFullName: { contains: search, mode: 'insensitive' } },
          { ownerFirstName: { contains: search, mode: 'insensitive' } },
          { ownerLastName: { contains: search, mode: 'insensitive' } }
        );
      }
      
      if (searchType === 'property' || searchType === 'all') {
        searchConditions.push(
          { propertyStreet: { contains: search, mode: 'insensitive' } },
          { propertyCity: { contains: search, mode: 'insensitive' } },
          { propertyState: { contains: search, mode: 'insensitive' } },
          { propertyZip: { contains: search, mode: 'insensitive' } }
        );
      }
      
      if (searchType === 'mailing' || searchType === 'all') {
        searchConditions.push(
          { mailingStreet: { contains: search, mode: 'insensitive' } },
          { mailingCity: { contains: search, mode: 'insensitive' } },
          { mailingState: { contains: search, mode: 'insensitive' } },
          { mailingZip: { contains: search, mode: 'insensitive' } }
        );
      }
      
      // Also search phone/email for 'all' type
      if (searchType === 'all') {
        searchConditions.push(
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        );
      }
      
      const searchCondition = { OR: searchConditions };
      whereClause = {
        AND: [
          whereClause,
          searchCondition
        ]
      };
    }

    // Parse and apply advanced filters
    if (filtersParam) {
      try {
        const filterBlocks: FilterBlock[] = JSON.parse(filtersParam);
        const advancedWhere = buildFilterWhereClause(filterBlocks);
        whereClause = { ...whereClause, ...advancedWhere };
      } catch (e) {
        console.error('Error parsing filters:', e);
      }
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

    // Calculate counts for each filter (based on same where clause logic)
    const baseWhere = canViewAllData(authUser.role) 
      ? { createdById: authUser.ownerId }
      : { createdById: authUser.ownerId, assignedToId: authUser.id };
    const completeCount = await prisma.record.count({ where: { ...baseWhere, isComplete: true } });
    const incompleteCount = await prisma.record.count({ where: { ...baseWhere, isComplete: false } });
    const allCount = await prisma.record.count({ where: baseWhere });

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
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user with role info
    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

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
      skiptraceDate,
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
      ownerFullName: ownerFullName || null,
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
        createdById: authUser.ownerId, // Use ownerId for team data sharing
        isComplete,
        skiptraceDate: skiptraceDate ? new Date(skiptraceDate) : null,
        // Create phone number entry if provided
        phoneNumbers: phone ? {
          create: {
            number: phone,
            type: 'MOBILE',
            statuses: [],
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

    // Trigger record_created automations (async, don't block response)
    findMatchingAutomations('record_created', authUser.ownerId).then(automations => {
      for (const automation of automations) {
        executeAutomation(automation.id, record.id, 'record_created').catch(err => {
          console.error(`Error executing automation ${automation.id}:`, err);
        });
      }
    }).catch(err => console.error('Error finding automations:', err));

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json(
      { error: 'Failed to create record' },
      { status: 500 }
    );
  }
}
