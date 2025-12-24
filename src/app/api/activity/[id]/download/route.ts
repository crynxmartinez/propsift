import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/activity/[id]/download - Download the CSV file from activity log
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

    if (activity.type !== 'download') {
      return NextResponse.json(
        { error: 'This activity is not a download' },
        { status: 400 }
      )
    }

    if (activity.status !== 'completed') {
      return NextResponse.json(
        { error: 'Export is not yet completed' },
        { status: 400 }
      )
    }

    const metadata = activity.metadata as { csvContent?: string } | null
    if (!metadata?.csvContent) {
      return NextResponse.json(
        { error: 'No CSV content available' },
        { status: 404 }
      )
    }

    // Return CSV as downloadable file
    return new NextResponse(metadata.csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${activity.filename || 'export.csv'}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading activity:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
