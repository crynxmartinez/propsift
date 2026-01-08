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

// POST /api/feedback/[id]/vote - Toggle vote on a post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const postId = params.id

    // Check if post exists
    const post = await (prisma as any).feedbackPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user already voted
    const existingVote = await (prisma as any).feedbackVote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    })

    if (existingVote) {
      // Remove vote
      await (prisma as any).feedbackVote.delete({
        where: { id: existingVote.id }
      })

      // Decrement vote count
      await (prisma as any).feedbackPost.update({
        where: { id: postId },
        data: { voteCount: { decrement: 1 } }
      })

      return NextResponse.json({ 
        hasVoted: false, 
        voteCount: post.voteCount - 1 
      })
    } else {
      // Add vote
      await (prisma as any).feedbackVote.create({
        data: {
          postId,
          userId
        }
      })

      // Increment vote count
      await (prisma as any).feedbackPost.update({
        where: { id: postId },
        data: { voteCount: { increment: 1 } }
      })

      return NextResponse.json({ 
        hasVoted: true, 
        voteCount: post.voteCount + 1 
      })
    }
  } catch (error) {
    console.error('Error toggling vote:', error)
    return NextResponse.json({ error: 'Failed to toggle vote' }, { status: 500 })
  }
}
