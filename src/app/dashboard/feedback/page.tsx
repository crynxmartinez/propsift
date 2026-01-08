'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  ChevronUp,
  Plus,
  Search,
  Filter,
  Lightbulb,
  Wrench,
  Bug,
  HelpCircle,
  CheckCircle,
  Clock,
  Calendar,
  X,
  Pin
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
  createdBy: {
    id: string
    email: string
    name: string | null
    firstName: string | null
    lastName: string | null
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
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

export default function FeedbackPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('votes')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [myPosts, setMyPosts] = useState(false)

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostDescription, setNewPostDescription] = useState('')
  const [newPostCategory, setNewPostCategory] = useState('feature')
  const [submitting, setSubmitting] = useState(false)

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (category !== 'all') params.set('category', category)
      params.set('sort', sort)
      if (search) params.set('search', search)
      if (myPosts) params.set('myPosts', 'true')
      params.set('page', pagination?.page?.toString() || '1')

      const res = await fetch(`/api/feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch feedback')
      }

      const data = await res.json()
      setPosts(data.posts)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [status, category, sort, search, myPosts])

  const handleVote = async (postId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/feedback/${postId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, hasVoted: data.hasVoted, voteCount: data.voteCount }
            : post
        ))
      }
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostTitle.trim() || !newPostDescription.trim()) return

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newPostTitle,
          description: newPostDescription,
          category: newPostCategory
        })
      })

      if (res.ok) {
        setShowNewPostModal(false)
        setNewPostTitle('')
        setNewPostDescription('')
        setNewPostCategory('feature')
        fetchPosts()
      }
    } catch (err) {
      console.error('Error creating post:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const getDisplayName = (user: FeedbackPost['createdBy']) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.name) return user.name
    return user.email.split('@')[0]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Requests</h1>
          <p className="text-gray-500 mt-1">Vote on features you want or suggest new ones</p>
        </div>
        <button
          onClick={() => setShowNewPostModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search requests..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">All Categories</option>
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="bug">Bug</option>
            <option value="other">Other</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="votes">Most Voted</option>
            <option value="newest">Newest</option>
            <option value="comments">Most Discussed</option>
          </select>

          {/* My Posts Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={myPosts}
              onChange={(e) => setMyPosts(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">My Requests</span>
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
          <p className="text-gray-500 mb-4">Be the first to suggest a feature!</p>
          <button
            onClick={() => setShowNewPostModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const statusInfo = statusConfig[post.status] || statusConfig.open
            const categoryInfo = categoryConfig[post.category] || categoryConfig.other
            const StatusIcon = statusInfo.icon
            const CategoryIcon = categoryInfo.icon

            return (
              <div
                key={post.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Vote Button */}
                  <button
                    onClick={() => handleVote(post.id)}
                    className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition-colors flex-shrink-0 ${
                      post.hasVoted
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ChevronUp className="w-5 h-5" />
                    <span className="text-lg font-bold">{post.voteCount}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        href={`/dashboard/feedback/${post.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {post.isPinned && (
                          <Pin className="w-4 h-4 inline-block mr-2 text-blue-600" />
                        )}
                        {post.title}
                      </Link>
                      <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm">{post.commentCount}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{post.description}</p>

                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {/* Category Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.bgColor} ${categoryInfo.color}`}>
                        <CategoryIcon className="w-3 h-3" />
                        {categoryInfo.label}
                      </span>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>

                      <span className="text-xs text-gray-400">•</span>

                      <span className="text-xs text-gray-500">
                        Posted by {getDisplayName(post.createdBy)}
                      </span>

                      <span className="text-xs text-gray-400">•</span>

                      <span className="text-xs text-gray-500">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Feature Request</h2>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Brief summary of your request"
                  maxLength={200}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">{newPostTitle.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newPostDescription}
                  onChange={(e) => setNewPostDescription(e.target.value)}
                  placeholder="Describe your feature request in detail. What problem does it solve? How would it work?"
                  maxLength={5000}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{newPostDescription.length}/5000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="feature">Feature Request</option>
                  <option value="improvement">Improvement</option>
                  <option value="bug">Bug Report</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newPostTitle.trim() || !newPostDescription.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
