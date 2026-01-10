import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/roles'
import { verifyToken } from '@/lib/auth'
import { headers } from 'next/headers'
import { getQueue, QUEUE_SECTION_INFO } from '@/lib/lce'

export async function GET(request: Request) {
  try {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || ''
    
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const ownerId = authUser.ownerId

    // Get section filter and pagination from query params
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') as 'OVERDUE' | 'DUE_TODAY' | 'TASKS_DUE' | 'VERIFY_FIRST' | 'GET_NUMBERS' | 'UPCOMING' | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Get queue
    const queue = await getQueue(ownerId, section || undefined)

    // Group by section if no specific section requested
    if (!section) {
      const sections: Record<string, typeof queue> = {
        OVERDUE: [],
        DUE_TODAY: [],
        TASKS_DUE: [],
        VERIFY_FIRST: [],
        GET_NUMBERS: [],
        UPCOMING: [],
      }

      for (const record of queue) {
        if (sections[record.queueSection]) {
          sections[record.queueSection].push(record)
        }
      }

      // Limit each section
      const limitedSections: Record<string, { records: typeof queue; total: number; hasMore: boolean }> = {}
      for (const [key, records] of Object.entries(sections)) {
        limitedSections[key] = {
          records: records.slice(0, limit),
          total: records.length,
          hasMore: records.length > limit,
        }
      }

      return NextResponse.json({
        sections: limitedSections,
        sectionInfo: QUEUE_SECTION_INFO,
        totalRecords: queue.length,
      })
    }

    // Return specific section
    const limitedRecords = queue.slice(0, limit)

    return NextResponse.json({
      section,
      sectionInfo: QUEUE_SECTION_INFO[section],
      records: limitedRecords,
      total: queue.length,
      hasMore: queue.length > limit,
    })
  } catch (error) {
    console.error('Error fetching LCE queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
