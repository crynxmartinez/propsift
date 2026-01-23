import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';
import { findMatchingAutomations, executeAutomation } from '@/lib/automation/engine';

interface ImportRequest {
  activityId?: string;
  importType: 'add' | 'update';
  importOption: 'new_motivation' | 'existing_motivation' | 'property_address' | 'mailing_address';
  motivationIds: string[];
  tagIds: string[];
  fieldMapping: Record<string, string>; // systemField -> csvColumn
  csvHeaders: string[];
  csvData: string[][];
}

// POST /api/records/bulk-import - Import records from CSV
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

    // Get user with role info for team data sharing
    const authUser = await getAuthUser(decoded.userId);
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const body: ImportRequest = await request.json();
    const { activityId, importType, importOption, motivationIds, tagIds, fieldMapping, csvHeaders, csvData } = body;

    // Update activity status to processing if activityId provided
    if (activityId) {
      await prisma.activityLog.update({
        where: { id: activityId },
        data: { status: 'processing' },
      });
    }

    if (!csvData || csvData.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
    }

    // Check monthly import limit (10,000 records/month)
    const MONTHLY_IMPORT_LIMIT = 10000;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get all team member IDs for this team (owner + members with this accountOwnerId)
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { id: authUser.ownerId },
          { accountOwnerId: authUser.ownerId },
        ],
      },
      select: { id: true },
    });
    const teamMemberIds = teamMembers.map(m => m.id);

    // Count records imported this month by this team
    const monthlyImports = await prisma.activityLog.aggregate({
      where: {
        action: 'bulk_import',
        status: 'completed',
        createdAt: { gte: startOfMonth },
        userId: { in: teamMemberIds },
      },
      _sum: { processed: true },
    });

    const importedThisMonth = monthlyImports._sum?.processed || 0;
    const remainingQuota = MONTHLY_IMPORT_LIMIT - importedThisMonth;

    if (remainingQuota <= 0) {
      return NextResponse.json({ 
        error: 'Monthly import limit reached',
        message: `You have reached your monthly limit of ${MONTHLY_IMPORT_LIMIT.toLocaleString()} records. Your limit resets on the 1st of next month.`,
        importedThisMonth,
        limit: MONTHLY_IMPORT_LIMIT,
      }, { status: 429 });
    }

    // Check if this import would exceed the limit
    if (csvData.length > remainingQuota) {
      return NextResponse.json({ 
        error: 'Import would exceed monthly limit',
        message: `This import contains ${csvData.length.toLocaleString()} records, but you only have ${remainingQuota.toLocaleString()} records remaining in your monthly quota.`,
        importedThisMonth,
        remainingQuota,
        limit: MONTHLY_IMPORT_LIMIT,
        requestedRecords: csvData.length,
      }, { status: 429 });
    }

    // Get column indices from mapping
    const getColumnIndex = (systemField: string): number => {
      const csvColumn = fieldMapping[systemField];
      if (!csvColumn) return -1;
      return csvHeaders.indexOf(csvColumn);
    };

    // Get value from row
    const getValue = (row: string[], systemField: string): string | null => {
      const index = getColumnIndex(systemField);
      if (index === -1) return null;
      const value = row[index]?.trim();
      return value || null;
    };

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: { row: number; reason: string }[] = [];

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        // Extract data from row
        const propertyStreet = getValue(row, 'propertyStreet');
        const propertyCity = getValue(row, 'propertyCity');
        const propertyState = getValue(row, 'propertyState');
        const propertyZip = getValue(row, 'propertyZip');
        const mailingStreet = getValue(row, 'mailingStreet');
        const mailingCity = getValue(row, 'mailingCity');
        const mailingState = getValue(row, 'mailingState');
        const mailingZip = getValue(row, 'mailingZip');
        const ownerFirstName = getValue(row, 'ownerFirstName');
        const ownerLastName = getValue(row, 'ownerLastName');
        const ownerFullName = getValue(row, 'ownerFullName') || 
          [ownerFirstName, ownerLastName].filter(Boolean).join(' ') || 
          'Unknown Owner';
        
        // Extract phones (max 15)
        const phones: string[] = [];
        for (let p = 1; p <= 15; p++) {
          const phone = getValue(row, `phone${p}`);
          if (phone) phones.push(phone);
        }
        
        // Extract emails (max 5)
        const emails: string[] = [];
        for (let e = 1; e <= 5; e++) {
          const email = getValue(row, `email${e}`);
          if (email) emails.push(email);
        }

        // Extract attempts
        const callAttempts = parseInt(getValue(row, 'callAttempts') || '0', 10) || 0;
        const directMailAttempts = parseInt(getValue(row, 'directMailAttempts') || '0', 10) || 0;
        const smsAttempts = parseInt(getValue(row, 'smsAttempts') || '0', 10) || 0;
        const rvmAttempts = parseInt(getValue(row, 'rvmAttempts') || '0', 10) || 0;

        // Extract property details
        const estimatedValue = parseFloat(getValue(row, 'estimatedValue') || '') || null;
        const bedrooms = parseInt(getValue(row, 'bedrooms') || '', 10) || null;
        const bathrooms = parseFloat(getValue(row, 'bathrooms') || '') || null;
        const sqft = parseInt(getValue(row, 'sqft') || '', 10) || null;
        const lotSize = parseFloat(getValue(row, 'lotSize') || '') || null;
        const yearBuilt = parseInt(getValue(row, 'yearBuilt') || '', 10) || null;
        const structureType = getValue(row, 'structureType') || null;
        const heatingType = getValue(row, 'heatingType') || null;
        const airConditioner = getValue(row, 'airConditioner') || null;

        // Extract other fields
        const notes = getValue(row, 'notes') || null;
        const description = getValue(row, 'description') || null;
        const temperature = getValue(row, 'temperature') || null;
        
        // Parse skiptraceDate (v2.3)
        const skiptraceDateStr = getValue(row, 'skiptraceDate');
        let skiptraceDate: Date | null = null;
        if (skiptraceDateStr) {
          const parsed = new Date(skiptraceDateStr);
          if (!isNaN(parsed.getTime())) {
            skiptraceDate = parsed;
          }
        }

        // Extract custom fields
        const customFieldValues: Record<string, string> = {};
        Object.keys(fieldMapping).forEach(key => {
          if (key.startsWith('custom_')) {
            const fieldId = key.replace('custom_', '');
            const value = getValue(row, key);
            if (value) {
              customFieldValues[fieldId] = value;
            }
          }
        });

        // Validate required fields based on import option
        if (importType === 'update' && importOption === 'mailing_address') {
          if (!mailingStreet || !mailingCity || !mailingState || !mailingZip) {
            errors++;
            errorDetails.push({ row: i + 2, reason: 'Missing required mailing address fields' });
            continue;
          }
        } else {
          if (!propertyStreet || !propertyCity || !propertyState || !propertyZip) {
            errors++;
            errorDetails.push({ row: i + 2, reason: 'Missing required property address fields' });
            continue;
          }
        }

        // Detect if company
        const isCompany = detectCompany(ownerFullName);

        // Build record data for completeness check
        const recordDataForCheck = {
          ownerFirstName,
          ownerLastName,
          ownerFullName,
          isCompany,
          isCompanyOverride: null,
          propertyStreet,
          propertyCity,
          propertyState,
          propertyZip,
          mailingStreet,
          mailingCity,
          mailingState,
          mailingZip,
        };

        const isComplete = isRecordComplete(recordDataForCheck);

        if (importType === 'add') {
          // ADD MODE: Create new or overwrite existing
          
          // Check for existing record by property address (within team)
          const existingRecord = await prisma.record.findFirst({
            where: {
              createdById: authUser.ownerId,
              propertyStreet: { equals: propertyStreet, mode: 'insensitive' },
              propertyCity: { equals: propertyCity, mode: 'insensitive' },
              propertyState: { equals: propertyState, mode: 'insensitive' },
              propertyZip: propertyZip,
            },
          });

          if (existingRecord) {
            // Overwrite existing record with non-empty fields, append notes
            const appendedNotes = notes 
              ? (existingRecord.notes ? `${existingRecord.notes}\n${notes}` : notes)
              : existingRecord.notes;
            
            await prisma.record.update({
              where: { id: existingRecord.id },
              data: {
                ownerFirstName: ownerFirstName || existingRecord.ownerFirstName,
                ownerLastName: ownerLastName || existingRecord.ownerLastName,
                ownerFullName: ownerFullName || existingRecord.ownerFullName,
                isCompany,
                propertyStreet: propertyStreet || existingRecord.propertyStreet,
                propertyCity: propertyCity || existingRecord.propertyCity,
                propertyState: propertyState || existingRecord.propertyState,
                propertyZip: propertyZip || existingRecord.propertyZip,
                mailingStreet: mailingStreet || existingRecord.mailingStreet,
                mailingCity: mailingCity || existingRecord.mailingCity,
                mailingState: mailingState || existingRecord.mailingState,
                mailingZip: mailingZip || existingRecord.mailingZip,
                callAttempts: callAttempts > 0 ? callAttempts : existingRecord.callAttempts,
                directMailAttempts: directMailAttempts > 0 ? directMailAttempts : existingRecord.directMailAttempts,
                smsAttempts: smsAttempts > 0 ? smsAttempts : existingRecord.smsAttempts,
                rvmAttempts: rvmAttempts > 0 ? rvmAttempts : existingRecord.rvmAttempts,
                estimatedValue: estimatedValue ?? existingRecord.estimatedValue,
                bedrooms: bedrooms ?? existingRecord.bedrooms,
                bathrooms: bathrooms ?? existingRecord.bathrooms,
                sqft: sqft ?? existingRecord.sqft,
                lotSize: lotSize ?? existingRecord.lotSize,
                yearBuilt: yearBuilt ?? existingRecord.yearBuilt,
                structureType: structureType || existingRecord.structureType,
                heatingType: heatingType || existingRecord.heatingType,
                airConditioner: airConditioner || existingRecord.airConditioner,
                notes: appendedNotes,
                description: description || existingRecord.description,
                temperature: temperature || existingRecord.temperature,
                skiptraceDate: skiptraceDate || existingRecord.skiptraceDate,
                isComplete,
              },
            });

            // Batch append phones, emails, motivations, tags, custom fields using createMany with skipDuplicates
            await Promise.all([
              // Append phones (skipDuplicates handles existing)
              phones.length > 0 ? prisma.recordPhoneNumber.createMany({
                data: phones.map(phone => ({ recordId: existingRecord.id, number: phone })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Append emails
              emails.length > 0 ? prisma.recordEmail.createMany({
                data: emails.map(email => ({ recordId: existingRecord.id, email })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Append motivations
              motivationIds.length > 0 ? prisma.recordMotivation.createMany({
                data: motivationIds.map(motivationId => ({ recordId: existingRecord.id, motivationId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Append tags
              tagIds.length > 0 ? prisma.recordTag.createMany({
                data: tagIds.map(tagId => ({ recordId: existingRecord.id, tagId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add/update custom fields (use createMany, duplicates will be skipped)
              Object.keys(customFieldValues).length > 0 ? prisma.customFieldValue.createMany({
                data: Object.entries(customFieldValues).map(([fieldId, value]) => ({ 
                  recordId: existingRecord.id, fieldId, value 
                })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Log record update
              prisma.recordActivityLog.create({
                data: {
                  recordId: existingRecord.id,
                  action: 'updated',
                  field: 'record',
                  newValue: 'Bulk import update',
                  source: 'Bulk Import',
                },
              }),
            ]);

            updated++;
          } else {
            // Create new record
            const newRecord = await prisma.record.create({
              data: {
                createdById: authUser.ownerId,
                ownerFirstName,
                ownerLastName,
                ownerFullName,
                isCompany,
                propertyStreet,
                propertyCity,
                propertyState,
                propertyZip,
                mailingStreet,
                mailingCity,
                mailingState,
                mailingZip,
                callAttempts,
                directMailAttempts,
                smsAttempts,
                rvmAttempts,
                estimatedValue,
                bedrooms,
                bathrooms,
                sqft,
                lotSize,
                yearBuilt,
                structureType,
                heatingType,
                airConditioner,
                notes,
                description,
                temperature,
                skiptraceDate,
                isComplete,
              },
            });

            // Batch create phones, emails, motivations, tags, custom fields, and activity log
            await Promise.all([
              // Add phones (max 15)
              phones.length > 0 ? prisma.recordPhoneNumber.createMany({
                data: phones.map(phone => ({ recordId: newRecord.id, number: phone })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add emails (max 5)
              emails.length > 0 ? prisma.recordEmail.createMany({
                data: emails.map(email => ({ recordId: newRecord.id, email })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add motivations
              motivationIds.length > 0 ? prisma.recordMotivation.createMany({
                data: motivationIds.map(motivationId => ({ recordId: newRecord.id, motivationId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add tags
              tagIds.length > 0 ? prisma.recordTag.createMany({
                data: tagIds.map(tagId => ({ recordId: newRecord.id, tagId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add custom fields
              Object.keys(customFieldValues).length > 0 ? prisma.customFieldValue.createMany({
                data: Object.entries(customFieldValues).map(([fieldId, value]) => ({ 
                  recordId: newRecord.id, fieldId, value 
                })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Log record creation
              prisma.recordActivityLog.create({
                data: {
                  recordId: newRecord.id,
                  action: 'created',
                  field: 'record',
                  newValue: 'Created via bulk import',
                  source: 'Bulk Import',
                },
              }),
            ]);

            // Trigger record_created automations (async)
            findMatchingAutomations('record_created', authUser.ownerId).then(automations => {
              for (const automation of automations) {
                executeAutomation(automation.id, newRecord.id, 'record_created').catch(err => {
                  console.error(`Error executing automation ${automation.id}:`, err);
                });
              }
            }).catch(err => console.error('Error finding automations:', err));

            added++;
          }
        } else {
          // UPDATE MODE: Only update existing records with non-empty fields
          
          let existingRecord;
          
          if (importOption === 'mailing_address') {
            // Find by mailing address (within team)
            existingRecord = await prisma.record.findFirst({
              where: {
                createdById: authUser.ownerId,
                mailingStreet: { equals: mailingStreet, mode: 'insensitive' },
                mailingCity: { equals: mailingCity, mode: 'insensitive' },
                mailingState: { equals: mailingState, mode: 'insensitive' },
                mailingZip: mailingZip,
              },
            });
          } else {
            // Find by property address (within team)
            existingRecord = await prisma.record.findFirst({
              where: {
                createdById: authUser.ownerId,
                propertyStreet: { equals: propertyStreet, mode: 'insensitive' },
                propertyCity: { equals: propertyCity, mode: 'insensitive' },
                propertyState: { equals: propertyState, mode: 'insensitive' },
                propertyZip: propertyZip,
              },
            });
          }

          if (!existingRecord) {
            skipped++;
            continue;
          }

          // Build update data with only non-empty fields
          const updateData: Record<string, unknown> = {};
          
          if (ownerFirstName) updateData.ownerFirstName = ownerFirstName;
          if (ownerLastName) updateData.ownerLastName = ownerLastName;
          if (ownerFullName && ownerFullName !== 'Unknown Owner') {
            updateData.ownerFullName = ownerFullName;
            updateData.isCompany = detectCompany(ownerFullName);
          }
          if (propertyStreet) updateData.propertyStreet = propertyStreet;
          if (propertyCity) updateData.propertyCity = propertyCity;
          if (propertyState) updateData.propertyState = propertyState;
          if (propertyZip) updateData.propertyZip = propertyZip;
          if (mailingStreet) updateData.mailingStreet = mailingStreet;
          if (mailingCity) updateData.mailingCity = mailingCity;
          if (mailingState) updateData.mailingState = mailingState;
          if (mailingZip) updateData.mailingZip = mailingZip;
          // Attempts (only update if > 0)
          if (callAttempts > 0) updateData.callAttempts = callAttempts;
          if (directMailAttempts > 0) updateData.directMailAttempts = directMailAttempts;
          if (smsAttempts > 0) updateData.smsAttempts = smsAttempts;
          if (rvmAttempts > 0) updateData.rvmAttempts = rvmAttempts;
          // Property details
          if (estimatedValue !== null) updateData.estimatedValue = estimatedValue;
          if (bedrooms !== null) updateData.bedrooms = bedrooms;
          if (bathrooms !== null) updateData.bathrooms = bathrooms;
          if (sqft !== null) updateData.sqft = sqft;
          if (lotSize !== null) updateData.lotSize = lotSize;
          if (yearBuilt !== null) updateData.yearBuilt = yearBuilt;
          if (structureType) updateData.structureType = structureType;
          if (heatingType) updateData.heatingType = heatingType;
          if (airConditioner) updateData.airConditioner = airConditioner;
          // Other fields - append notes instead of overwriting
          if (notes) {
            updateData.notes = existingRecord.notes 
              ? `${existingRecord.notes}\n${notes}` 
              : notes;
          }
          if (description) updateData.description = description;
          if (temperature) updateData.temperature = temperature;
          if (skiptraceDate) updateData.skiptraceDate = skiptraceDate;

          // Recalculate completeness with merged data
          const mergedData = {
            ownerFirstName: (updateData.ownerFirstName as string) || existingRecord.ownerFirstName,
            ownerLastName: (updateData.ownerLastName as string) || existingRecord.ownerLastName,
            ownerFullName: (updateData.ownerFullName as string) || existingRecord.ownerFullName,
            isCompany: (updateData.isCompany as boolean) ?? existingRecord.isCompany,
            isCompanyOverride: existingRecord.isCompanyOverride,
            propertyStreet: (updateData.propertyStreet as string) || existingRecord.propertyStreet,
            propertyCity: (updateData.propertyCity as string) || existingRecord.propertyCity,
            propertyState: (updateData.propertyState as string) || existingRecord.propertyState,
            propertyZip: (updateData.propertyZip as string) || existingRecord.propertyZip,
            mailingStreet: (updateData.mailingStreet as string) || existingRecord.mailingStreet,
            mailingCity: (updateData.mailingCity as string) || existingRecord.mailingCity,
            mailingState: (updateData.mailingState as string) || existingRecord.mailingState,
            mailingZip: (updateData.mailingZip as string) || existingRecord.mailingZip,
          };
          updateData.isComplete = isRecordComplete(mergedData);

          // Check if we have data to update (more than just isComplete) or phones/emails/custom fields to add
          const hasDataToUpdate = Object.keys(updateData).length > 1;
          const hasPhonesOrEmails = phones.length > 0 || emails.length > 0;
          const hasCustomFields = Object.keys(customFieldValues).length > 0;

          if (hasDataToUpdate || hasPhonesOrEmails || hasCustomFields) {
            if (hasDataToUpdate) {
              await prisma.record.update({
                where: { id: existingRecord.id },
                data: updateData,
              });
            }

            // Batch add phones, emails, motivations, tags, custom fields using createMany with skipDuplicates
            await Promise.all([
              // Add phones (skipDuplicates handles existing)
              phones.length > 0 ? prisma.recordPhoneNumber.createMany({
                data: phones.map(phone => ({ recordId: existingRecord.id, number: phone })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add emails
              emails.length > 0 ? prisma.recordEmail.createMany({
                data: emails.map(email => ({ recordId: existingRecord.id, email })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add motivations
              motivationIds.length > 0 ? prisma.recordMotivation.createMany({
                data: motivationIds.map(motivationId => ({ recordId: existingRecord.id, motivationId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add tags
              tagIds.length > 0 ? prisma.recordTag.createMany({
                data: tagIds.map(tagId => ({ recordId: existingRecord.id, tagId })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Add custom fields (skipDuplicates for new, won't update existing)
              Object.keys(customFieldValues).length > 0 ? prisma.customFieldValue.createMany({
                data: Object.entries(customFieldValues).map(([fieldId, value]) => ({ 
                  recordId: existingRecord.id, fieldId, value 
                })),
                skipDuplicates: true,
              }) : Promise.resolve(),
              // Log record update (UPDATE mode)
              prisma.recordActivityLog.create({
                data: {
                  recordId: existingRecord.id,
                  action: 'updated',
                  field: 'record',
                  newValue: 'Bulk import update',
                  source: 'Bulk Import',
                },
              }),
            ]);

            updated++;
          } else {
            skipped++;
          }
        }
      } catch (rowError) {
        console.error(`Error processing row ${i + 2}:`, rowError);
        errors++;
        errorDetails.push({ row: i + 2, reason: 'Processing error' });
      }
    }

    // Update activity log with final status if activityId provided
    if (activityId) {
      // Get the activity to get filename
      const activity = await prisma.activityLog.findUnique({ where: { id: activityId } });
      
      await prisma.activityLog.update({
        where: { id: activityId },
        data: {
          processed: added + updated + errors,
          status: 'completed',
          metadata: {
            importType,
            importOption,
            added,
            updated,
            skipped,
            errors,
            errorDetails: errorDetails.slice(0, 10),
          },
        },
      });
      
      // Create system log entry
      await prisma.activityLog.create({
        data: {
          type: 'action',
          action: 'bulk_import',
          description: `User uploaded "${activity?.filename || 'file'}" (${added} added, ${updated} updated, ${errors} errors)`,
          total: csvData.length,
          processed: added + updated + errors,
          status: 'completed',
        },
      });
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      skipped,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
      total: csvData.length,
    });
  } catch (error) {
    console.error('Error importing records:', error);
    return NextResponse.json(
      { error: 'Failed to import records' },
      { status: 500 }
    );
  }
}
