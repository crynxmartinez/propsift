'use client'

import { useState, useEffect } from 'react'
import { CircleDot, Plus, Pencil, Trash2, X, Check, Loader2, MoreVertical, GripVertical, ExternalLink } from 'lucide-react'

interface StatusItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  order: number
  recordCount: number
  createdAt: string
  updatedAt: string
}

const COLOR_PALETTE = [
  '#3B82F6', '#60A5FA', '#6B7280', '#9CA3AF', '#374151', '#8B5CF6',
  '#1E40AF', '#0EA5E9', '#94A3B8', '#A78BFA', '#D946EF', '#F97316',
  '#1D4ED8', '#06B6D4', '#CBD5E1', '#C084FC', '#FBBF24', '#EF4444',
  '#2563EB', '#14B8A6', '#E2E8F0', '#F472B6', '#FCD34D', '#DC2626',
  '#3B82F6', '#10B981', '#F1F5F9', '#EC4899', '#22C55E', '#991B1B',
]

export default function StatusesPage() {
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomOnly, setShowCustomOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null)
  const [statusName, setStatusName] = useState('')
  const [statusColor, setStatusColor] = useState(COLOR_PALETTE[0])
  const [saving, setSaving] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<StatusItem | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/statuses')
      if (!res.ok) throw new Error('Failed to fetch statuses')
      const data = await res.json()
      setStatuses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statuses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
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

  const showMessage = (type: 'error' | 'success', message: string) => {
    if (type === 'error') {
      setError(message)
      setSuccess(null)
    } else {
      setSuccess(message)
      setError(null)
    }
    setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 3000)
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingStatus(null)
    setStatusName('')
    setStatusColor(COLOR_PALETTE[0])
    setShowModal(true)
  }

  const openEditModal = (status: StatusItem) => {
    setModalMode('edit')
    setEditingStatus(status)
    setStatusName(status.name)
    setStatusColor(status.color)
    setShowModal(true)
    setOpenMenuId(null)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingStatus(null)
    setStatusName('')
    setStatusColor(COLOR_PALETTE[0])
  }

  const handleSave = async () => {
    if (!statusName.trim()) return

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: statusName.trim(), color: statusColor })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create status')
        }

        showMessage('success', 'Status created successfully')
      } else if (editingStatus) {
        const res = await fetch(`/api/statuses/${editingStatus.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: statusName.trim(), color: statusColor })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update status')
        }

        showMessage('success', 'Status updated successfully')
      }

      closeModal()
      fetchStatuses()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to save status')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (status: StatusItem) => {
    setTogglingId(status.id)
    try {
      const res = await fetch(`/api/statuses/${status.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !status.isActive })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      fetchStatuses()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    setDeletingId(deleteConfirm.id)
    try {
      const res = await fetch(`/api/statuses/${deleteConfirm.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete status')
      }

      showMessage('success', 'Status deleted successfully')
      fetchStatuses()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to delete status')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, statusId: string) => {
    setDraggedId(statusId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const draggedIndex = statuses.findIndex(s => s.id === draggedId)
    const targetIndex = statuses.findIndex(s => s.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    const newStatuses = [...statuses]
    const [draggedItem] = newStatuses.splice(draggedIndex, 1)
    newStatuses.splice(targetIndex, 0, draggedItem)

    setStatuses(newStatuses)
    setDraggedId(null)

    try {
      const orderedIds = newStatuses.map(s => s.id)
      const res = await fetch('/api/statuses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      })

      if (!res.ok) {
        throw new Error('Failed to save order')
      }
    } catch (err) {
      showMessage('error', 'Failed to save order')
      fetchStatuses()
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const filteredStatuses = showCustomOnly
    ? statuses.filter(s => !s.isDefault)
    : statuses

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Statuses</h1>
          <p className="text-gray-500 mt-1">Manage status labels for your properties</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <button
              onClick={() => setShowCustomOnly(!showCustomOnly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showCustomOnly ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showCustomOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            Only show my custom statuses
          </label>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Custom Status
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`mb-6 p-4 rounded-lg ${
          error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {error || success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-500 mt-2">Loading statuses...</p>
          </div>
        ) : filteredStatuses.length === 0 ? (
          <div className="p-12 text-center">
            <CircleDot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No statuses found</p>
            <p className="text-sm text-gray-400">
              {showCustomOnly ? 'Create your first custom status' : 'No statuses available'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-2 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStatuses.map((status) => (
                <tr
                  key={status.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, status.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status.id)}
                  onDragEnd={handleDragEnd}
                  className={`hover:bg-gray-50 ${draggedId === status.id ? 'opacity-50' : ''}`}
                >
                  <td className="w-10 px-2 py-4">
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-5 h-5" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${status.isDefault ? 'text-gray-500' : 'text-blue-600'}`}>
                      {status.isDefault ? '⚙️ System' : '👤 Custom'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-blue-600">
                        {status.recordCount} {status.recordCount === 1 ? 'property' : 'properties'}
                      </span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        See Properties <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggle(status)}
                      disabled={togglingId === status.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        status.isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      {togglingId === status.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            status.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                    <span className={`ml-2 text-xs ${status.isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {status.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative" data-menu-container>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === status.id ? null : status.id)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openMenuId === status.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => openEditModal(status)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                          {!status.isDefault && (
                            <button
                              onClick={() => {
                                setDeleteConfirm(status)
                                setOpenMenuId(null)
                              }}
                              disabled={deletingId === status.id}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              {deletingId === status.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'New Custom Status' : 'Edit Status'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Status Name
                </label>
                <input
                  type="text"
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  placeholder="Brand New Lead"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Status Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PALETTE.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setStatusColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                        statusColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !statusName.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {modalMode === 'create' ? 'Create Status' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Status</h2>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-medium" style={{ color: deleteConfirm.color }}>"{deleteConfirm.name}"</span>? This action cannot be undone.
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
