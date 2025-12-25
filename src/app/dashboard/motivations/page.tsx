'use client'

import { useState, useEffect, useMemo } from 'react'
import { Zap, Plus, Pencil, Trash2, X, Check, Loader2, ExternalLink, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface MotivationItem {
  id: string
  name: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

export default function MotivationsPage() {
  const { showToast } = useToast()
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newMotivationName, setNewMotivationName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MotivationItem | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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
      showToast(err instanceof Error ? err.message : 'Failed to fetch motivations', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMotivations()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-menu-container]')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
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
      showToast('Motivation created successfully', 'success')
      fetchMotivations()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create motivation', 'error')
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
      showToast('Motivation updated successfully', 'success')
      fetchMotivations()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update motivation', 'error')
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

      showToast('Motivation deleted successfully', 'success')
      fetchMotivations()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete motivation', 'error')
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Motivations</h1>
        <p className="text-gray-500 mt-1">Manage your property motivations</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Create New Motivation</h2>
            <p className="text-sm text-gray-500">Add a new motivation to categorize your properties</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newMotivationName}
            onChange={(e) => setNewMotivationName(e.target.value)}
            placeholder="Enter motivation name"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newMotivationName.trim()}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 transition disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Create
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">All Motivations</h2>
              <p className="text-sm text-gray-500">{motivations.length} motivation{motivations.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-gray-500 mt-2">Loading motivations...</p>
          </div>
        ) : motivations.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No motivations yet</p>
            <p className="text-sm text-gray-400">Create your first motivation above</p>
          </div>
        ) : (
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="w-16 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedMotivations.map((motivation) => (
                <tr key={motivation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingId === motivation.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{motivation.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      motivation.recordCount > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {motivation.recordCount} record{motivation.recordCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                      See Breakdown <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                      See Properties <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === motivation.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdate(motivation.id)}
                          disabled={updating || !editingName.trim()}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative" data-menu-container>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === motivation.id ? null : motivation.id)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openMenuId === motivation.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                startEditing(motivation)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirm(motivation)
                                setOpenMenuId(null)
                              }}
                              disabled={deletingId === motivation.id}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              {deletingId === motivation.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, motivations.length)} of {motivations.length} motivations
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Motivation</h2>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-medium">"{deleteConfirm.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === deleteConfirm.id}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId === deleteConfirm.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
