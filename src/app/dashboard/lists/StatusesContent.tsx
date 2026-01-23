'use client'

import { useState, useEffect } from 'react'
import { CircleDot, Plus, Pencil, Trash2, Loader2, MoreVertical, GripVertical, ExternalLink, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { cn } from '@/lib/utils'

interface StatusItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  order: number
  workability: string
  temperatureEffect: string | null
  recordCount: number
  createdAt: string
  updatedAt: string
}

const WORKABILITY_OPTIONS = [
  { value: 'WORKABLE', label: 'Workable', description: 'Can be contacted, stays in cadence' },
  { value: 'PAUSED', label: 'Paused', description: 'Temporarily on hold (e.g., callback scheduled)' },
  { value: 'CLOSED_WON', label: 'Closed Won', description: 'Deal success - exits cadence' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', description: 'Not viable - moves to Long Term Nurture' },
  { value: 'DNC', label: 'Do Not Contact', description: 'Exit permanently - never contact again' },
]

const TEMPERATURE_EFFECT_OPTIONS = [
  { value: '', label: 'No Change', description: 'Temperature stays the same' },
  { value: 'UPGRADE', label: 'Upgrade', description: 'Move up one level (e.g., COLD → WARM)' },
  { value: 'DOWNGRADE', label: 'Downgrade', description: 'Move down one level (e.g., HOT → WARM)' },
]

const COLOR_PALETTE = [
  '#3B82F6', '#60A5FA', '#6B7280', '#9CA3AF', '#374151', '#8B5CF6',
  '#1E40AF', '#0EA5E9', '#94A3B8', '#A78BFA', '#D946EF', '#F97316',
  '#1D4ED8', '#06B6D4', '#CBD5E1', '#C084FC', '#FBBF24', '#EF4444',
  '#2563EB', '#14B8A6', '#E2E8F0', '#F472B6', '#FCD34D', '#DC2626',
  '#3B82F6', '#10B981', '#F1F5F9', '#EC4899', '#22C55E', '#991B1B',
]

export default function StatusesContent() {
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null)
  const [statusName, setStatusName] = useState('')
  const [statusColor, setStatusColor] = useState(COLOR_PALETTE[0])
  const [statusWorkability, setStatusWorkability] = useState('WORKABLE')
  const [statusTempEffect, setStatusTempEffect] = useState('')
  const [saving, setSaving] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<StatusItem | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/statuses', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch statuses')
      const data = await res.json()
      setStatuses(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch statuses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
  }, [])

  const openCreateModal = () => {
    setModalMode('create')
    setEditingStatus(null)
    setStatusName('')
    setStatusColor(COLOR_PALETTE[0])
    setStatusWorkability('WORKABLE')
    setStatusTempEffect('')
    setShowModal(true)
  }

  const openEditModal = (status: StatusItem) => {
    setModalMode('edit')
    setEditingStatus(status)
    setStatusName(status.name)
    setStatusColor(status.color)
    setStatusWorkability(status.workability || 'WORKABLE')
    setStatusTempEffect(status.temperatureEffect || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingStatus(null)
    setStatusName('')
    setStatusColor(COLOR_PALETTE[0])
    setStatusWorkability('WORKABLE')
    setStatusTempEffect('')
  }

  const handleSave = async () => {
    if (!statusName.trim()) return

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/statuses', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: statusName.trim(), 
            color: statusColor,
            workability: statusWorkability,
            temperatureEffect: statusTempEffect || null
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create status')
        }

        toast.success('Status created successfully')
      } else if (editingStatus) {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/statuses/${editingStatus.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: statusName.trim(), 
            color: statusColor,
            workability: statusWorkability,
            temperatureEffect: statusTempEffect || null
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update status')
        }

        toast.success('Status updated successfully')
      }

      closeModal()
      fetchStatuses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save status')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (status: StatusItem) => {
    setTogglingId(status.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/statuses/${status.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !status.isActive })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      fetchStatuses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    setDeletingId(deleteConfirm.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/statuses/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete status')
      }

      toast.success('Status deleted successfully')
      fetchStatuses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete status')
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
      const token = localStorage.getItem('token')
      const res = await fetch('/api/statuses/reorder', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderedIds })
      })

      if (!res.ok) {
        throw new Error('Failed to save order')
      }
    } catch (err) {
      toast.error('Failed to save order')
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showCustomOnly}
              onCheckedChange={setShowCustomOnly}
            />
            <Label className="text-sm text-muted-foreground cursor-pointer">
              Only show my custom statuses
            </Label>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Create Custom Status
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading statuses...</p>
            </div>
          ) : filteredStatuses.length === 0 ? (
            <div className="p-12 text-center">
              <CircleDot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No statuses found</p>
              <p className="text-sm text-muted-foreground/70">
                {showCustomOnly ? 'Create your first custom status' : 'No statuses available'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-1/5">Status Name</TableHead>
                  <TableHead className="w-1/6">Created By</TableHead>
                  <TableHead className="w-1/6">Properties</TableHead>
                  <TableHead className="w-1/5"></TableHead>
                  <TableHead className="w-1/6 text-right">Active</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStatuses.map((status) => (
                  <TableRow
                    key={status.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, status.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(draggedId === status.id && 'opacity-50')}
                  >
                    <TableCell className="w-10 px-2">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: status.color }}
                      >
                        {status.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.isDefault ? "secondary" : "info"}>
                        {status.isDefault ? '⚙️ System' : '👤 Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-primary">
                        {status.recordCount} {status.recordCount === 1 ? 'property' : 'properties'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        See Properties <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={status.isActive}
                          onCheckedChange={() => handleToggle(status)}
                          disabled={togglingId === status.id}
                        />
                        <span className={cn("text-xs", status.isActive ? "text-primary" : "text-muted-foreground")}>
                          {status.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(status)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!status.isDefault && (
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(status)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'New Custom Status' : 'Edit Status'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'create' ? 'Create a new custom status for your properties.' : 'Update the status details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Status Name</Label>
              <Input
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                placeholder="Brand New Lead"
              />
            </div>

            <div className="space-y-2">
              <Label>Status Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setStatusColor(color)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-transform hover:scale-110",
                      statusColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cadence Behavior</Label>
              <Select value={statusWorkability} onValueChange={setStatusWorkability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKABILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperature Effect</Label>
              <Select value={statusTempEffect} onValueChange={setStatusTempEffect}>
                <SelectTrigger>
                  <SelectValue placeholder="No Change" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPERATURE_EFFECT_OPTIONS.map((option) => (
                    <SelectItem key={option.value || 'none'} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !statusName.trim()}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {modalMode === 'create' ? 'Create Status' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium" style={{ color: deleteConfirm?.color }}>&quot;{deleteConfirm?.name}&quot;</span>? This action cannot be undone.
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
