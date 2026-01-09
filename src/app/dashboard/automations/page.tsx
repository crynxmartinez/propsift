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
  Copy,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
      className="flex items-center justify-between px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${automation.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{automation.name}</span>
            {automation.isDraft && !automation.isActive && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Draft</span>
            )}
          </div>
          {automation.description && (
            <p className="text-sm text-muted-foreground truncate max-w-md">{automation.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">{automation.runCount} runs</div>
          <div className="text-xs text-muted-foreground">Last: {formatDate(automation.lastRunAt)}</div>
        </div>

        <button
          onClick={(e) => handleToggleActive(automation, e)}
          className={`p-2 rounded-lg transition ${
            automation.isActive 
              ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          title={automation.isActive ? 'Pause automation' : 'Activate automation'}
        >
          {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={(e) => handleDuplicateAutomation(automation, e)}
          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
          title="Duplicate automation"
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setDeletingAutomation(automation)
          }}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">Create workflows to automate your tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCreateFolderModal(true)}
          >
            <Folder className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => setShowCreateAutomationModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Automation
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Folders and Automations */}
      <div className="space-y-4">
        {/* Folders */}
        {filteredFolders.map((folder) => (
          <Card key={folder.id}>
            {/* Folder Header */}
            <div
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted"
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
                  <span className="font-medium">{folder.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({folder._count.automations} automation{folder._count.automations !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingFolder(folder)
                    setFolderName(folder.name)
                    setFolderColor(folder.color)
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingFolder(folder)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {expandedFolders.has(folder.id) ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Folder Contents */}
            {expandedFolders.has(folder.id) && (
              <CardContent className="p-0">
                {folder.automations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    No automations in this folder
                  </div>
                ) : (
                  folder.automations.map(renderAutomationRow)
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {/* Uncategorized Automations */}
        {filteredUncategorized.length > 0 && (
          <Card>
            <div className="px-4 py-3 bg-muted/50 border-b">
              <span className="font-medium">Uncategorized</span>
              <span className="ml-2 text-sm text-muted-foreground">
                ({filteredUncategorized.length} automation{filteredUncategorized.length !== 1 ? 's' : ''})
              </span>
            </div>
            <CardContent className="p-0">
              {filteredUncategorized.map(renderAutomationRow)}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {filteredFolders.length === 0 && filteredUncategorized.length === 0 && (
          <Card className="p-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No automations yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first automation to start automating your workflows
            </p>
            <Button onClick={() => setShowCreateAutomationModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Automation
            </Button>
          </Card>
        )}
      </div>

      {/* Create Folder Modal */}
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Lead Follow-up"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setFolderColor(color)}
                    className={cn("w-8 h-8 rounded-full border-2", folderColor === color ? 'border-foreground' : 'border-transparent')}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolderModal(false)
                setFolderName('')
                setFolderColor('#6366f1')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Modal */}
      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setFolderColor(color)}
                    className={cn("w-8 h-8 rounded-full border-2", folderColor === color ? 'border-foreground' : 'border-transparent')}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingFolder(null)
                setFolderName('')
                setFolderColor('#6366f1')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFolder}
              disabled={!folderName.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingFolder?.name}&quot;?
              {deletingFolder && deletingFolder._count.automations > 0 && (
                <span className="block mt-2">
                  The {deletingFolder._count.automations} automation(s) in this folder will be moved to Uncategorized.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete Folder'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Automation Modal */}
      <Dialog open={showCreateAutomationModal} onOpenChange={setShowCreateAutomationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Automation Name</Label>
              <Input
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                placeholder="e.g., New Lead Welcome Sequence"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Folder (optional)</Label>
              <Select
                value={automationFolderId || 'none'}
                onValueChange={(value) => setAutomationFolderId(value === 'none' ? null : value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateAutomationModal(false)
                setAutomationName('')
                setAutomationFolderId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAutomation}
              disabled={!automationName.trim() || saving}
            >
              {saving ? 'Creating...' : 'Create & Open Builder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Automation Confirmation */}
      <AlertDialog open={!!deletingAutomation} onOpenChange={(open) => !open && setDeletingAutomation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingAutomation?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAutomation}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Deleting...' : 'Delete Automation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
