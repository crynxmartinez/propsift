import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const tags = await prisma.tag.findMany({
      where: { createdById: decoded.userId },
      include: {
        _count: {
          select: { records: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formattedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      recordCount: tag._count.records,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    }))

    return NextResponse.json(formattedTags)
  } catch (error) {
    console.error('Get tags error:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

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

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    const existingTag = await prisma.tag.findFirst({
      where: { 
        name: name.trim(),
        createdById: decoded.userId
      }
    })

    if (existingTag) {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 })
    }

    const tag = await prisma.tag.create({
      data: { 
        name: name.trim(),
        createdById: decoded.userId
      }
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}
