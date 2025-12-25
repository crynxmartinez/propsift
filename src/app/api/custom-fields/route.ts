import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// GET - Fetch all custom field definitions
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    const fields = await prisma.customFieldDefinition.findMany({
      where: { createdById: authUser.ownerId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(fields)
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
  }
}

// POST - Create a new custom field definition
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    const body = await request.json()
    const { name, fieldType, displayType, options, isRequired } = body

    if (!name || !fieldType) {
      return NextResponse.json({ error: 'Name and field type are required' }, { status: 400 })
    }

    // Get the max order to add new field at the end for this user
    const maxOrder = await prisma.customFieldDefinition.aggregate({
      where: { createdById: authUser.ownerId },
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
        createdById: authUser.ownerId,
      },
    })

    return NextResponse.json(field)
  } catch (error) {
    console.error('Error creating custom field:', error)
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 })
  }
}
