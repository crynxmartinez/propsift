'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronUp,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Lightbulb,
  Wrench,
  Bug,
  HelpCircle,
  CheckCircle,
  Clock,
  Calendar,
  Pin,
  Crown,
  AlertCircle
} from 'lucide-react'

interface FeedbackPost {
  id: string
  title: string
  description: string
  status: string
  category: string
  voteCount: number
  commentCount: number
  adminNote: string | null
  isPinned: boolean
  hasVoted: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    email: string
    name: string | null
    firstName: string | null
    lastName: string | null
  }
  comments: Comment[]
}

interface Comment {
  id: string
  content: string
  isAdminReply: boolean
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
    firstName: string | null
    lastName: string | null
    isPlatformAdmin: boolean
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  open: { label: 'Open', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
  planned: { label: 'Planned', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Calendar },
  completed: { label: 'Completed', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: CheckCircle }
}

const categoryConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  feature: { label: 'Feature', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Lightbulb },
  improvement: { label: 'Improvement', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Wrench },
  bug: { label: 'Bug', color: 'text-red-700', bgColor: 'bg-red-100', icon: Bug },
  other: { label: 'Other', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: HelpCircle }
}

export default function FeedbackDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<FeedbackPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Comment form
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    // Get current user ID from token
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserId(payload.userId)
      } catch {
        // Invalid token
      }
    }
  }, [])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch(`/api/feedback/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        if (res.status === 404) {
          setError('Post not found')
          return
        }
        throw new Error('Failed to fetch post')
      }

      const data = await res.json()
      setPost(data)
      setEditTitle(data.title)
      setEditDescription(data.description)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId])

  const handleVote = async () => {
    if (!post) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setPost({ ...post, hasVoted: data.hasVoted, voteCount: data.voteCount })
      }
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !post) return

    try {
      setSubmittingComment(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      })

      if (res.ok) {
        const comment = await res.json()
        setPost({
          ...post,
          comments: [...post.comments, comment],
          commentCount: post.commentCount + 1
        })
        setNewComment('')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm('Are you sure you want to delete this comment?')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        setPost({
          ...post,
          comments: post.comments.filter(c => c.id !== commentId),
          commentCount: post.commentCount - 1
        })
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!post || !editTitle.trim() || !editDescription.trim()) return

    try {
      setSavingEdit(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription
        })
      })

      if (res.ok) {
        const updatedPost = await res.json()
        setPost({ ...post, title: updatedPost.title, description: updatedPost.description })
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Error saving edit:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeletePost = async () => {
    if (!post || !confirm('Are you sure you want to delete this post? This cannot be undone.')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        router.push('/dashboard/feedback')
      }
    } catch (err) {
      console.error('Error deleting post:', err)
    }
  }

  const getDisplayName = (user: { firstName?: string | null; lastName?: string | null; name?: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.name) return user.name
    return user.email.split('@')[0]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link
          href="/dashboard/feedback"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feedback
        </Link>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error || 'Post not found'}
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[post.status] || statusConfig.open
  const categoryInfo = categoryConfig[post.category] || categoryConfig.other
  const StatusIcon = statusInfo.icon
  const CategoryIcon = categoryInfo.icon
  const isCreator = currentUserId === post.createdBy.id
  const canEdit = isCreator && post.status === 'open'
  const canDelete = isCreator && post.status === 'open' && post.commentCount === 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/feedback"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Feedback
      </Link>

      {/* Main Content */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <div className="flex gap-6">
          {/* Vote Button */}
          <button
            onClick={handleVote}
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 transition-colors flex-shrink-0 ${
              post.hasVoted
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChevronUp className="w-6 h-6" />
            <span className="text-2xl font-bold">{post.voteCount}</span>
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="w-full px-3 py-2 text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={5000}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditTitle(post.title)
                      setEditDescription(post.description)
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold">
                    {post.isPinned && (
                      <Pin className="w-5 h-5 inline-block mr-2 text-blue-600" />
                    )}
                    {post.title}
                  </h1>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={handleDeletePost}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.bgColor} ${categoryInfo.color}`}>
                    <CategoryIcon className="w-3 h-3" />
                    {categoryInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-foreground mt-4 whitespace-pre-wrap">{post.description}</p>

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <span>Posted by {getDisplayName(post.createdBy)}</span>
                  <span>•</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Admin Note */}
        {post.adminNote && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
              <Crown className="w-4 h-4" />
              PropSift Team Response
            </div>
            <p className="text-blue-800 whitespace-pre-wrap">{post.adminNote}</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({post.comments.length})
        </h2>

        {/* Comments List */}
        {post.comments.length > 0 ? (
          <div className="space-y-4 mb-6">
            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg ${
                  comment.isAdminReply ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getDisplayName(comment.user)}
                    </span>
                    {comment.isAdminReply && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        PropSift Team
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {currentUserId === comment.user.id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-foreground mt-2 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-6 mb-6">No comments yet. Be the first to comment!</p>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="border-t pt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={2000}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none bg-background text-foreground"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{newComment.length}/2000</span>
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {submittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
