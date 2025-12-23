'use client'

import { useState, useEffect } from 'react'
import { Zap, Plus, Pencil, Trash2, X, Check, Loader2, ExternalLink } from 'lucide-react'

interface MotivationItem {
  id: string
  name: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

export default function MotivationsPage() {
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newMotivationName, setNewMotivationName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchMotivations = async () => {
    try {
      const res = await fetch('/api/motivations')
      if (!res.ok) throw new Error('Failed to fetch motivations')
      const data = await res.json()
      setMotivations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch motivations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMotivations()
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMotivationName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/motivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMotivationName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create motivation')
      }

      setNewMotivationName('')
      showMessage('success', 'Motivation created successfully')
      fetchMotivations()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to create motivation')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/motivations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update motivation')
      }

      setEditingId(null)
      setEditingName('')
      showMessage('success', 'Motivation updated successfully')
      fetchMotivations()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to update motivation')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/motivations/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete motivation')
      }

      showMessage('success', 'Motivation deleted successfully')
      fetchMotivations()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to delete motivation')
    } finally {
      setDeletingId(null)
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

      {(error || success) && (
        <div className={`mb-6 p-4 rounded-lg ${
          error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {error || success}
        </div>
      )}

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
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {motivations.map((motivation) => (
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
                    <div className="flex items-center gap-4">
                      <button className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                        See Breakdown <ExternalLink className="w-3 h-3" />
                      </button>
                      <button className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                        See Properties <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEditing(motivation)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(motivation.id)}
                          disabled={deletingId === motivation.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          {deletingId === motivation.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
