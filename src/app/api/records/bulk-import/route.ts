import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectCompany } from '@/lib/companyDetection';
import { isRecordComplete } from '@/lib/completenessCheck';

interface ImportRequest {
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
    const body: ImportRequest = await request.json();
    const { importType, importOption, motivationIds, tagIds, fieldMapping, csvHeaders, csvData } = body;

    if (!csvData || csvData.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 });
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
          
          // Check for existing record by property address
          const existingRecord = await prisma.record.findFirst({
            where: {
              propertyStreet: { equals: propertyStreet, mode: 'insensitive' },
              propertyCity: { equals: propertyCity, mode: 'insensitive' },
              propertyState: { equals: propertyState, mode: 'insensitive' },
              propertyZip: propertyZip,
            },
          });

          if (existingRecord) {
            // Overwrite existing record
            await prisma.record.update({
              where: { id: existingRecord.id },
              data: {
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
                isComplete,
              },
            });

            // Delete existing phones and emails for overwrite
            await prisma.recordPhoneNumber.deleteMany({ where: { recordId: existingRecord.id } });
            await prisma.recordEmail.deleteMany({ where: { recordId: existingRecord.id } });

            // Add phones (max 15)
            for (const phone of phones) {
              await prisma.recordPhoneNumber.create({
                data: { recordId: existingRecord.id, number: phone },
              });
            }

            // Add emails (max 5)
            for (const emailAddress of emails) {
              await prisma.recordEmail.create({
                data: { recordId: existingRecord.id, email: emailAddress },
              });
            }

            // Add motivations
            for (const motivationId of motivationIds) {
              await prisma.recordMotivation.upsert({
                where: { recordId_motivationId: { recordId: existingRecord.id, motivationId } },
                create: { recordId: existingRecord.id, motivationId },
                update: {},
              });
            }

            // Add tags
            for (const tagId of tagIds) {
              await prisma.recordTag.upsert({
                where: { recordId_tagId: { recordId: existingRecord.id, tagId } },
                create: { recordId: existingRecord.id, tagId },
                update: {},
              });
            }

            updated++;
          } else {
            // Create new record
            const newRecord = await prisma.record.create({
              data: {
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
                isComplete,
              },
            });

            // Add phones (max 15)
            for (const phone of phones) {
              await prisma.recordPhoneNumber.create({
                data: { recordId: newRecord.id, number: phone },
              });
            }

            // Add emails (max 5)
            for (const emailAddress of emails) {
              await prisma.recordEmail.create({
                data: { recordId: newRecord.id, email: emailAddress },
              });
            }

            // Add motivations
            for (const motivationId of motivationIds) {
              await prisma.recordMotivation.create({
                data: { recordId: newRecord.id, motivationId },
              });
            }

            // Add tags
            for (const tagId of tagIds) {
              await prisma.recordTag.create({
                data: { recordId: newRecord.id, tagId },
              });
            }

            added++;
          }
        } else {
          // UPDATE MODE: Only update existing records with non-empty fields
          
          let existingRecord;
          
          if (importOption === 'mailing_address') {
            // Find by mailing address
            existingRecord = await prisma.record.findFirst({
              where: {
                mailingStreet: { equals: mailingStreet, mode: 'insensitive' },
                mailingCity: { equals: mailingCity, mode: 'insensitive' },
                mailingState: { equals: mailingState, mode: 'insensitive' },
                mailingZip: mailingZip,
              },
            });
          } else {
            // Find by property address
            existingRecord = await prisma.record.findFirst({
              where: {
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

          // Check if we have data to update (more than just isComplete) or phones/emails to add
          const hasDataToUpdate = Object.keys(updateData).length > 1;
          const hasPhonesOrEmails = phones.length > 0 || emails.length > 0;

          if (hasDataToUpdate || hasPhonesOrEmails) {
            if (hasDataToUpdate) {
              await prisma.record.update({
                where: { id: existingRecord.id },
                data: updateData,
              });
            }

            // Add phones (don't remove existing, just add new ones)
            for (const phone of phones) {
              // Check if phone already exists
              const existingPhone = await prisma.recordPhoneNumber.findFirst({
                where: { recordId: existingRecord.id, number: phone },
              });
              if (!existingPhone) {
                await prisma.recordPhoneNumber.create({
                  data: { recordId: existingRecord.id, number: phone },
                });
              }
            }

            // Add emails (don't remove existing, just add new ones)
            for (const emailAddress of emails) {
              // Check if email already exists
              const existingEmail = await prisma.recordEmail.findFirst({
                where: { recordId: existingRecord.id, email: emailAddress },
              });
              if (!existingEmail) {
                await prisma.recordEmail.create({
                  data: { recordId: existingRecord.id, email: emailAddress },
                });
              }
            }

            // Add motivations (don't remove existing)
            for (const motivationId of motivationIds) {
              await prisma.recordMotivation.upsert({
                where: { recordId_motivationId: { recordId: existingRecord.id, motivationId } },
                create: { recordId: existingRecord.id, motivationId },
                update: {},
              });
            }

            // Add tags (don't remove existing)
            for (const tagId of tagIds) {
              await prisma.recordTag.upsert({
                where: { recordId_tagId: { recordId: existingRecord.id, tagId } },
                create: { recordId: existingRecord.id, tagId },
                update: {},
              });
            }

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
