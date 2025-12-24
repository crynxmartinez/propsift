import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/records/export - Export records to CSV and store in activity log
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { recordIds } = body

    // Build where clause
    const where = recordIds ? { id: { in: recordIds } } : {}

    // Count records first
    const totalRecords = await prisma.record.count({ where })
    const filename = `records_export_${new Date().toISOString().split('T')[0]}.csv`

    // Create activity log entry first
    const activity = await prisma.activityLog.create({
      data: {
        type: 'download',
        action: 'export',
        filename,
        description: `User created a download (${totalRecords} records)`,
        total: totalRecords,
        processed: 0,
        status: 'processing',
      },
    })
    
    // Also create a system log entry
    await prisma.activityLog.create({
      data: {
        type: 'action',
        action: 'export',
        description: `User created a download "${filename}"`,
        total: totalRecords,
        processed: totalRecords,
        status: 'completed',
      },
    })

    // Fetch records with all related data
    const records = await prisma.record.findMany({
      where,
      include: {
        phoneNumbers: true,
        emails: true,
        recordMotivations: {
          include: { motivation: true }
        },
        recordTags: {
          include: { tag: true }
        },
        status: true,
        customFieldValues: {
          include: { field: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build CSV headers
    const headers = [
      'Owner First Name',
      'Owner Last Name',
      'Owner Full Name',
      'Is Company',
      'Property Street',
      'Property City',
      'Property State',
      'Property ZIP',
      'Mailing Street',
      'Mailing City',
      'Mailing State',
      'Mailing ZIP',
      'Phone 1', 'Phone 2', 'Phone 3', 'Phone 4', 'Phone 5',
      'Phone 6', 'Phone 7', 'Phone 8', 'Phone 9', 'Phone 10',
      'Phone 11', 'Phone 12', 'Phone 13', 'Phone 14', 'Phone 15',
      'Email 1', 'Email 2', 'Email 3', 'Email 4', 'Email 5',
      'Status',
      'Temperature',
      'Motivations',
      'Tags',
      'Call Attempts',
      'Direct Mail Attempts',
      'SMS Attempts',
      'RVM Attempts',
      'Estimated Value',
      'Bedrooms',
      'Bathrooms',
      'Sqft',
      'Lot Size',
      'Year Built',
      'Structure Type',
      'Heating Type',
      'Air Conditioner',
      'Notes',
      'Description',
      'Is Complete',
      'Created At',
    ]

    // Build CSV rows
    const rows = records.map(record => {
      const phones = record.phoneNumbers.map(p => p.number)
      const emails = record.emails.map(e => e.email)
      const motivations = record.recordMotivations.map(m => m.motivation.name).join(', ')
      const tags = record.recordTags.map(t => t.tag.name).join(', ')

      return [
        record.ownerFirstName || '',
        record.ownerLastName || '',
        record.ownerFullName || '',
        record.isCompany ? 'Yes' : 'No',
        record.propertyStreet || '',
        record.propertyCity || '',
        record.propertyState || '',
        record.propertyZip || '',
        record.mailingStreet || '',
        record.mailingCity || '',
        record.mailingState || '',
        record.mailingZip || '',
        phones[0] || '', phones[1] || '', phones[2] || '', phones[3] || '', phones[4] || '',
        phones[5] || '', phones[6] || '', phones[7] || '', phones[8] || '', phones[9] || '',
        phones[10] || '', phones[11] || '', phones[12] || '', phones[13] || '', phones[14] || '',
        emails[0] || '', emails[1] || '', emails[2] || '', emails[3] || '', emails[4] || '',
        record.status?.name || '',
        record.temperature || '',
        motivations,
        tags,
        record.callAttempts?.toString() || '0',
        record.directMailAttempts?.toString() || '0',
        record.smsAttempts?.toString() || '0',
        record.rvmAttempts?.toString() || '0',
        record.estimatedValue?.toString() || '',
        record.bedrooms?.toString() || '',
        record.bathrooms?.toString() || '',
        record.sqft?.toString() || '',
        record.lotSize?.toString() || '',
        record.yearBuilt?.toString() || '',
        record.structureType || '',
        record.heatingType || '',
        record.airConditioner || '',
        record.notes || '',
        record.description || '',
        record.isComplete ? 'Yes' : 'No',
        record.createdAt.toISOString(),
      ]
    })

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // Build CSV string
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Store CSV content in activity log metadata and mark as completed
    await prisma.activityLog.update({
      where: { id: activity.id },
      data: {
        processed: records.length,
        status: 'completed',
        metadata: {
          csvContent,
          recordCount: records.length,
        },
      },
    })

    // Return success response (no auto-download)
    return NextResponse.json({
      success: true,
      activityId: activity.id,
      recordCount: records.length,
      message: 'Export completed. Go to Activity > Download to download your file.',
    })
  } catch (error) {
    console.error('Error exporting records:', error)
    return NextResponse.json(
      { error: 'Failed to export records' },
      { status: 500 }
    )
  }
}
