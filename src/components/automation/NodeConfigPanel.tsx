'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { X, Trash2, Save } from 'lucide-react'

interface Status {
  id: string
  name: string
  color: string
}

interface Tag {
  id: string
  name: string
}

interface Motivation {
  id: string
  name: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Board {
  id: string
  name: string
  columns: { id: string; name: string; color: string }[]
}

interface NodeConfigPanelProps {
  node: Node
  onClose: () => void
  onSave: (nodeId: string, config: Record<string, unknown>) => void
  onDelete: (nodeId: string) => void
}

export default function NodeConfigPanel({
  node,
  onClose,
  onSave,
  onDelete,
}: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(node.data.config || {})
  const [statuses, setStatuses] = useState<Status[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [motivations, setMotivations] = useState<Motivation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [statusesRes, tagsRes, motivationsRes, usersRes, boardsRes] = await Promise.all([
        fetch('/api/statuses', { headers }),
        fetch('/api/tags', { headers }),
        fetch('/api/motivations', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/boards', { headers }),
      ])

      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (motivationsRes.ok) setMotivations(await motivationsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (boardsRes.ok) setBoards(await boardsRes.json())
    } catch (error) {
      console.error('Error fetching options:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    onSave(node.id, config)
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const renderTriggerConfig = () => {
    const triggerType = node.data.type

    switch (triggerType) {
      case 'status_changed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Status (optional)
              </label>
              <select
                value={(config.fromStatusId as string) || ''}
                onChange={(e) => updateConfig('fromStatusId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Status (optional)
              </label>
              <select
                value={(config.toStatusId as string) || ''}
                onChange={(e) => updateConfig('toStatusId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'temperature_changed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Temperature (optional)
              </label>
              <select
                value={(config.toTemperature as string) || ''}
                onChange={(e) => updateConfig('toTemperature', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any temperature</option>
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="COLD">Cold</option>
              </select>
            </div>
          </div>
        )

      case 'tag_added':
      case 'tag_removed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Tag (optional)
              </label>
              <select
                value={(config.tagId as string) || ''}
                onChange={(e) => updateConfig('tagId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any tag</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'record_assigned':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To (optional)
              </label>
              <select
                value={(config.userId as string) || ''}
                onChange={(e) => updateConfig('userId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'added_to_board':
      case 'moved_to_column':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Board (optional)
              </label>
              <select
                value={(config.boardId as string) || ''}
                onChange={(e) => {
                  updateConfig('boardId', e.target.value || null)
                  updateConfig('columnId', null)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any board</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            {Boolean(config.boardId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column (optional)
                </label>
                <select
                  value={(config.columnId as string) || ''}
                  onChange={(e) => updateConfig('columnId', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any column</option>
                  {boards.find((b) => b.id === config.boardId)?.columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )

      default:
        return (
          <p className="text-sm text-gray-500">
            No additional configuration needed for this trigger.
          </p>
        )
    }
  }

  const renderActionConfig = () => {
    const actionType = node.data.type

    switch (actionType) {
      case 'update_status':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Set Status To <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.statusId as string) || ''}
                onChange={(e) => updateConfig('statusId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select status...</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'update_temperature':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Set Temperature To <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.temperature as string) || ''}
                onChange={(e) => updateConfig('temperature', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select temperature...</option>
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="COLD">Cold</option>
              </select>
            </div>
          </div>
        )

      case 'add_tag':
      case 'remove_tag':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.tagId as string) || ''}
                onChange={(e) => updateConfig('tagId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select tag...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'add_motivation':
      case 'remove_motivation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivation <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.motivationId as string) || ''}
                onChange={(e) => updateConfig('motivationId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select motivation...</option>
                {motivations.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'assign_user':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.userId as string) || ''}
                onChange={(e) => updateConfig('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'add_to_board':
      case 'move_to_column':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Board <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.boardId as string) || ''}
                onChange={(e) => {
                  updateConfig('boardId', e.target.value)
                  updateConfig('columnId', '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select board...</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            {Boolean(config.boardId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Column <span className="text-red-500">*</span>
                </label>
                <select
                  value={(config.columnId as string) || ''}
                  onChange={(e) => updateConfig('columnId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select column...</option>
                  {boards.find((b) => b.id === config.boardId)?.columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )

      case 'create_task':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(config.title as string) || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="e.g., Follow up with lead"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={(config.description as string) || ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Task description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To (optional)
              </label>
              <select
                value={(config.assignedToId as string) || ''}
                onChange={(e) => updateConfig('assignedToId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={(config.priority as string) || 'MEDIUM'}
                onChange={(e) => updateConfig('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
        )

      case 'send_notification':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send To <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.userId as string) || ''}
                onChange={(e) => updateConfig('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(config.title as string) || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Notification title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={(config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Notification message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        )

      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wait Duration <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={(config.duration as number) || 1}
                  onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 1)}
                  min={1}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={(config.unit as string) || 'minutes'}
                  onChange={(e) => updateConfig('unit', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 'if_else':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Field <span className="text-red-500">*</span>
              </label>
              <select
                value={(config.field as string) || ''}
                onChange={(e) => {
                  updateConfig('field', e.target.value)
                  updateConfig('value', '')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select field...</option>
                <option value="status">Status</option>
                <option value="temperature">Temperature</option>
                <option value="isComplete">Is Complete</option>
                <option value="hasTag">Has Tag</option>
                <option value="hasMotivation">Has Motivation</option>
                <option value="isAssigned">Is Assigned</option>
              </select>
            </div>
            
            {config.field === 'status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Equals
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {config.field === 'temperature' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature Equals
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select temperature...</option>
                  <option value="HOT">Hot</option>
                  <option value="WARM">Warm</option>
                  <option value="COLD">Cold</option>
                </select>
              </div>
            )}

            {config.field === 'isComplete' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Is Complete
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            )}

            {config.field === 'hasTag' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Tag
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select tag...</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {config.field === 'hasMotivation' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Motivation
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select motivation...</option>
                  {motivations.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {config.field === 'isAssigned' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <select
                  value={(config.value as string) || ''}
                  onChange={(e) => updateConfig('value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="any">Anyone (is assigned)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={(config.operator as string) || 'equals'}
                onChange={(e) => updateConfig('operator', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
              </select>
            </div>
          </div>
        )

      case 'mark_complete':
        return (
          <p className="text-sm text-gray-500">
            This action will mark the record as complete. No additional configuration needed.
          </p>
        )

      default:
        return (
          <p className="text-sm text-gray-500">
            No additional configuration needed for this action.
          </p>
        )
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Configure Node</h3>
          <p className="text-sm text-gray-500">{node.data.label}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            node.type === 'trigger' 
              ? 'bg-purple-100 text-purple-700' 
              : node.type === 'condition'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {node.type?.toUpperCase()}
          </span>
        </div>

        {node.type === 'trigger' && renderTriggerConfig()}
        {(node.type === 'action' || node.type === 'condition') && renderActionConfig()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  )
}
