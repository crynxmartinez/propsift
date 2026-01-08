import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true, status: true }
  })
  return user?.status === 'active' && user?.isPlatformAdmin === true
}

// DELETE /api/feedback/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const comment = await (prisma as any).feedbackComment.findUnique({
      where: { id: params.commentId }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Verify comment belongs to the post
    if (comment.postId !== params.id) {
      return NextResponse.json({ error: 'Comment does not belong to this post' }, { status: 400 })
    }

    const isAdmin = await isPlatformAdmin(userId)
    const isCommentOwner = comment.userId === userId

    // Only admin or comment owner can delete
    if (!isAdmin && !isCommentOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete comment
    await (prisma as any).feedbackComment.delete({
      where: { id: params.commentId }
    })

    // Decrement comment count on post
    await (prisma as any).feedbackPost.update({
      where: { id: params.id },
      data: { commentCount: { decrement: 1 } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
