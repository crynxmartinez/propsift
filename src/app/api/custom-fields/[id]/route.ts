import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Fetch a single custom field definition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const field = await prisma.customFieldDefinition.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    })
    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }
    return NextResponse.json(field)
  } catch (error) {
    console.error('Error fetching custom field:', error)
    return NextResponse.json({ error: 'Failed to fetch custom field' }, { status: 500 })
  }
}

// PUT - Update a custom field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check field exists and belongs to user
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, fieldType, displayType, options, isRequired, order } = body

    const field = await prisma.customFieldDefinition.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(fieldType && { fieldType }),
        ...(displayType && { displayType }),
        ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
        ...(isRequired !== undefined && { isRequired }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(field)
  } catch (error) {
    console.error('Error updating custom field:', error)
    return NextResponse.json({ error: 'Failed to update custom field' }, { status: 500 })
  }
}

// DELETE - Delete a custom field definition (and all its values)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check field exists and belongs to user
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { id: params.id, createdById: decoded.userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 })
    }

    await prisma.customFieldDefinition.delete({
      where: { id: params.id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting custom field:', error)
    return NextResponse.json({ error: 'Failed to delete custom field' }, { status: 500 })
  }
}
