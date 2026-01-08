import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  const decoded = verifyToken(token)
  return decoded?.userId || null
}

// GET /api/feedback - List all feedback posts
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'votes' // votes, newest, comments
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const myPosts = searchParams.get('myPosts') === 'true'

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (category && category !== 'all') {
      where.category = category
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (myPosts) {
      where.createdById = userId
    }

    // Build orderBy
    let orderBy: any = []
    
    // Pinned posts always first
    orderBy.push({ isPinned: 'desc' })
    
    switch (sort) {
      case 'newest':
        orderBy.push({ createdAt: 'desc' })
        break
      case 'comments':
        orderBy.push({ commentCount: 'desc' })
        break
      case 'votes':
      default:
        orderBy.push({ voteCount: 'desc' })
        break
    }

    // Get total count
    const total = await (prisma as any).feedbackPost.count({ where })

    // Get posts with user info and vote status
    const posts = await (prisma as any).feedbackPost.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true
          }
        },
        votes: {
          where: { userId },
          select: { id: true }
        }
      }
    })

    // Transform to include hasVoted flag
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      hasVoted: post.votes.length > 0,
      votes: undefined // Remove votes array from response
    }))

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching feedback posts:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback posts' }, { status: 500 })
  }
}

// POST /api/feedback - Create new feedback post
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ error: 'Title must be 200 characters or less' }, { status: 400 })
    }

    if (description.length > 5000) {
      return NextResponse.json({ error: 'Description must be 5000 characters or less' }, { status: 400 })
    }

    const validCategories = ['feature', 'improvement', 'bug', 'other']
    const postCategory = validCategories.includes(category) ? category : 'feature'

    // Create the post
    const post = await (prisma as any).feedbackPost.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: postCategory,
        createdById: userId,
        voteCount: 1 // Creator automatically votes for their own post
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Auto-vote for creator
    await (prisma as any).feedbackVote.create({
      data: {
        postId: post.id,
        userId
      }
    })

    return NextResponse.json({
      ...post,
      hasVoted: true
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating feedback post:', error)
    return NextResponse.json({ error: 'Failed to create feedback post' }, { status: 500 })
  }
}
