import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/activity/[id] - Get a single activity log
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const activity = await prisma.activityLog.findUnique({
      where: { id: params.id },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}

// PATCH /api/activity/[id] - Update activity log (progress, status, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { processed, status, errorMessage, metadata } = body

    const updateData: Record<string, unknown> = {}
    if (processed !== undefined) updateData.processed = processed
    if (status) updateData.status = status
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage
    if (metadata !== undefined) updateData.metadata = metadata

    const activity = await prisma.activityLog.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    )
  }
}

// DELETE /api/activity/[id] - Delete an activity log
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.activityLog.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    )
  }
}
