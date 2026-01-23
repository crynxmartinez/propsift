'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pin,
  Lightbulb,
  Wrench,
  Bug,
  HelpCircle,
  MessageSquare
} from 'lucide-react'

interface FeedbackPost {
  id: string
  title: string
  type: string
  status: string
  isPinned: boolean
  voteCount: number
  commentCount: number
  createdAt: string
  author: {
    name: string | null
    email: string
  }
}

const typeIcons: Record<string, typeof Lightbulb> = {
  feature: Lightbulb,
  improvement: Wrench,
  bug: Bug,
  question: HelpCircle,
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-500',
  under_review: 'bg-yellow-500/20 text-yellow-500',
  planned: 'bg-purple-500/20 text-purple-500',
  in_progress: 'bg-orange-500/20 text-orange-500',
  completed: 'bg-green-500/20 text-green-500',
  declined: 'bg-red-500/20 text-red-500',
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const fetchFeedback = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          sort: 'votes'
        })
        if (statusFilter) params.set('status', statusFilter)
        if (search) params.set('search', search)

        const response = await fetch(`/api/feedback?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts)
          setTotalPages(data.pagination.totalPages)
        }
      } catch (error) {
        console.error('Error fetching feedback:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchFeedback, 300)
    return () => clearTimeout(debounce)
  }, [router, page, search, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-green-500" />
          Feedback
        </h1>
        <p className="text-muted-foreground">Manage user feedback and feature requests</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {posts.map(post => {
          const TypeIcon = typeIcons[post.type] || Lightbulb
          return (
            <Link
              key={post.id}
              href={`/dashboard/feedback/${post.id}`}
              className="block bg-card rounded-xl p-4 border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Vote count */}
                <div className="flex flex-col items-center min-w-[50px]">
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  <span className="font-bold">{post.voteCount}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[post.status] || statusColors.open}`}>
                      {post.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-medium truncate">{post.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{post.author.name || post.author.email}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No feedback posts found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
