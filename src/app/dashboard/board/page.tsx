'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Edit2, Trash2, LayoutGrid, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface BoardColumn {
  id: string
  name: string
  color: string
  order: number
  _count: {
    records: number
  }
}

interface Board {
  id: string
  name: string
  description: string | null
  columns: BoardColumn[]
  totalRecords: number
  createdAt: string
  _count: {
    columns: number
  }
}

export default function BoardListPage() {
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [creating, setCreating] = useState(false)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [editBoardName, setEditBoardName] = useState('')
  const [editBoardDescription, setEditBoardDescription] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // Delete confirmation state
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/boards', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch boards')
      const data = await res.json()
      setBoards(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch boards')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return
    
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newBoardName.trim(),
          description: newBoardDescription.trim() || null,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
      }
      
      const newBoard = await res.json()
      setBoards([newBoard, ...boards])
      setShowCreateModal(false)
      setNewBoardName('')
      setNewBoardDescription('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create board')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBoard || !editBoardName.trim()) return
    
    setUpdating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${editingBoard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editBoardName.trim(),
          description: editBoardDescription.trim() || null,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update board')
      }
      
      const updatedBoard = await res.json()
      setBoards(boards.map(b => b.id === updatedBoard.id ? updatedBoard : b))
      setShowEditModal(false)
      setEditingBoard(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update board')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBoard) return
    
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${deletingBoard.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete board')
      }
      
      toast.success('Board deleted')
      setBoards(boards.filter(b => b.id !== deletingBoard.id))
      setDeletingBoard(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete board')
    } finally {
      setDeleting(false)
    }
  }

  const openEditModal = (board: Board) => {
    setEditingBoard(board)
    setEditBoardName(board.name)
    setEditBoardDescription(board.description || '')
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-muted-foreground mt-1">Manage your kanban boards</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Board
        </Button>
      </div>

      {/* Boards grid */}
      {boards.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-4">Create your first kanban board to organize your records</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" />
              Create Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="hover:shadow-md transition cursor-pointer relative group"
            >
              <CardContent
                onClick={() => router.push(`/dashboard/board/${board.id}`)}
                className="p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{board.name}</h3>
                </div>
                
                {board.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{board.description}</p>
                )}
                
                {/* Column preview */}
                <div className="flex gap-1 mb-4">
                  {board.columns.slice(0, 5).map((col) => (
                    <div
                      key={col.id}
                      className="h-2 flex-1 rounded-full"
                      style={{ backgroundColor: col.color }}
                      title={`${col.name}: ${col._count.records} records`}
                    />
                  ))}
                  {board.columns.length > 5 && (
                    <div className="h-2 flex-1 rounded-full bg-muted" title={`+${board.columns.length - 5} more columns`} />
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{board._count.columns} columns</span>
                  <span>{board.totalRecords} records</span>
                </div>
              </CardContent>
              
              {/* Menu button */}
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(board); }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setDeletingBoard(board); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Board</DialogTitle>
            <DialogDescription>Create a new kanban board to organize your records.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="boardName">Board Name *</Label>
              <Input
                id="boardName"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g., Sales Pipeline"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boardDesc">Description</Label>
              <Textarea
                id="boardDesc"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewBoardName('')
                  setNewBoardDescription('')
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newBoardName.trim()}>
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Board'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) { setShowEditModal(false); setEditingBoard(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
            <DialogDescription>Update the board details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editBoardName">Board Name *</Label>
              <Input
                id="editBoardName"
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBoardDesc">Description</Label>
              <Textarea
                id="editBoardDesc"
                value={editBoardDescription}
                onChange={(e) => setEditBoardDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingBoard(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating || !editBoardName.trim()}>
                {updating ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBoard} onOpenChange={(open) => !open && setDeletingBoard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingBoard?.name}</strong>? 
              This will remove all columns and record positions from this board. 
              The records themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete Board'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
