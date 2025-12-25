'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  User,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Circle,
  Flag,
  Tag
} from 'lucide-react'

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

interface Email {
  id: string
  email: string
  isPrimary: boolean
}

interface Task {
  id: string
  title: string
  status: string
  dueDate: string | null
  assignedTo: AssignedTo | null
}

interface RecordDetail {
  id: string
  ownerFullName: string
  ownerFirstName: string | null
  ownerLastName: string | null
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  mailingStreet: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  status: Status | null
  statusId: string | null
  assignedTo: AssignedTo | null
  assignedToId: string | null
  recordTags: RecordTag[]
  phoneNumbers: PhoneNumber[]
  emails: Email[]
  tasks: Task[]
  isComplete: boolean
  temperature: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface RecordDetailPanelProps {
  recordId: string
  onClose: () => void
  onNavigate?: (recordId: string) => void
}

export default function RecordDetailPanel({ 
  recordId, 
  onClose,
  onNavigate 
}: RecordDetailPanelProps) {
  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Dropdowns
  const [statuses, setStatuses] = useState<Status[]>([])
  const [users, setUsers] = useState<AssignedTo[]>([])
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  useEffect(() => {
    fetchRecord()
    fetchStatuses()
    fetchUsers()
  }, [recordId])

  const fetchRecord = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch record')
      const data = await res.json()
      setRecord(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch record')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/statuses', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStatuses(data)
      }
    } catch (err) {
      console.error('Failed to fetch statuses:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/team', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleUpdateRecord = async (updates: Partial<RecordDetail>) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setRecord(prev => prev ? { ...prev, ...updated } : null)
      }
    } catch (err) {
      console.error('Failed to update record:', err)
    }
  }

  const calculateCardAge = () => {
    if (!record) return 0
    const created = new Date(record.createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const calculateDaysInactive = () => {
    if (!record) return 0
    const updated = new Date(record.updatedAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - updated.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getTasksCompleted = () => {
    if (!record || record.tasks.length === 0) return { completed: 0, total: 0, percent: 0 }
    const completed = record.tasks.filter(t => t.status === 'COMPLETED').length
    const total = record.tasks.length
    const percent = Math.round((completed / total) * 100)
    return { completed, total, percent }
  }

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 p-6">
        <div className="flex justify-end">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-red-500 text-center mt-8">{error || 'Record not found'}</p>
      </div>
    )
  }

  const cardAge = calculateCardAge()
  const daysInactive = calculateDaysInactive()
  const taskStats = getTasksCompleted()
  const propertyAddress = [record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip]
    .filter(Boolean).join(', ')

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {propertyAddress || record.ownerFullName}
              </h2>
              {propertyAddress && (
                <p className="text-sm text-gray-500">{record.propertyCity}, {record.propertyState} {record.propertyZip}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate(recordId)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition"
                  title="Open full details"
                >
                  <ExternalLink className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* User and Status dropdowns */}
          <div className="flex gap-3 mt-4">
            {/* User dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown)
                  setShowStatusDropdown(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">
                    {record.assignedTo?.name || record.assignedTo?.email || 'Choose user'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      handleUpdateRecord({ assignedToId: null } as Partial<RecordDetail>)
                      setShowUserDropdown(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Unassigned
                  </button>
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        handleUpdateRecord({ assignedToId: user.id } as Partial<RecordDetail>)
                        setShowUserDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {user.name || user.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown)
                  setShowUserDropdown(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {record.status && (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: record.status.color }}
                    />
                  )}
                  <span className="text-sm text-gray-700 truncate">
                    {record.status?.name || 'Status'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {statuses.map(status => (
                    <button
                      key={status.id}
                      onClick={() => {
                        handleUpdateRecord({ statusId: status.id } as Partial<RecordDetail>)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Tasks Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Next Tasks</h3>
              <button className="text-sm text-blue-600 hover:underline">
                Add new task
              </button>
            </div>
            
            {record.tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {record.tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Flag className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-500">
                            Due on {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          {task.assignedTo && (
                            <span className="text-xs text-gray-400 ml-2">
                              @ {task.assignedTo.name || task.assignedTo.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {record.tasks.length > 3 && (
                  <p className="text-sm text-gray-500 pl-7">
                    +{record.tasks.length - 3} more tasks
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Card Stats */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Card Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Card Age (days)</p>
                <p className="text-2xl font-bold text-gray-900">{cardAge}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Days Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{daysInactive}</p>
              </div>
            </div>
            
            {taskStats.total > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">Tasks Completed</p>
                  <p className="text-sm font-medium text-gray-900">{taskStats.percent}%</p>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${taskStats.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">{record.ownerFullName}</h3>
            <p className="text-sm text-gray-500 mb-3">Person</p>
            
            {propertyAddress && (
              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-700">{propertyAddress}</p>
              </div>
            )}

            <button className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              <ChevronDown className="w-4 h-4" />
              Contact Info
            </button>
            
            {/* Phone numbers */}
            {record.phoneNumbers.length > 0 && (
              <div className="mt-3 space-y-2">
                {record.phoneNumbers.map(phone => (
                  <div key={phone.id} className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${phone.number}`} className="text-sm text-blue-600 hover:underline">
                      {phone.number}
                    </a>
                    <span className="text-xs text-gray-400">({phone.type})</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Emails */}
            {record.emails.length > 0 && (
              <div className="mt-3 space-y-2">
                {record.emails.map(email => (
                  <div key={email.id} className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${email.email}`} className="text-sm text-blue-600 hover:underline">
                      {email.email}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Lists & Tags</h3>
            <div className="flex gap-4 border-b border-gray-200 mb-3">
              <button className="pb-2 text-sm text-gray-500 hover:text-gray-900">
                Lists (0)
              </button>
              <button className="pb-2 text-sm text-blue-600 border-b-2 border-blue-600">
                Tags ({record.recordTags.length})
              </button>
            </div>
            
            {record.recordTags.length === 0 ? (
              <p className="text-sm text-gray-500">No tags</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {record.recordTags.map(rt => (
                  <span 
                    key={rt.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                  >
                    <Tag className="w-3 h-3" />
                    {rt.tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
