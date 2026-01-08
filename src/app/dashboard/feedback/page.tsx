'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  ChevronUp,
  Plus,
  Search,
  Lightbulb,
  Wrench,
  Bug,
  HelpCircle,
  CheckCircle,
  Clock,
  Calendar,
  X,
  Pin,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
      setError('')
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
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch feedback')
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
          <h1 className="text-2xl font-bold">Feature Requests</h1>
          <p className="text-muted-foreground mt-1">Vote on features you want or suggest new ones</p>
        </div>
        <Button onClick={() => setShowNewPostModal(true)}>
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search requests..."
                  className="pl-10"
                />
              </div>
            </form>

            {/* Status Filter */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="votes">Most Voted</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="comments">Most Discussed</SelectItem>
              </SelectContent>
            </Select>

            {/* My Posts Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="myPosts"
                checked={myPosts}
                onCheckedChange={(checked) => setMyPosts(checked === true)}
              />
              <Label htmlFor="myPosts" className="text-sm cursor-pointer">My Requests</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No requests found</h3>
            <p className="text-muted-foreground mb-4">Be the first to suggest a feature!</p>
            <Button onClick={() => setShowNewPostModal(true)}>
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const statusInfo = statusConfig[post.status] || statusConfig.open
            const categoryInfo = categoryConfig[post.category] || categoryConfig.other
            const StatusIcon = statusInfo.icon
            const CategoryIcon = categoryInfo.icon

            return (
              <Card key={post.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Vote Button */}
                    <button
                      onClick={() => handleVote(post.id)}
                      className={cn(
                        "flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition-colors flex-shrink-0",
                        post.hasVoted
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ChevronUp className="w-5 h-5" />
                      <span className="text-lg font-bold">{post.voteCount}</span>
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <Link
                          href={`/dashboard/feedback/${post.id}`}
                          className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1"
                        >
                          {post.isPinned && (
                            <Pin className="w-4 h-4 inline-block mr-2 text-primary" />
                          )}
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{post.commentCount}</span>
                        </div>
                      </div>

                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{post.description}</p>

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {/* Category Badge */}
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", categoryInfo.bgColor, categoryInfo.color)}>
                          <CategoryIcon className="w-3 h-3" />
                          {categoryInfo.label}
                        </span>

                        {/* Status Badge */}
                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", statusInfo.bgColor, statusInfo.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>

                        <span className="text-xs text-muted-foreground">•</span>

                        <span className="text-xs text-muted-foreground">
                          Posted by {getDisplayName(post.createdBy)}
                        </span>

                        <span className="text-xs text-muted-foreground">•</span>

                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* New Post Modal */}
      <Dialog open={showNewPostModal} onOpenChange={setShowNewPostModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Feature Request</DialogTitle>
            <DialogDescription>
              Submit a new feature request or suggestion for the platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Brief summary of your request"
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">{newPostTitle.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newPostDescription}
                onChange={(e) => setNewPostDescription(e.target.value)}
                placeholder="Describe your feature request in detail. What problem does it solve? How would it work?"
                maxLength={5000}
                required
                rows={5}
              />
              <p className="text-xs text-muted-foreground">{newPostDescription.length}/5000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewPostModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !newPostTitle.trim() || !newPostDescription.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
