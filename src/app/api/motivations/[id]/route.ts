import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Motivation name is required' }, { status: 400 })
    }

    const existingMotivation = await prisma.motivation.findUnique({
      where: { id }
    })

    if (!existingMotivation) {
      return NextResponse.json({ error: 'Motivation not found' }, { status: 404 })
    }

    const duplicateMotivation = await prisma.motivation.findFirst({
      where: {
        name: name.trim(),
        NOT: { id }
      }
    })

    if (duplicateMotivation) {
      return NextResponse.json({ error: 'Motivation with this name already exists' }, { status: 409 })
    }

    const motivation = await prisma.motivation.update({
      where: { id },
      data: { name: name.trim() }
    })

    return NextResponse.json(motivation)
  } catch (error) {
    console.error('Update motivation error:', error)
    return NextResponse.json({ error: 'Failed to update motivation' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const motivation = await prisma.motivation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { properties: true }
        }
      }
    })

    if (!motivation) {
      return NextResponse.json({ error: 'Motivation not found' }, { status: 404 })
    }

    if (motivation._count.properties > 0) {
      return NextResponse.json(
        { error: `Cannot delete motivation. It has ${motivation._count.properties} record(s) connected to it.` },
        { status: 400 }
      )
    }

    await prisma.motivation.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Motivation deleted successfully' })
  } catch (error) {
    console.error('Delete motivation error:', error)
    return NextResponse.json({ error: 'Failed to delete motivation' }, { status: 500 })
  }
}
