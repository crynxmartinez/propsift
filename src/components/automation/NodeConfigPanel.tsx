'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { X, Trash2, Save, Calendar, Users, Bell } from 'lucide-react'

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

interface CallResult {
  id: string
  name: string
  color: string
}

interface TaskTemplate {
  id: string
  name: string
  title: string
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
  const [callResults, setCallResults] = useState<CallResult[]>([])
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [statusesRes, tagsRes, motivationsRes, usersRes, boardsRes, callResultsRes, taskTemplatesRes] = await Promise.all([
        fetch('/api/statuses', { headers }),
        fetch('/api/tags', { headers }),
        fetch('/api/motivations', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/boards', { headers }),
        fetch('/api/call-results', { headers }),
        fetch('/api/task-templates', { headers }),
      ])

      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (motivationsRes.ok) setMotivations(await motivationsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (boardsRes.ok) setBoards(await boardsRes.json())
      if (callResultsRes.ok) setCallResults(await callResultsRes.json())
      if (taskTemplatesRes.ok) setTaskTemplates(await taskTemplatesRes.json())
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

  // Branch configuration for condition nodes
  interface BranchCondition {
    field: string
    operator: string
    value: string
    valueName?: string
    logic?: 'AND' | 'OR'
  }

  interface Branch {
    id: string
    name: string
    conditions: BranchCondition[]
  }

  const branches: Branch[] = (config.branches as Branch[]) || []

  const addBranch = () => {
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: `Branch ${branches.length + 1}`,
      conditions: [{ field: '', operator: 'equals', value: '' }]
    }
    updateConfig('branches', [...branches, newBranch])
  }

  const updateBranch = (branchId: string, updates: Partial<Branch>) => {
    updateConfig('branches', branches.map(b => 
      b.id === branchId ? { ...b, ...updates } : b
    ))
  }

  const deleteBranch = (branchId: string) => {
    updateConfig('branches', branches.filter(b => b.id !== branchId))
  }

  const addCondition = (branchId: string) => {
    updateConfig('branches', branches.map(b => 
      b.id === branchId 
        ? { ...b, conditions: [...b.conditions, { field: '', operator: 'equals', value: '', logic: 'AND' as const }] }
        : b
    ))
  }

  const updateCondition = (branchId: string, conditionIndex: number, updates: Partial<BranchCondition>) => {
    updateConfig('branches', branches.map(b => 
      b.id === branchId 
        ? { 
            ...b, 
            conditions: b.conditions.map((c, i) => 
              i === conditionIndex ? { ...c, ...updates } : c
            )
          }
        : b
    ))
  }

  const deleteCondition = (branchId: string, conditionIndex: number) => {
    updateConfig('branches', branches.map(b => 
      b.id === branchId 
        ? { ...b, conditions: b.conditions.filter((_, i) => i !== conditionIndex) }
        : b
    ))
  }

  const renderConditionRow = (branchId: string, condition: BranchCondition, index: number, isFirst: boolean) => (
    <div key={index} className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
      {!isFirst && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-gray-200"></div>
          <select
            value={condition.logic || 'AND'}
            onChange={(e) => updateCondition(branchId, index, { logic: e.target.value as 'AND' | 'OR' })}
            className="px-3 py-1 text-xs font-medium border border-blue-300 rounded-full bg-blue-50 text-blue-700"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>
      )}
      
      {/* Field Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
        <select
          value={condition.field}
          onChange={(e) => updateCondition(branchId, index, { field: e.target.value, value: '' })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

      {/* Operator Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Operator</label>
        <select
          value={condition.operator}
          onChange={(e) => updateCondition(branchId, index, { operator: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="is_empty">Is Empty</option>
          <option value="is_not_empty">Is Not Empty</option>
        </select>
      </div>

      {/* Value Selection - only show if operator needs a value */}
      {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
          {condition.field === 'status' && (
            <select
              value={condition.value}
              onChange={(e) => {
                const selectedStatus = statuses.find(s => s.id === e.target.value)
                updateCondition(branchId, index, { 
                  value: e.target.value,
                  valueName: selectedStatus?.name || e.target.value
                })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select status...</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {condition.field === 'temperature' && (
            <select
              value={condition.value}
              onChange={(e) => updateCondition(branchId, index, { value: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select temperature...</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
            </select>
          )}
          {condition.field === 'hasTag' && (
            <select
              value={condition.value}
              onChange={(e) => {
                const selectedTag = tags.find(t => t.id === e.target.value)
                updateCondition(branchId, index, { 
                  value: e.target.value,
                  valueName: selectedTag?.name || e.target.value
                })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select tag...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {condition.field === 'hasMotivation' && (
            <select
              value={condition.value}
              onChange={(e) => {
                const selectedMotivation = motivations.find(m => m.id === e.target.value)
                updateCondition(branchId, index, { 
                  value: e.target.value,
                  valueName: selectedMotivation?.name || e.target.value
                })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select motivation...</option>
              {motivations.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {condition.field === 'isAssigned' && (
            <select
              value={condition.value}
              onChange={(e) => {
                const selectedUser = users.find(u => u.id === e.target.value)
                const displayName = e.target.value === 'any' ? 'Anyone' : (selectedUser?.name || selectedUser?.email || e.target.value)
                updateCondition(branchId, index, { 
                  value: e.target.value,
                  valueName: displayName
                })
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select user...</option>
              <option value="any">Anyone (is assigned)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          )}
          {condition.field === 'isComplete' && (
            <select
              value={condition.value}
              onChange={(e) => updateCondition(branchId, index, { value: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          )}
          {!condition.field && (
            <input
              type="text"
              value={condition.value}
              onChange={(e) => updateCondition(branchId, index, { value: e.target.value })}
              placeholder="Enter value..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Delete Button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={() => deleteCondition(branchId, index)}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
          type="button"
        >
          <Trash2 className="w-3 h-3" />
          Remove
        </button>
      </div>
    </div>
  )

  const renderBranchConfig = () => (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-2">
        Configure branches for this condition. Each branch can have multiple conditions.
        The first matching branch will be executed. If no branch matches, the &quot;None&quot; branch is used.
      </div>

      {/* Branches */}
      <div className="space-y-4">
        {branches.map((branch, branchIndex) => (
          <div key={branch.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                value={branch.name}
                onChange={(e) => updateBranch(branch.id, { name: e.target.value })}
                className="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                placeholder="Branch name"
              />
              <button
                onClick={() => deleteBranch(branch.id)}
                className="p-1 text-gray-400 hover:text-red-500"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Conditions */}
            <div className="space-y-2 mb-3">
              {branch.conditions.map((condition, condIndex) => 
                renderConditionRow(branch.id, condition, condIndex, condIndex === 0)
              )}
            </div>

            <button
              onClick={() => addCondition(branch.id)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              type="button"
            >
              + Add Condition
            </button>
          </div>
        ))}
      </div>

      {/* Add Branch Button */}
      <button
        onClick={addBranch}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
        type="button"
      >
        + Add Branch
      </button>

      {/* None Branch Info */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span className="font-medium text-gray-600">None Branch</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Executed when no other branch conditions are met
        </p>
      </div>
    </div>
  )

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

      case 'call_logged':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call Result (optional)
              </label>
              <select
                value={(config.callResultId as string) || ''}
                onChange={(e) => updateConfig('callResultId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any call result</option>
                {callResults.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'call_result_changed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Call Result (optional)
              </label>
              <select
                value={(config.fromCallResultId as string) || ''}
                onChange={(e) => updateConfig('fromCallResultId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any call result</option>
                {callResults.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Call Result (optional)
              </label>
              <select
                value={(config.toCallResultId as string) || ''}
                onChange={(e) => updateConfig('toCallResultId', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any call result</option>
                {callResults.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'phone_status_changed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Status (optional)
              </label>
              <select
                value={(config.phoneStatus as string) || ''}
                onChange={(e) => updateConfig('phoneStatus', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any status</option>
                <option value="PRIMARY">Primary</option>
                <option value="CORRECT">Correct</option>
                <option value="WRONG">Wrong</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="DNC">DNC</option>
                <option value="DEAD">Dead</option>
              </select>
            </div>
          </div>
        )

      case 'sms_sent':
      case 'rvm_sent':
      case 'direct_mail_sent':
      case 'skiptrace_completed':
      case 'record_created':
      case 'record_updated':
      case 'record_unassigned':
      case 'task_created':
      case 'task_completed':
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
          <div className="space-y-5">
            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(config.title as string) || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Enter task title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={(config.description as string) || ''}
                onChange={(e) => updateConfig('description', e.target.value)}
                placeholder="Enter task description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Priority & Link to Property Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-600 mb-1">
                  Priority
                </label>
                <div className="relative">
                  <select
                    value={(config.priority as string) || 'MEDIUM'}
                    onChange={(e) => updateConfig('priority', e.target.value)}
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                    config.priority === 'LOW' ? 'bg-gray-400' :
                    config.priority === 'HIGH' ? 'bg-orange-500' :
                    config.priority === 'URGENT' ? 'bg-red-500' :
                    'bg-yellow-400'
                  }`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Property
                </label>
                <input
                  type="text"
                  value="Current Record"
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Scheduling</span>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(config.noDueDate as boolean) ?? true}
                    onChange={(e) => updateConfig('noDueDate', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No due date</span>
                </label>

                {!config.noDueDate && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={(config.dueDate as string) || ''}
                      onChange={(e) => updateConfig('dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Notify After */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notify after</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={(config.notifyAfterValue as number) || ''}
                      onChange={(e) => updateConfig('notifyAfterValue', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g. 7"
                      min="1"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={(config.notifyAfterUnit as string) || 'Days'}
                      onChange={(e) => updateConfig('notifyAfterUnit', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Leave empty for no notification</p>
                </div>

                {/* Recurrence */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Recurrence</label>
                  <select
                    value={(config.recurrence as string) || 'one_time'}
                    onChange={(e) => updateConfig('recurrence', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="one_time">One time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assignment Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Assignment</span>
              </div>

              <div className="space-y-3">
                {/* Assignment Type */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="manual"
                      checked={(config.assignmentType as string) !== 'round_robin'}
                      onChange={() => updateConfig('assignmentType', 'manual')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Manual Assignment</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="round_robin"
                      checked={(config.assignmentType as string) === 'round_robin'}
                      onChange={() => updateConfig('assignmentType', 'round_robin')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Round Robin</span>
                  </label>
                </div>

                {/* Assign To */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Assign to</label>
                  <select
                    value={(config.assignedToId as string) || ''}
                    onChange={(e) => updateConfig('assignedToId', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={(config.assignmentType as string) === 'round_robin'}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Save as Template */}
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(config.saveAsTemplate as boolean) || false}
                  onChange={(e) => updateConfig('saveAsTemplate', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Save as template</span>
              </label>
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
        return renderBranchConfig()

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
