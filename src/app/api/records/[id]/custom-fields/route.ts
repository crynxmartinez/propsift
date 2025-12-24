import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch custom field values for a specific record
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const values = await prisma.customFieldValue.findMany({
      where: { recordId: params.id },
      include: {
        field: true,
      },
    })
    return NextResponse.json(values)
  } catch (error) {
    console.error('Error fetching custom field values:', error)
    return NextResponse.json({ error: 'Failed to fetch custom field values' }, { status: 500 })
  }
}

// POST - Create or update a custom field value for a record
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { fieldId, value } = body

    if (!fieldId) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 })
    }

    // Upsert the value (create if not exists, update if exists)
    const fieldValue = await prisma.customFieldValue.upsert({
      where: {
        fieldId_recordId: {
          fieldId,
          recordId: params.id,
        },
      },
      update: {
        value: value?.toString() || null,
      },
      create: {
        fieldId,
        recordId: params.id,
        value: value?.toString() || null,
      },
      include: {
        field: true,
      },
    })

    return NextResponse.json(fieldValue)
  } catch (error) {
    console.error('Error saving custom field value:', error)
    return NextResponse.json({ error: 'Failed to save custom field value' }, { status: 500 })
  }
}
