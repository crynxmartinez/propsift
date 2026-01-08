'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Phone,
  GripVertical,
  X,
  Eye,
  Snowflake,
  Package,
  Pencil,
  CheckSquare,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RecordDetailPanel from '@/components/RecordDetailPanel'

interface RecordTag {
  id: string
  tag: {
    id: string
    name: string
  }
}

interface PhoneNumber {
  id: string
  number: string
  type: string
}

interface Status {
  id: string
  name: string
  color: string
}

interface AssignedTo {
  id: string
  name: string | null
  email: string
}

interface Record {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  status: Status | null
  assignedTo: AssignedTo | null
  recordTags: RecordTag[]
  phoneNumbers: PhoneNumber[]
  isComplete: boolean
  temperature: string | null
  tasks?: { id: string; status: string }[]
}

interface RecordPosition {
  id: string
  recordId: string
  columnId: string
  order: number
  record: Record
}

interface BoardColumn {
  id: string
  name: string
  color: string
  order: number
  records: RecordPosition[]
}

interface Board {
  id: string
  name: string
  description: string | null
  columns: BoardColumn[]
}

// Sortable Card Component
function SortableCard({ 
  position, 
  onClick,
  onToggleComplete
}: { 
  position: RecordPosition
  onClick: () => void
  onToggleComplete: (recordId: string, isComplete: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const record = position.record
  
  // Guard against undefined record (e.g., if record was deleted)
  if (!record) {
    return null
  }
  
  const completedTasks = record.tasks?.filter(t => t.status === 'COMPLETED').length || 0
  const totalTasks = record.tasks?.length || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer group"
    >
      {/* Status color bar */}
      <div 
        className="h-2 rounded-t-lg" 
        style={{ backgroundColor: record.status?.color || '#e5e7eb' }}
      />
      
      <div className="p-3">
        {/* Header row with checkbox, name, and eye icon */}
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete(record.id, !record.isComplete)
            }}
            className="mt-0.5 flex-shrink-0"
          >
            {record.isComplete ? (
              <CheckSquare className="w-4 h-4 text-green-600" />
            ) : (
              <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          
          {/* Name and address */}
          <div className="flex-1 min-w-0" onClick={onClick}>
            <h4 className="font-medium text-gray-900 text-sm truncate">
              {record.ownerFullName}
            </h4>
            {record.propertyStreet && (
              <p className="text-xs text-blue-600 truncate">
                {record.propertyStreet}
                {record.propertyCity && `, ${record.propertyCity}`}
                {record.propertyState && ` ${record.propertyState}`}
                {record.propertyZip && ` ${record.propertyZip}`}
              </p>
            )}
          </div>
          
          {/* Eye icon and drag handle */}
          <div className="flex items-center gap-1">
            <button
              onClick={onClick}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition"
            >
              <Eye className="w-4 h-4 text-blue-500" />
            </button>
            <button
              {...attributes}
              {...listeners}
              className="p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Phone */}
        {record.phoneNumbers?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{record.phoneNumbers[0].number}</span>
          </div>
        )}

        {/* Bottom row: icons and task progress */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          {/* Temperature and other icons */}
          <div className="flex items-center gap-2">
            {record.temperature === 'cold' && (
              <span title="Cold">
                <Snowflake className="w-4 h-4 text-blue-400" />
              </span>
            )}
            {record.temperature === 'warm' && (
              <span title="Warm">
                <Package className="w-4 h-4 text-orange-400" />
              </span>
            )}
            {record.temperature === 'hot' && (
              <span title="Hot">
                <Pencil className="w-4 h-4 text-red-400" />
              </span>
            )}
            {record.recordTags?.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {record.recordTags.length} tags
              </span>
            )}
          </div>
          
          {/* Task progress */}
          {totalTasks > 0 && (
            <span className="text-xs text-gray-500">
              {completedTasks}/{totalTasks}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Card overlay for dragging
function CardOverlay({ position }: { position: RecordPosition }) {
  const record = position.record
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-64">
      <div 
        className="h-1.5 rounded-t-lg" 
        style={{ backgroundColor: record.status?.color || '#e5e7eb' }}
      />
      <div className="p-3">
        <h4 className="font-medium text-gray-900 text-sm truncate">
          {record.ownerFullName}
        </h4>
        {record.propertyStreet && (
          <p className="text-xs text-gray-500 truncate">
            {record.propertyStreet}
          </p>
        )}
      </div>
    </div>
  )
}

export default function BoardDetailPage() {
  const router = useRouter()
  const params = useParams()
  const boardId = params.id as string

  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Column management
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)

  // Column edit/delete
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editColumnName, setEditColumnName] = useState('')
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null)

  // Add record modal
  const [showAddRecordModal, setShowAddRecordModal] = useState(false)
  const [addToColumnId, setAddToColumnId] = useState<string | null>(null)
  const [availableRecords, setAvailableRecords] = useState<Record[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingRecords, setLoadingRecords] = useState(false)

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)

  // Record detail panel
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchBoard()
  }, [boardId])

  const fetchBoard = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch board')
      const data = await res.json()
      setBoard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch board')
    } finally {
      setLoading(false)
    }
  }

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColumnName.trim()) return

    setAddingColumn(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newColumnName.trim() }),
      })

      if (!res.ok) throw new Error('Failed to add column')
      
      const newColumn = await res.json()
      setBoard(prev => prev ? {
        ...prev,
        columns: [...prev.columns, { ...newColumn, records: [] }],
      } : null)
      setNewColumnName('')
      setShowAddColumn(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add column')
    } finally {
      setAddingColumn(false)
    }
  }

  const handleUpdateColumn = async (columnId: string) => {
    if (!editColumnName.trim()) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editColumnName.trim() }),
      })

      if (!res.ok) throw new Error('Failed to update column')

      setBoard(prev => prev ? {
        ...prev,
        columns: prev.columns.map(col => 
          col.id === columnId ? { ...col, name: editColumnName.trim() } : col
        ),
      } : null)
      setEditingColumnId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update column')
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    if (!confirm('Delete this column? Records will be removed from this board but not deleted.')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/columns/${columnId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to delete column')

      setBoard(prev => prev ? {
        ...prev,
        columns: prev.columns.filter(col => col.id !== columnId),
      } : null)
      setColumnMenuId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete column')
    }
  }

  const fetchAvailableRecords = async () => {
    setLoadingRecords(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/records?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch records')
      const data = await res.json()
      // Map records to include empty arrays for missing fields
      const records = (data.records || []).map((r: { id: string; ownerFullName: string; propertyStreet?: string | null; propertyCity?: string | null; propertyState?: string | null; propertyZip?: string | null; status?: Status | null; assignedTo?: AssignedTo | null; recordTags?: RecordTag[]; phoneNumbers?: PhoneNumber[]; isComplete?: boolean; temperature?: string | null; tasks?: { id: string; status: string }[] }) => ({
        id: r.id,
        ownerFullName: r.ownerFullName,
        propertyStreet: r.propertyStreet || null,
        propertyCity: r.propertyCity || null,
        propertyState: r.propertyState || null,
        propertyZip: r.propertyZip || null,
        status: r.status || null,
        assignedTo: r.assignedTo || null,
        recordTags: r.recordTags || [],
        phoneNumbers: r.phoneNumbers || [],
        isComplete: r.isComplete || false,
        temperature: r.temperature || null,
        tasks: r.tasks || [],
      }))
      setAvailableRecords(records)
    } catch (err) {
      console.error('Failed to fetch records:', err)
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleAddRecord = async (recordId: string) => {
    if (!addToColumnId) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, columnId: addToColumnId }),
      })

      if (!res.ok) throw new Error('Failed to add record')

      const newPosition = await res.json()
      setBoard(prev => prev ? {
        ...prev,
        columns: prev.columns.map(col => 
          col.id === addToColumnId 
            ? { ...col, records: [...col.records, newPosition] }
            : col
        ),
      } : null)
      setShowAddRecordModal(false)
      setAddToColumnId(null)
      setSearchQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add record')
    }
  }

  const handleRemoveRecord = async (positionId: string, columnId: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/records?positionId=${positionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Failed to remove record')

      setBoard(prev => prev ? {
        ...prev,
        columns: prev.columns.map(col => 
          col.id === columnId 
            ? { ...col, records: col.records.filter(r => r.id !== positionId) }
            : col
        ),
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove record')
    }
  }

  const findColumn = (id: string) => {
    return board?.columns.find(col => 
      col.id === id || col.records.some(r => r.id === id)
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || !board) return

    const activeColumn = findColumn(active.id as string)
    const overColumn = findColumn(over.id as string)

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return

    setBoard(prev => {
      if (!prev) return null

      const activeRecord = activeColumn.records.find(r => r.id === active.id)
      if (!activeRecord) return prev

      return {
        ...prev,
        columns: prev.columns.map(col => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              records: col.records.filter(r => r.id !== active.id),
            }
          }
          if (col.id === overColumn.id) {
            const overIndex = col.records.findIndex(r => r.id === over.id)
            const newRecords = [...col.records]
            if (overIndex >= 0) {
              newRecords.splice(overIndex, 0, { ...activeRecord, columnId: col.id })
            } else {
              newRecords.push({ ...activeRecord, columnId: col.id })
            }
            return { ...col, records: newRecords }
          }
          return col
        }),
      }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || !board) return

    const overColumn = findColumn(over.id as string)
    if (!overColumn) return

    const position = overColumn.records.find(r => r.id === active.id)
    if (!position) return

    // Update position in database
    try {
      const token = localStorage.getItem('token')
      const overIndex = overColumn.records.findIndex(r => r.id === over.id)
      
      await fetch(`/api/boards/${boardId}/records`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          positionId: active.id,
          columnId: overColumn.id,
          order: overIndex >= 0 ? overIndex : overColumn.records.length - 1,
        }),
      })
    } catch (err) {
      console.error('Failed to update position:', err)
      fetchBoard() // Refresh on error
    }
  }

  const handleToggleComplete = async (recordId: string, isComplete: boolean) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isComplete }),
      })

      // Update local state
      setBoard(prev => prev ? {
        ...prev,
        columns: prev.columns.map(col => ({
          ...col,
          records: col.records.map(pos => 
            pos.recordId === recordId 
              ? { ...pos, record: { ...pos.record, isComplete } }
              : pos
          ),
        })),
      } : null)
    } catch (err) {
      console.error('Failed to toggle complete:', err)
    }
  }

  const activePosition = activeId 
    ? board?.columns.flatMap(c => c.records).find(r => r.id === activeId)
    : null

  const filteredRecords = availableRecords.filter(r => {
    const query = searchQuery.toLowerCase()
    const onBoard = board?.columns.some(col => 
      col.records.some(pos => pos.recordId === r.id)
    )
    if (onBoard) return false
    return (
      r.ownerFullName.toLowerCase().includes(query) ||
      r.propertyStreet?.toLowerCase().includes(query) ||
      r.propertyCity?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Board not found</p>
        <Button
          variant="link"
          onClick={() => router.push('/dashboard/board')}
          className="mt-4"
        >
          Back to Boards
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/board')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
            {board.description && (
              <p className="text-sm text-gray-500">{board.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-[calc(100vh-200px)]"
              >
                {/* Column header */}
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    {editingColumnId === column.id ? (
                      <input
                        type="text"
                        value={editColumnName}
                        onChange={(e) => setEditColumnName(e.target.value)}
                        onBlur={() => handleUpdateColumn(column.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateColumn(column.id)
                          if (e.key === 'Escape') setEditingColumnId(null)
                        }}
                        className="flex-1 px-2 py-1 text-sm font-semibold border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: column.color }}
                        />
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {column.name}
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                          {column.records.length}
                        </span>
                      </div>
                    )}
                    
                    <div className="relative">
                      <button
                        onClick={() => setColumnMenuId(columnMenuId === column.id ? null : column.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                      
                      {columnMenuId === column.id && (
                        <div className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => {
                              setEditingColumnId(column.id)
                              setEditColumnName(column.name)
                              setColumnMenuId(null)
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 className="w-4 h-4" />
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(column.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  <SortableContext
                    items={column.records.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {column.records.map((position) => (
                      <SortableCard
                        key={position.id}
                        position={position}
                        onClick={() => setSelectedRecordId(position.recordId)}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))}
                  </SortableContext>
                </div>

                {/* Add record button */}
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setAddToColumnId(column.id)
                      setShowAddRecordModal(true)
                      fetchAvailableRecords()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Record
                  </button>
                </div>
              </div>
            ))}

            {/* Add column */}
            <div className="flex-shrink-0 w-72">
              {showAddColumn ? (
                <form onSubmit={handleAddColumn} className="bg-gray-100 rounded-lg p-3">
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      disabled={addingColumn || !newColumnName.trim()}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addingColumn ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddColumn(false)
                        setNewColumnName('')
                      }}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddColumn(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Add Column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activePosition && <CardOverlay position={activePosition} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Record to Board</h2>
              <button
                onClick={() => {
                  setShowAddRecordModal(false)
                  setAddToColumnId(null)
                  setSearchQuery('')
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingRecords ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery 
                    ? 'No matching records found' 
                    : availableRecords.length === 0 
                      ? 'No records available' 
                      : 'All records are already on this board'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleAddRecord(record.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="font-medium text-gray-900">{record.ownerFullName}</div>
                      {record.propertyStreet && (
                        <div className="text-sm text-gray-500">
                          {record.propertyStreet}
                          {record.propertyCity && `, ${record.propertyCity}`}
                          {record.propertyState && ` ${record.propertyState}`}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {columnMenuId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setColumnMenuId(null)}
        />
      )}

      {/* Record Detail Panel */}
      {selectedRecordId && (
        <RecordDetailPanel
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
          onNavigate={(id) => router.push(`/dashboard/records/${id}`)}
        />
      )}
    </div>
  )
}
