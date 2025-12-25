'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Edit2, Trash2, LayoutGrid } from 'lucide-react'

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
  const [error, setError] = useState('')
  
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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
      setError(err instanceof Error ? err.message : 'Failed to fetch boards')
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
      setError(err instanceof Error ? err.message : 'Failed to create board')
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
      setError(err instanceof Error ? err.message : 'Failed to update board')
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
      
      setBoards(boards.filter(b => b.id !== deletingBoard.id))
      setShowDeleteModal(false)
      setDeletingBoard(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board')
    } finally {
      setDeleting(false)
    }
  }

  const openEditModal = (board: Board) => {
    setEditingBoard(board)
    setEditBoardName(board.name)
    setEditBoardDescription(board.description || '')
    setShowEditModal(true)
    setOpenMenuId(null)
  }

  const openDeleteModal = (board: Board) => {
    setDeletingBoard(board)
    setShowDeleteModal(true)
    setOpenMenuId(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
          <p className="text-gray-500 mt-1">Manage your kanban boards</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Create Board
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Boards grid */}
      {boards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
          <p className="text-gray-500 mb-4">Create your first kanban board to organize your records</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer relative group"
            >
              {/* Card content - clickable */}
              <div
                onClick={() => router.push(`/dashboard/board/${board.id}`)}
                className="p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{board.name}</h3>
                </div>
                
                {board.description && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{board.description}</p>
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
                    <div className="h-2 flex-1 rounded-full bg-gray-300" title={`+${board.columns.length - 5} more columns`} />
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{board._count.columns} columns</span>
                  <span>{board.totalRecords} records</span>
                </div>
              </div>
              
              {/* Menu button */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === board.id ? null : board.id)
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
                
                {/* Dropdown menu */}
                {openMenuId === board.id && (
                  <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(board)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteModal(board)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Board</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g., Sales Pipeline"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewBoardName('')
                    setNewBoardDescription('')
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {creating ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Board</h2>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={editBoardName}
                  onChange={(e) => setEditBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editBoardDescription}
                  onChange={(e) => setEditBoardDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingBoard(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editBoardName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Board</h2>
              <p className="text-gray-600">
                Are you sure you want to delete <strong>{deletingBoard.name}</strong>? 
                This will remove all columns and record positions from this board. 
                The records themselves will not be deleted.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingBoard(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting...' : 'Delete Board'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  )
}
