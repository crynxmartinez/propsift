import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { orderedIds } = await request.json()

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 })
    }

    const updates = orderedIds.map((id: string, index: number) =>
      prisma.status.update({
        where: { id },
        data: { order: index }
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ message: 'Order updated successfully' })
  } catch (error) {
    console.error('Reorder statuses error:', error)
    return NextResponse.json({ error: 'Failed to reorder statuses' }, { status: 500 })
  }
}
