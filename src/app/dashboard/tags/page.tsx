'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tag, Plus, Pencil, Trash2, X, Check, Loader2, ExternalLink, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TagItem {
  id: string
  name: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TagItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paginatedTags = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return tags.slice(startIndex, startIndex + itemsPerPage)
  }, [tags, currentPage])

  const totalPages = Math.ceil(tags.length / itemsPerPage)

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tags', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch tags')
      const data = await res.json()
      setTags(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTagName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tag')
      }

      setNewTagName('')
      toast.success('Tag created successfully')
      fetchTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return

    setUpdating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update tag')
      }

      setEditingId(null)
      setEditingName('')
      toast.success('Tag updated successfully')
      fetchTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tag')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    setDeletingId(deleteConfirm.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tags/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete tag')
      }

      toast.success('Tag deleted successfully')
      fetchTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const startEditing = (tag: TagItem) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Tags</h1>
        <p className="text-muted-foreground mt-1">Manage your property tags</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Create New Tag</CardTitle>
              <CardDescription>Add a new tag to organize your properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name"
              className="flex-1"
            />
            <Button type="submit" disabled={creating || !newTagName.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">All Tags</CardTitle>
              <CardDescription>{tags.length} tag{tags.length !== 1 ? 's' : ''} total</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No tags yet</p>
              <p className="text-sm text-muted-foreground/70">Create your first tag above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Name</TableHead>
                  <TableHead className="w-1/6">Records</TableHead>
                  <TableHead className="w-1/5"></TableHead>
                  <TableHead className="w-1/5"></TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      {editingId === tag.id ? (
                        <Input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="max-w-[200px]"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{tag.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tag.recordCount > 0 ? "info" : "secondary"}>
                        {tag.recordCount} record{tag.recordCount !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        See Breakdown <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        See Properties <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === tag.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdate(tag.id)}
                            disabled={updating || !editingName.trim()}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditing(tag)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(tag)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, tags.length)} of {tags.length} tags
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">"{deleteConfirm?.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingId === deleteConfirm?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId === deleteConfirm?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
