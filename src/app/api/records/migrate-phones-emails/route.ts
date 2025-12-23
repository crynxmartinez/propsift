import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/records/migrate-phones-emails - One-time migration to sync legacy phone/email to new arrays
export async function POST() {
  try {
    // Get all records with phone or email that don't have corresponding entries in arrays
    const records = await prisma.record.findMany({
      where: {
        OR: [
          { phone: { not: null } },
          { email: { not: null } },
        ],
      },
      include: {
        phoneNumbers: true,
        emails: true,
      },
    });

    let phonesCreated = 0;
    let emailsCreated = 0;

    for (const record of records) {
      // If record has legacy phone but no phone numbers in array, create one
      if (record.phone && record.phoneNumbers.length === 0) {
        await prisma.recordPhoneNumber.create({
          data: {
            recordId: record.id,
            number: record.phone,
            type: 'MOBILE',
            status: 'NONE',
          },
        });
        phonesCreated++;
      }

      // If record has legacy email but no emails in array, create one
      if (record.email && record.emails.length === 0) {
        await prisma.recordEmail.create({
          data: {
            recordId: record.id,
            email: record.email,
            isPrimary: true,
          },
        });
        emailsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Created ${phonesCreated} phone entries and ${emailsCreated} email entries.`,
      phonesCreated,
      emailsCreated,
    });
  } catch (error) {
    console.error('Error migrating phones/emails:', error);
    return NextResponse.json(
      { error: 'Failed to migrate phones/emails' },
      { status: 500 }
    );
  }
}
