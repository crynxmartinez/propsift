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
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    const existingTag = await prisma.tag.findUnique({
      where: { id }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const duplicateTag = await prisma.tag.findFirst({
      where: {
        name: name.trim(),
        NOT: { id }
      }
    })

    if (duplicateTag) {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 })
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: { name: name.trim() }
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Update tag error:', error)
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { properties: true }
        }
      }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    if (tag._count.properties > 0) {
      return NextResponse.json(
        { error: `Cannot delete tag. It has ${tag._count.properties} record(s) connected to it.` },
        { status: 400 }
      )
    }

    await prisma.tag.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Delete tag error:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
