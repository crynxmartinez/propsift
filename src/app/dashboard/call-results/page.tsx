'use client'

import { useState, useEffect } from 'react'
import { PhoneCall, Plus, Pencil, Trash2, Loader2, MoreVertical, GripVertical, ExternalLink, Check } from 'lucide-react'
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

interface CallResultItem {
  id: string
  name: string
  color: string
  isDefault: boolean
  isActive: boolean
  order: number
  resultType: string
  recordCount: number
  createdAt: string
  updatedAt: string
}

const RESULT_TYPE_OPTIONS = [
  { value: 'NO_CONTACT', label: 'No Contact', description: 'Advance to next cadence step (No Answer, Voicemail)' },
  { value: 'RETRY', label: 'Retry', description: 'Stay on same step, retry tomorrow (Busy)' },
  { value: 'CONTACT_MADE', label: 'Contact Made', description: 'Spoke with them - prompt for status (Answered)' },
  { value: 'BAD_DATA', label: 'Bad Data', description: 'Phone is bad - move to Get Numbers (Wrong Number)' },
  { value: 'TERMINAL', label: 'Terminal', description: 'Exit permanently - never contact again (DNC)' },
]

const COLOR_PALETTE = [
  '#6B7280', '#3B82F6', '#F59E0B', '#EF4444', '#22C55E', '#F97316',
  '#991B1B', '#8B5CF6', '#06B6D4', '#10B981', '#EC4899', '#14B8A6',
  '#1D4ED8', '#DC2626', '#059669', '#D946EF', '#0EA5E9', '#84CC16',
  '#7C3AED', '#F43F5E', '#0D9488', '#A855F7', '#2563EB', '#65A30D',
]

export default function CallResultsPage() {
  const [callResults, setCallResults] = useState<CallResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingCallResult, setEditingCallResult] = useState<CallResultItem | null>(null)
  const [callResultName, setCallResultName] = useState('')
  const [callResultColor, setCallResultColor] = useState(COLOR_PALETTE[0])
  const [callResultType, setCallResultType] = useState('NO_CONTACT')
  const [saving, setSaving] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<CallResultItem | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const fetchCallResults = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/call-results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch call results')
      const data = await res.json()
      setCallResults(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch call results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallResults()
  }, [])

  const openCreateModal = () => {
    setModalMode('create')
    setEditingCallResult(null)
    setCallResultName('')
    setCallResultColor(COLOR_PALETTE[0])
    setCallResultType('NO_CONTACT')
    setShowModal(true)
  }

  const openEditModal = (callResult: CallResultItem) => {
    setModalMode('edit')
    setEditingCallResult(callResult)
    setCallResultName(callResult.name)
    setCallResultColor(callResult.color)
    setCallResultType(callResult.resultType || 'NO_CONTACT')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCallResult(null)
    setCallResultName('')
    setCallResultColor(COLOR_PALETTE[0])
    setCallResultType('NO_CONTACT')
  }

  const handleSave = async () => {
    if (!callResultName.trim()) return

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/call-results', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: callResultName.trim(), 
            color: callResultColor,
            resultType: callResultType
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to create call result')
        }

        toast.success('Call result created successfully')
      } else if (editingCallResult) {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/call-results/${editingCallResult.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: callResultName.trim(), 
            color: callResultColor,
            resultType: callResultType
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update call result')
        }

        toast.success('Call result updated successfully')
      }

      closeModal()
      fetchCallResults()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save call result')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (callResult: CallResultItem) => {
    setTogglingId(callResult.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/call-results/${callResult.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !callResult.isActive })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update call result')
      }

      fetchCallResults()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update call result')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    setDeletingId(deleteConfirm.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/call-results/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete call result')
      }

      toast.success('Call result deleted successfully')
      fetchCallResults()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete call result')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, callResultId: string) => {
    setDraggedId(callResultId)
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

    const draggedIndex = callResults.findIndex(s => s.id === draggedId)
    const targetIndex = callResults.findIndex(s => s.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    const newCallResults = [...callResults]
    const [draggedItem] = newCallResults.splice(draggedIndex, 1)
    newCallResults.splice(targetIndex, 0, draggedItem)

    setCallResults(newCallResults)
    setDraggedId(null)

    try {
      const orderedIds = newCallResults.map(s => s.id)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/call-results/reorder', {
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
      fetchCallResults()
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const filteredCallResults = showCustomOnly
    ? callResults.filter(s => !s.isDefault)
    : callResults

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Results</h1>
          <p className="text-muted-foreground mt-1">Manage call result labels for your records</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showCustomOnly}
              onCheckedChange={setShowCustomOnly}
            />
            <Label className="text-sm text-muted-foreground cursor-pointer">
              Only show my custom call results
            </Label>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            Create Custom Call Result
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading call results...</p>
            </div>
          ) : filteredCallResults.length === 0 ? (
            <div className="p-12 text-center">
              <PhoneCall className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No call results found</p>
              <p className="text-sm text-muted-foreground/70">
                {showCustomOnly ? 'Create your first custom call result' : 'No call results available'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-1/5">Call Result</TableHead>
                  <TableHead className="w-1/6">Created By</TableHead>
                  <TableHead className="w-1/6">Records</TableHead>
                  <TableHead className="w-1/5"></TableHead>
                  <TableHead className="w-1/6 text-right">Active</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCallResults.map((callResult) => (
                  <TableRow
                    key={callResult.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, callResult.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, callResult.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(draggedId === callResult.id && 'opacity-50')}
                  >
                    <TableCell className="w-10 px-2">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: callResult.color }}
                      >
                        {callResult.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={callResult.isDefault ? "secondary" : "info"}>
                        {callResult.isDefault ? '⚙️ System' : '👤 Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-primary">
                        {callResult.recordCount} {callResult.recordCount === 1 ? 'record' : 'records'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        See Records <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={callResult.isActive}
                          onCheckedChange={() => handleToggle(callResult)}
                          disabled={togglingId === callResult.id}
                        />
                        <span className={cn("text-xs", callResult.isActive ? "text-primary" : "text-muted-foreground")}>
                          {callResult.isActive ? 'Active' : 'Inactive'}
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
                          <DropdownMenuItem onClick={() => openEditModal(callResult)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!callResult.isDefault && (
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(callResult)}
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
              {modalMode === 'create' ? 'New Custom Call Result' : 'Edit Call Result'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'create' ? 'Create a new custom call result for your records.' : 'Update the call result details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Call Result Name</Label>
              <Input
                value={callResultName}
                onChange={(e) => setCallResultName(e.target.value)}
                placeholder="e.g., Busy Signal"
              />
            </div>

            <div className="space-y-2">
              <Label>Call Result Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_PALETTE.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setCallResultColor(color)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-transform hover:scale-110",
                      callResultColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cadence Behavior</Label>
              <Select value={callResultType} onValueChange={setCallResultType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULT_TYPE_OPTIONS.map((option) => (
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !callResultName.trim()}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {modalMode === 'create' ? 'Create Call Result' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium" style={{ color: deleteConfirm?.color }}>"{deleteConfirm?.name}"</span>? This action cannot be undone.
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
