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

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true, status: true }
  })
  return user?.status === 'active' && user?.isPlatformAdmin === true
}

// GET /api/feedback/[id] - Get single post with comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await (prisma as any).feedbackPost.findUnique({
      where: { id: params.id },
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
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                firstName: true,
                lastName: true,
                isPlatformAdmin: true
              }
            }
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...post,
      hasVoted: post.votes.length > 0,
      votes: undefined
    })
  } catch (error) {
    console.error('Error fetching feedback post:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback post' }, { status: 500 })
  }
}

// PATCH /api/feedback/[id] - Update post (admin only for status/note, creator for title/description)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, adminNote, title, description, isPinned } = body

    const post = await (prisma as any).feedbackPost.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isAdmin = await isPlatformAdmin(userId)
    const isCreator = post.createdById === userId

    // Build update data based on permissions
    const updateData: any = {}

    // Admin-only fields
    if (isAdmin) {
      if (status) {
        const validStatuses = ['open', 'in_progress', 'planned', 'completed']
        if (validStatuses.includes(status)) {
          updateData.status = status
        }
      }
      if (adminNote !== undefined) {
        updateData.adminNote = adminNote
      }
      if (typeof isPinned === 'boolean') {
        updateData.isPinned = isPinned
      }
    }

    // Creator can edit title/description only if post is still open
    if (isCreator && post.status === 'open') {
      if (title) {
        if (title.length > 200) {
          return NextResponse.json({ error: 'Title must be 200 characters or less' }, { status: 400 })
        }
        updateData.title = title.trim()
      }
      if (description) {
        if (description.length > 5000) {
          return NextResponse.json({ error: 'Description must be 5000 characters or less' }, { status: 400 })
        }
        updateData.description = description.trim()
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update or insufficient permissions' }, { status: 400 })
    }

    const updatedPost = await (prisma as any).feedbackPost.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Error updating feedback post:', error)
    return NextResponse.json({ error: 'Failed to update feedback post' }, { status: 500 })
  }
}

// DELETE /api/feedback/[id] - Delete post (admin or creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await (prisma as any).feedbackPost.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isAdmin = await isPlatformAdmin(userId)
    const isCreator = post.createdById === userId

    // Only admin or creator can delete
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Creator can only delete if post has no comments and is still open
    if (isCreator && !isAdmin) {
      if (post.status !== 'open' || post.commentCount > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete post that has comments or is no longer open' 
        }, { status: 400 })
      }
    }

    await (prisma as any).feedbackPost.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feedback post:', error)
    return NextResponse.json({ error: 'Failed to delete feedback post' }, { status: 500 })
  }
}
