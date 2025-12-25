import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';

// GET /api/records/[id] - Get a single record with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const record = await prisma.record.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
      include: {
        status: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        phoneNumbers: {
          orderBy: { createdAt: 'asc' },
        },
        emails: {
          orderBy: { createdAt: 'asc' },
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

// PUT /api/records/[id] - Update a record with activity logging
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

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
      phone,
      email,
      notes,
      description,
      temperature,
      estimatedValue,
      bedrooms,
      bathrooms,
      sqft,
      lotSize,
      structureType,
      heatingType,
      airConditioner,
      yearBuilt,
      callAttempts,
      directMailAttempts,
      smsAttempts,
      rvmAttempts,
      statusId,
      assignedToId,
      skiptraceDate,
      motivationIds,
      tagIds,
      addMotivationIds,
      removeMotivationIds,
      addTagIds,
      removeTagIds,
      source,
    } = body;

    // Check if record exists and belongs to team
    const existingRecord = await prisma.record.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
      include: {
        recordMotivations: true,
        recordTags: true,
      },
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

    // Build update data and track changes for activity log
    const updateData: Record<string, unknown> = {};
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

    const trackChange = (field: string, oldVal: unknown, newVal: unknown) => {
      if (oldVal !== newVal) {
        changes.push({
          field,
          oldValue: oldVal !== null && oldVal !== undefined ? String(oldVal) : null,
          newValue: newVal !== null && newVal !== undefined ? String(newVal) : null,
        });
      }
    };

    if (ownerFirstName !== undefined) {
      trackChange('ownerFirstName', existingRecord.ownerFirstName, ownerFirstName || null);
      updateData.ownerFirstName = ownerFirstName || null;
    }
    if (ownerLastName !== undefined) {
      trackChange('ownerLastName', existingRecord.ownerLastName, ownerLastName || null);
      updateData.ownerLastName = ownerLastName || null;
    }
    if (ownerFullName !== undefined) {
      trackChange('ownerFullName', existingRecord.ownerFullName, ownerFullName);
      updateData.ownerFullName = ownerFullName;
      updateData.isCompany = isCompany;
    }
    if (isCompanyOverride !== undefined) {
      trackChange('isCompanyOverride', existingRecord.isCompanyOverride, isCompanyOverride);
      updateData.isCompanyOverride = isCompanyOverride;
    }
    if (propertyStreet !== undefined) {
      trackChange('propertyStreet', existingRecord.propertyStreet, propertyStreet || null);
      updateData.propertyStreet = propertyStreet || null;
    }
    if (propertyCity !== undefined) {
      trackChange('propertyCity', existingRecord.propertyCity, propertyCity || null);
      updateData.propertyCity = propertyCity || null;
    }
    if (propertyState !== undefined) {
      trackChange('propertyState', existingRecord.propertyState, propertyState || null);
      updateData.propertyState = propertyState || null;
    }
    if (propertyZip !== undefined) {
      trackChange('propertyZip', existingRecord.propertyZip, propertyZip || null);
      updateData.propertyZip = propertyZip || null;
    }
    if (mailingStreet !== undefined) {
      trackChange('mailingStreet', existingRecord.mailingStreet, mailingStreet || null);
      updateData.mailingStreet = mailingStreet || null;
    }
    if (mailingCity !== undefined) {
      trackChange('mailingCity', existingRecord.mailingCity, mailingCity || null);
      updateData.mailingCity = mailingCity || null;
    }
    if (mailingState !== undefined) {
      trackChange('mailingState', existingRecord.mailingState, mailingState || null);
      updateData.mailingState = mailingState || null;
    }
    if (mailingZip !== undefined) {
      trackChange('mailingZip', existingRecord.mailingZip, mailingZip || null);
      updateData.mailingZip = mailingZip || null;
    }
    if (phone !== undefined) {
      trackChange('phone', existingRecord.phone, phone || null);
      updateData.phone = phone || null;
    }
    if (email !== undefined) {
      trackChange('email', existingRecord.email, email || null);
      updateData.email = email || null;
    }
    if (notes !== undefined) {
      trackChange('notes', existingRecord.notes, notes || null);
      updateData.notes = notes || null;
    }
    if (description !== undefined) {
      trackChange('description', existingRecord.description, description || null);
      updateData.description = description || null;
    }
    if (temperature !== undefined) {
      trackChange('temperature', existingRecord.temperature, temperature || null);
      updateData.temperature = temperature || null;
    }
    if (estimatedValue !== undefined) {
      trackChange('estimatedValue', existingRecord.estimatedValue?.toString(), estimatedValue?.toString() || null);
      updateData.estimatedValue = estimatedValue || null;
    }
    if (bedrooms !== undefined) {
      trackChange('bedrooms', existingRecord.bedrooms, bedrooms);
      updateData.bedrooms = bedrooms;
    }
    if (bathrooms !== undefined) {
      trackChange('bathrooms', existingRecord.bathrooms?.toString(), bathrooms?.toString() || null);
      updateData.bathrooms = bathrooms;
    }
    if (sqft !== undefined) {
      trackChange('sqft', existingRecord.sqft, sqft);
      updateData.sqft = sqft;
    }
    if (lotSize !== undefined) {
      trackChange('lotSize', existingRecord.lotSize?.toString(), lotSize?.toString() || null);
      updateData.lotSize = lotSize;
    }
    if (structureType !== undefined) {
      trackChange('structureType', existingRecord.structureType, structureType || null);
      updateData.structureType = structureType || null;
    }
    if (heatingType !== undefined) {
      trackChange('heatingType', existingRecord.heatingType, heatingType || null);
      updateData.heatingType = heatingType || null;
    }
    if (airConditioner !== undefined) {
      trackChange('airConditioner', existingRecord.airConditioner, airConditioner || null);
      updateData.airConditioner = airConditioner || null;
    }
    if (yearBuilt !== undefined) {
      trackChange('yearBuilt', existingRecord.yearBuilt, yearBuilt);
      updateData.yearBuilt = yearBuilt;
    }
    if (callAttempts !== undefined) {
      trackChange('callAttempts', existingRecord.callAttempts, callAttempts);
      updateData.callAttempts = callAttempts;
    }
    if (directMailAttempts !== undefined) {
      trackChange('directMailAttempts', existingRecord.directMailAttempts, directMailAttempts);
      updateData.directMailAttempts = directMailAttempts;
    }
    if (smsAttempts !== undefined) {
      trackChange('smsAttempts', existingRecord.smsAttempts, smsAttempts);
      updateData.smsAttempts = smsAttempts;
    }
    if (rvmAttempts !== undefined) {
      trackChange('rvmAttempts', existingRecord.rvmAttempts, rvmAttempts);
      updateData.rvmAttempts = rvmAttempts;
    }
    if (statusId !== undefined) {
      trackChange('statusId', existingRecord.statusId, statusId || null);
      updateData.statusId = statusId || null;
    }
    if (assignedToId !== undefined) {
      trackChange('assignedToId', existingRecord.assignedToId, assignedToId || null);
      updateData.assignedToId = assignedToId || null;
    }
    if (skiptraceDate !== undefined) {
      trackChange('skiptraceDate', existingRecord.skiptraceDate?.toISOString(), skiptraceDate || null);
      updateData.skiptraceDate = skiptraceDate ? new Date(skiptraceDate) : null;
    }

    // Calculate completeness with merged data
    const mergedData = {
      ...existingRecord,
      ...updateData,
    };
    updateData.isComplete = isRecordComplete({
      ownerFirstName: mergedData.ownerFirstName as string | null,
      ownerLastName: mergedData.ownerLastName as string | null,
      ownerFullName: mergedData.ownerFullName as string | null,
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        phoneNumbers: {
          orderBy: { createdAt: 'asc' },
        },
        emails: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Handle motivation updates (full replace)
    if (motivationIds !== undefined) {
      const currentMotivationIds = existingRecord.recordMotivations.map(rm => rm.motivationId);
      const toAdd = motivationIds.filter((id: string) => !currentMotivationIds.includes(id));
      const toRemove = currentMotivationIds.filter(id => !motivationIds.includes(id));

      if (toRemove.length > 0) {
        await prisma.recordMotivation.deleteMany({
          where: {
            recordId: params.id,
            motivationId: { in: toRemove },
          },
        });
      }

      if (toAdd.length > 0) {
        await prisma.recordMotivation.createMany({
          data: toAdd.map((motivationId: string) => ({
            recordId: params.id,
            motivationId,
          })),
        });
      }

      if (toAdd.length > 0 || toRemove.length > 0) {
        changes.push({
          field: 'motivations',
          oldValue: currentMotivationIds.join(','),
          newValue: motivationIds.join(','),
        });
      }
    }

    // Handle incremental motivation add
    if (addMotivationIds !== undefined && Array.isArray(addMotivationIds) && addMotivationIds.length > 0) {
      const currentMotivationIds = existingRecord.recordMotivations.map(rm => rm.motivationId);
      const toAdd = addMotivationIds.filter((id: string) => !currentMotivationIds.includes(id));
      
      if (toAdd.length > 0) {
        await prisma.recordMotivation.createMany({
          data: toAdd.map((motivationId: string) => ({
            recordId: params.id,
            motivationId,
          })),
        });
        changes.push({
          field: 'motivations',
          oldValue: null,
          newValue: `Added: ${toAdd.join(',')}`,
        });
      }
    }

    // Handle incremental motivation remove
    if (removeMotivationIds !== undefined && Array.isArray(removeMotivationIds) && removeMotivationIds.length > 0) {
      await prisma.recordMotivation.deleteMany({
        where: {
          recordId: params.id,
          motivationId: { in: removeMotivationIds },
        },
      });
      changes.push({
        field: 'motivations',
        oldValue: `Removed: ${removeMotivationIds.join(',')}`,
        newValue: null,
      });
    }

    // Handle tag updates (full replace)
    if (tagIds !== undefined) {
      const currentTagIds = existingRecord.recordTags.map(rt => rt.tagId);
      const toAdd = tagIds.filter((id: string) => !currentTagIds.includes(id));
      const toRemove = currentTagIds.filter(id => !tagIds.includes(id));

      if (toRemove.length > 0) {
        await prisma.recordTag.deleteMany({
          where: {
            recordId: params.id,
            tagId: { in: toRemove },
          },
        });
      }

      if (toAdd.length > 0) {
        await prisma.recordTag.createMany({
          data: toAdd.map((tagId: string) => ({
            recordId: params.id,
            tagId,
          })),
        });
      }

      if (toAdd.length > 0 || toRemove.length > 0) {
        changes.push({
          field: 'tags',
          oldValue: currentTagIds.join(','),
          newValue: tagIds.join(','),
        });
      }
    }

    // Handle incremental tag add
    if (addTagIds !== undefined && Array.isArray(addTagIds) && addTagIds.length > 0) {
      const currentTagIds = existingRecord.recordTags.map(rt => rt.tagId);
      const toAdd = addTagIds.filter((id: string) => !currentTagIds.includes(id));
      
      if (toAdd.length > 0) {
        await prisma.recordTag.createMany({
          data: toAdd.map((tagId: string) => ({
            recordId: params.id,
            tagId,
          })),
        });
        changes.push({
          field: 'tags',
          oldValue: null,
          newValue: `Added: ${toAdd.join(',')}`,
        });
      }
    }

    // Handle incremental tag remove
    if (removeTagIds !== undefined && Array.isArray(removeTagIds) && removeTagIds.length > 0) {
      await prisma.recordTag.deleteMany({
        where: {
          recordId: params.id,
          tagId: { in: removeTagIds },
        },
      });
      changes.push({
        field: 'tags',
        oldValue: `Removed: ${removeTagIds.join(',')}`,
        newValue: null,
      });
    }

    // Log activity for each change
    if (changes.length > 0) {
      await prisma.recordActivityLog.createMany({
        data: changes.map(change => ({
          recordId: params.id,
          action: 'updated',
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          source: source || 'Property Details Page',
        })),
      });
      
      // Also create system log for individual record update
      const fieldNames = changes.map(c => c.field).join(', ');
      const propertyAddress = existingRecord.propertyStreet || existingRecord.ownerFullName || 'Unknown';
      await prisma.activityLog.create({
        data: {
          type: 'action',
          action: 'record_update',
          description: `User updated ${fieldNames} on "${propertyAddress}"`,
          total: 1,
          processed: 1,
          status: 'completed',
        },
      });
    }

    // Refetch record with updated relations
    const updatedRecord = await prisma.record.findUnique({
      where: { id: params.id },
      include: {
        status: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        phoneNumbers: {
          orderBy: { createdAt: 'asc' },
        },
        emails: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(updatedRecord);
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

    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Check if record exists and belongs to team
    const existingRecord = await prisma.record.findFirst({
      where: { id: params.id, createdById: authUser.ownerId },
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
