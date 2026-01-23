'use client'

import { useState, useEffect, useMemo } from 'react'
import { Zap, Plus, Pencil, Trash2, X, Check, Loader2, ExternalLink, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
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

interface MotivationItem {
  id: string
  name: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

export default function MotivationsContent() {
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newMotivationName, setNewMotivationName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MotivationItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paginatedMotivations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return motivations.slice(startIndex, startIndex + itemsPerPage)
  }, [motivations, currentPage])

  const totalPages = Math.ceil(motivations.length / itemsPerPage)

  const fetchMotivations = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/motivations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch motivations')
      const data = await res.json()
      setMotivations(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch motivations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMotivations()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMotivationName.trim()) return

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/motivations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newMotivationName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create motivation')
      }

      setNewMotivationName('')
      toast.success('Motivation created successfully')
      fetchMotivations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create motivation')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return

    setUpdating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/motivations/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update motivation')
      }

      setEditingId(null)
      setEditingName('')
      toast.success('Motivation updated successfully')
      fetchMotivations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update motivation')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    setDeletingId(deleteConfirm.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/motivations/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete motivation')
      }

      toast.success('Motivation deleted successfully')
      fetchMotivations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete motivation')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const startEditing = (motivation: MotivationItem) => {
    setEditingId(motivation.id)
    setEditingName(motivation.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Create New Motivation</CardTitle>
              <CardDescription>Add a new motivation to categorize your properties</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              type="text"
              value={newMotivationName}
              onChange={(e) => setNewMotivationName(e.target.value)}
              placeholder="Enter motivation name"
              className="flex-1"
            />
            <Button type="submit" disabled={creating || !newMotivationName.trim()}>
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
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">All Motivations</CardTitle>
              <CardDescription>{motivations.length} motivation{motivations.length !== 1 ? 's' : ''} total</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading motivations...</p>
            </div>
          ) : motivations.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No motivations yet</p>
              <p className="text-sm text-muted-foreground/70">Create your first motivation above</p>
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
                {paginatedMotivations.map((motivation) => (
                  <TableRow key={motivation.id}>
                    <TableCell>
                      {editingId === motivation.id ? (
                        <Input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="max-w-[200px]"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{motivation.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={motivation.recordCount > 0 ? "info" : "secondary"}>
                        {motivation.recordCount} record{motivation.recordCount !== 1 ? 's' : ''}
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
                      {editingId === motivation.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdate(motivation.id)}
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
                            <DropdownMenuItem onClick={() => startEditing(motivation)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(motivation)}
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

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, motivations.length)} of {motivations.length} motivations
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
            <AlertDialogTitle>Delete Motivation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">&quot;{deleteConfirm?.name}&quot;</span>? This action cannot be undone.
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
