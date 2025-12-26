'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Folder, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Play,
  Pause,
  Pencil,
  Trash2,
  Zap,
  Clock,
  Search,
  X,
  Copy
} from 'lucide-react'

interface AutomationFolder {
  id: string
  name: string
  description: string | null
  color: string
  order: number
  automations: Automation[]
  _count: { automations: number }
}

interface Automation {
  id: string
  name: string
  description: string | null
  folderId: string | null
  isActive: boolean
  isDraft: boolean
  runCount: number
  lastRunAt: string | null
  createdAt: string
  folder?: {
    id: string
    name: string
    color: string
  } | null
  _count?: { logs: number }
}

export default function AutomationsPage() {
  const router = useRouter()
  const [folders, setFolders] = useState<AutomationFolder[]>([])
  const [uncategorizedAutomations, setUncategorizedAutomations] = useState<Automation[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [showCreateAutomationModal, setShowCreateAutomationModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<AutomationFolder | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<AutomationFolder | null>(null)
  const [deletingAutomation, setDeletingAutomation] = useState<Automation | null>(null)
  
  // Form state
  const [folderName, setFolderName] = useState('')
  const [folderColor, setFolderColor] = useState('#6366f1')
  const [automationName, setAutomationName] = useState('')
  const [automationFolderId, setAutomationFolderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [foldersRes, automationsRes] = await Promise.all([
        fetch('/api/automation-folders', { headers }),
        fetch('/api/automations?folderId=null', { headers }),
      ])

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json()
        setFolders(foldersData)
        // Expand all folders by default
        setExpandedFolders(new Set(foldersData.map((f: AutomationFolder) => f.id)))
      }

      if (automationsRes.ok) {
        const automationsData = await automationsRes.json()
        setUncategorizedAutomations(automationsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/automation-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: folderName.trim(), color: folderColor }),
      })

      if (res.ok) {
        setShowCreateFolderModal(false)
        setFolderName('')
        setFolderColor('#6366f1')
        fetchData()
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateFolder = async () => {
    if (!editingFolder || !folderName.trim()) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automation-folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: folderName.trim(), color: folderColor }),
      })

      if (res.ok) {
        setEditingFolder(null)
        setFolderName('')
        setFolderColor('#6366f1')
        fetchData()
      }
    } catch (error) {
      console.error('Error updating folder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automation-folders/${deletingFolder.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setDeletingFolder(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAutomation = async () => {
    if (!automationName.trim()) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: automationName.trim(), 
          folderId: automationFolderId 
        }),
      })

      if (res.ok) {
        const automation = await res.json()
        setShowCreateAutomationModal(false)
        setAutomationName('')
        setAutomationFolderId(null)
        // Navigate to the builder
        router.push(`/dashboard/automations/${automation.id}`)
      }
    } catch (error) {
      console.error('Error creating automation:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (automation: Automation, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/automations/${automation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !automation.isActive }),
      })
      fetchData()
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const handleDuplicateAutomation = async (automation: Automation, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automation.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error duplicating automation:', error)
    }
  }

  const handleDeleteAutomation = async () => {
    if (!deletingAutomation) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${deletingAutomation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setDeletingAutomation(null)
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter automations based on search
  const filterAutomations = (automations: Automation[]) => {
    if (!searchQuery.trim()) return automations
    const query = searchQuery.toLowerCase()
    return automations.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query)
    )
  }

  const filteredFolders = folders.map(folder => ({
    ...folder,
    automations: filterAutomations(folder.automations),
  })).filter(folder => 
    folder.automations.length > 0 || 
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUncategorized = filterAutomations(uncategorizedAutomations)

  const renderAutomationRow = (automation: Automation) => (
    <div
      key={automation.id}
      onClick={() => router.push(`/dashboard/automations/${automation.id}`)}
      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${automation.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{automation.name}</span>
            {automation.isDraft && !automation.isActive && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Draft</span>
            )}
          </div>
          {automation.description && (
            <p className="text-sm text-gray-500 truncate max-w-md">{automation.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-sm text-gray-600">{automation.runCount} runs</div>
          <div className="text-xs text-gray-400">Last: {formatDate(automation.lastRunAt)}</div>
        </div>

        <button
          onClick={(e) => handleToggleActive(automation, e)}
          className={`p-2 rounded-lg transition ${
            automation.isActive 
              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={automation.isActive ? 'Pause automation' : 'Activate automation'}
        >
          {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={(e) => handleDuplicateAutomation(automation, e)}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="Duplicate automation"
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setDeletingAutomation(automation)
          }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Delete automation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-gray-500">Create workflows to automate your tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Folder className="w-4 h-4" />
            New Folder
          </button>
          <button
            onClick={() => setShowCreateAutomationModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Folders and Automations */}
      <div className="space-y-4">
        {/* Folders */}
        {filteredFolders.map((folder) => (
          <div key={folder.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Folder Header */}
            <div
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: folder.color + '20' }}
                >
                  {expandedFolders.has(folder.id) ? (
                    <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                  ) : (
                    <Folder className="w-4 h-4" style={{ color: folder.color }} />
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{folder.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({folder._count.automations} automation{folder._count.automations !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingFolder(folder)
                    setFolderName(folder.name)
                    setFolderColor(folder.color)
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingFolder(folder)
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedFolders.has(folder.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Folder Contents */}
            {expandedFolders.has(folder.id) && (
              <div>
                {folder.automations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No automations in this folder
                  </div>
                ) : (
                  folder.automations.map(renderAutomationRow)
                )}
              </div>
            )}
          </div>
        ))}

        {/* Uncategorized Automations */}
        {filteredUncategorized.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="font-medium text-gray-700">Uncategorized</span>
              <span className="ml-2 text-sm text-gray-500">
                ({filteredUncategorized.length} automation{filteredUncategorized.length !== 1 ? 's' : ''})
              </span>
            </div>
            {filteredUncategorized.map(renderAutomationRow)}
          </div>
        )}

        {/* Empty State */}
        {filteredFolders.length === 0 && filteredUncategorized.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No automations yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first automation to start automating your workflows
            </p>
            <button
              onClick={() => setShowCreateAutomationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Automation
            </button>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create Folder</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Lead Follow-up"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setFolderColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${folderColor === color ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateFolderModal(false)
                  setFolderName('')
                  setFolderColor('#6366f1')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Folder</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setFolderColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${folderColor === color ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setFolderName('')
                  setFolderColor('#6366f1')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFolder}
                disabled={!folderName.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation */}
      {deletingFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">Delete Folder</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{deletingFolder.name}&quot;? 
              {deletingFolder._count.automations > 0 && (
                <span className="block mt-2 text-sm">
                  The {deletingFolder._count.automations} automation(s) in this folder will be moved to Uncategorized.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingFolder(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFolder}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Automation Modal */}
      {showCreateAutomationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create Automation</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="e.g., New Lead Welcome Sequence"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder (optional)
                </label>
                <select
                  value={automationFolderId || ''}
                  onChange={(e) => setAutomationFolderId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateAutomationModal(false)
                  setAutomationName('')
                  setAutomationFolderId(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAutomation}
                disabled={!automationName.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create & Open Builder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Automation Confirmation */}
      {deletingAutomation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">Delete Automation</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{deletingAutomation.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingAutomation(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAutomation}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete Automation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
