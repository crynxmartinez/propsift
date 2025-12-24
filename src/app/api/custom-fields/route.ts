import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all custom field definitions
export async function GET() {
  try {
    const fields = await prisma.customFieldDefinition.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(fields)
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
  }
}

// POST - Create a new custom field definition
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, fieldType, displayType, options, isRequired } = body

    if (!name || !fieldType) {
      return NextResponse.json({ error: 'Name and field type are required' }, { status: 400 })
    }

    // Get the max order to add new field at the end
    const maxOrder = await prisma.customFieldDefinition.aggregate({
      _max: { order: true },
    })

    const field = await prisma.customFieldDefinition.create({
      data: {
        name,
        fieldType,
        displayType: displayType || 'card',
        options: options ? JSON.stringify(options) : null,
        isRequired: isRequired || false,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json(field)
  } catch (error) {
    console.error('Error creating custom field:', error)
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 })
  }
}
