'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckSquare, 
  Plus, 
  Filter, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Search, 
  Calendar,
  Clock,
  User,
  MapPin,
  MoreHorizontal,
  Check,
  Play,
  Trash2,
  Edit,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react'
import { useToast } from '@/components/Toast'

interface TaskRecord {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
}

interface TaskUser {
  id: string
  name: string | null
  email: string
}

interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  dueTime: string | null
  recurrence: string | null
  recurrenceDays: string[]
  skipWeekends: boolean
  status: string
  priority: string
  assignmentType: string
  assignedToId: string | null
  assignedTo: TaskUser | null
  recordId: string | null
  record: TaskRecord | null
  createdById: string
  createdBy: TaskUser
  completedAt: string | null
  createdAt: string
}

interface TaskTemplate {
  id: string
  name: string
  title: string
  description: string | null
  category: string | null
  priority: string
  dueDaysFromNow: number | null
  dueTime: string | null
  recurrence: string | null
  recurrenceDays: string[]
  skipWeekends: boolean
  assignmentType: string
  roundRobinUsers: string[]
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_DUE_DATE'
type GroupBy = 'dueDate' | 'priority' | 'assignee' | 'status'

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function TasksPage() {
  const router = useRouter()
  const { showToast } = useToast()
  
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [users, setUsers] = useState<TaskUser[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('dueDate')
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [actionMenuTask, setActionMenuTask] = useState<string | null>(null)
  
  // Task counts
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    noDueDate: 0,
  })

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter === 'ACTIVE') {
        params.set('status', 'ACTIVE')
      } else if (statusFilter !== 'ALL' && statusFilter !== 'NO_DUE_DATE') {
        params.set('status', statusFilter)
      }
      if (assigneeFilter) {
        params.set('assignedToId', assigneeFilter)
      }

      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const response = await fetch(`/api/tasks?${params.toString()}`, { headers })
      if (!response.ok) throw new Error('Failed to fetch tasks')
      
      let data: Task[] = await response.json()
      
      // Filter for no due date if needed
      if (statusFilter === 'NO_DUE_DATE') {
        data = data.filter(t => !t.dueDate)
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        data = data.filter(t => 
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.record?.propertyStreet?.toLowerCase().includes(query) ||
          t.record?.ownerFullName?.toLowerCase().includes(query)
        )
      }
      
      setTasks(data)
      
      // Calculate counts
      const allTasks = await fetch('/api/tasks', { headers }).then(r => r.json())
      setCounts({
        all: allTasks.length,
        pending: allTasks.filter((t: Task) => t.status === 'PENDING').length,
        inProgress: allTasks.filter((t: Task) => t.status === 'IN_PROGRESS').length,
        completed: allTasks.filter((t: Task) => t.status === 'COMPLETED').length,
        noDueDate: allTasks.filter((t: Task) => !t.dueDate && t.status !== 'COMPLETED').length,
      })
    } catch (error) {
      console.error('Error fetching tasks:', error)
      showToast('Failed to fetch tasks', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, assigneeFilter, searchQuery, showToast])

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/task-templates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchTemplates()
    fetchUsers()
  }, [fetchTasks])

  // Group tasks
  const groupTasks = (tasks: Task[]): Record<string, Task[]> => {
    const groups: Record<string, Task[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))

    if (groupBy === 'dueDate') {
      tasks.forEach(task => {
        let groupKey: string
        
        if (!task.dueDate) {
          groupKey = '📋 No Due Date'
        } else {
          const dueDate = new Date(task.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          
          if (dueDate < today) {
            groupKey = '🔴 Overdue'
          } else if (dueDate.getTime() === today.getTime()) {
            groupKey = '📅 Today'
          } else if (dueDate.getTime() === tomorrow.getTime()) {
            groupKey = '📆 Tomorrow'
          } else if (dueDate <= endOfWeek) {
            groupKey = '📆 This Week'
          } else {
            groupKey = '📆 Later'
          }
        }
        
        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(task)
      })
      
      // Sort groups in order
      const orderedGroups: Record<string, Task[]> = {}
      const groupOrder = ['🔴 Overdue', '📅 Today', '📆 Tomorrow', '📆 This Week', '📆 Later', '📋 No Due Date']
      groupOrder.forEach(key => {
        if (groups[key]) {
          orderedGroups[key] = groups[key]
        }
      })
      return orderedGroups
    }
    
    if (groupBy === 'priority') {
      tasks.forEach(task => {
        const groupKey = task.priority
        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(task)
      })
      
      // Sort by priority order
      const orderedGroups: Record<string, Task[]> = {}
      Object.keys(groups)
        .sort((a, b) => (PRIORITY_ORDER[a] || 99) - (PRIORITY_ORDER[b] || 99))
        .forEach(key => {
          orderedGroups[key] = groups[key]
        })
      return orderedGroups
    }
    
    if (groupBy === 'assignee') {
      tasks.forEach(task => {
        const groupKey = task.assignedTo?.name || task.assignedTo?.email || 'Unassigned'
        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(task)
      })
      return groups
    }
    
    if (groupBy === 'status') {
      tasks.forEach(task => {
        const groupKey = task.status
        if (!groups[groupKey]) groups[groupKey] = []
        groups[groupKey].push(task)
      })
      return groups
    }
    
    return { 'All Tasks': tasks }
  }

  // Toggle group collapse
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Update task status
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) throw new Error('Failed to update task')
      
      showToast(`Task marked as ${newStatus.toLowerCase().replace('_', ' ')}`, 'success')
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      showToast('Failed to update task', 'error')
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (!response.ok) throw new Error('Failed to delete task')
      
      showToast('Task deleted', 'success')
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      showToast('Failed to delete task', 'error')
    }
  }

  // Format date for display
  const formatDueDate = (dueDate: string | null, dueTime: string | null): string => {
    if (!dueDate) return 'No due date'
    
    const date = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    
    let dateStr: string
    if (dateOnly.getTime() === today.getTime()) {
      dateStr = 'Today'
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      dateStr = 'Tomorrow'
    } else if (dateOnly < today) {
      const diffDays = Math.ceil((today.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24))
      dateStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    if (dueTime) {
      dateStr += ` at ${dueTime}`
    }
    
    return dateStr
  }

  // Check if task is overdue
  const isOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === 'COMPLETED') return false
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(23, 59, 59, 999)
    return dueDate < new Date()
  }

  const groupedTasks = groupTasks(tasks)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        </div>
        
        {/* Create Task Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showCreateDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCreateDropdown(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                <button
                  onClick={() => {
                    setShowCreateDropdown(false)
                    setEditingTask(null)
                    setShowCreateModal(true)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false)
                    setShowTemplateModal(true)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  From Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showFilterDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20 p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Users</option>
                    <option value="UNASSIGNED">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setAssigneeFilter('')
                    setShowFilterDropdown(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  Clear Filters
                </button>
              </div>
            </>
          )}
        </div>

        {/* Group By Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowGroupDropdown(!showGroupDropdown)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Group by: {groupBy === 'dueDate' ? 'Due Date' : groupBy === 'priority' ? 'Priority' : groupBy === 'assignee' ? 'Assignee' : 'Status'}
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showGroupDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowGroupDropdown(false)} />
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-20">
                {(['dueDate', 'priority', 'assignee', 'status'] as GroupBy[]).map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setGroupBy(option)
                      setShowGroupDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${groupBy === option ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    {option === 'dueDate' ? 'Due Date' : option === 'priority' ? 'Priority' : option === 'assignee' ? 'Assignee' : 'Status'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b">
        {[
          { key: 'ALL', label: 'All', count: counts.all },
          { key: 'ACTIVE', label: 'Active', count: counts.pending + counts.inProgress },
          { key: 'PENDING', label: 'Pending', count: counts.pending },
          { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
          { key: 'COMPLETED', label: 'Completed', count: counts.completed },
          { key: 'NO_DUE_DATE', label: 'No Due Date', count: counts.noDueDate },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as StatusFilter)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-500 mb-4">Create your first task to get started</p>
          <button
            onClick={() => {
              setEditingTask(null)
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
            <div key={groupKey} className="bg-white rounded-lg border shadow-sm">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {collapsedGroups.has(groupKey) ? (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">{groupKey}</span>
                  <span className="text-sm text-gray-500">({groupTasks.length})</span>
                </div>
              </button>

              {/* Group Tasks */}
              {!collapsedGroups.has(groupKey) && (
                <div className="border-t divide-y">
                  {groupTasks.map(task => (
                    <div
                      key={task.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        isOverdue(task) ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => updateTaskStatus(
                            task.id,
                            task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
                          )}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {task.status === 'COMPLETED' && <Check className="w-3 h-3" />}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {task.title}
                            </span>
                            {task.recurrence && task.recurrence !== 'NONE' && (
                              <RefreshCw className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {/* Due Date */}
                            <div className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-600' : ''}`}>
                              {isOverdue(task) ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <Calendar className="w-4 h-4" />
                              )}
                              {formatDueDate(task.dueDate, task.dueTime)}
                            </div>
                            
                            {/* Assignee */}
                            {task.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {task.assignedTo.name || task.assignedTo.email}
                              </div>
                            )}
                            
                            {/* Linked Property */}
                            {task.record && (
                              <button
                                onClick={() => router.push(`/dashboard/records/${task.record!.id}`)}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <MapPin className="w-4 h-4" />
                                {task.record.propertyStreet || task.record.ownerFullName}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>

                        {/* Status Badge */}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuTask(actionMenuTask === task.id ? null : task.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreHorizontal className="w-5 h-5 text-gray-400" />
                          </button>
                          
                          {actionMenuTask === task.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuTask(null)} />
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-20">
                                {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => {
                                      updateTaskStatus(task.id, 'IN_PROGRESS')
                                      setActionMenuTask(null)
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                  >
                                    <Play className="w-4 h-4" />
                                    Start Task
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingTask(task)
                                    setShowCreateModal(true)
                                    setActionMenuTask(null)
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                {task.record && (
                                  <button
                                    onClick={() => {
                                      router.push(`/dashboard/records/${task.record!.id}`)
                                      setActionMenuTask(null)
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                  >
                                    <MapPin className="w-4 h-4" />
                                    View Property
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    deleteTask(task.id)
                                    setActionMenuTask(null)
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          task={editingTask}
          users={users}
          templates={templates}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTask(null)
          }}
          onSave={() => {
            setShowCreateModal(false)
            setEditingTask(null)
            fetchTasks()
            fetchTemplates()
          }}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <TemplateSelectionModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onSelect={(template) => {
            setShowTemplateModal(false)
            // Pre-fill the create modal with template data
            setEditingTask({
              id: '',
              title: template.title,
              description: template.description,
              dueDate: template.dueDaysFromNow !== null 
                ? new Date(Date.now() + template.dueDaysFromNow * 24 * 60 * 60 * 1000).toISOString()
                : null,
              dueTime: template.dueTime,
              recurrence: template.recurrence,
              recurrenceDays: template.recurrenceDays,
              skipWeekends: template.skipWeekends,
              status: 'PENDING',
              priority: template.priority,
              assignmentType: template.assignmentType,
              assignedToId: null,
              assignedTo: null,
              recordId: null,
              record: null,
              createdById: '',
              createdBy: { id: '', name: null, email: '' },
              completedAt: null,
              createdAt: '',
            } as Task)
            setShowCreateModal(true)
          }}
        />
      )}
    </div>
  )
}

// Create/Edit Task Modal Component
function CreateTaskModal({
  task,
  users,
  templates,
  onClose,
  onSave,
}: {
  task: Task | null
  users: TaskUser[]
  templates: TaskTemplate[]
  onClose: () => void
  onSave: () => void
}) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<TaskRecord[]>([])
  const [recordSearch, setRecordSearch] = useState('')
  const [showRecordDropdown, setShowRecordDropdown] = useState(false)
  
  // Form state
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.split('T')[0] : '')
  const [dueTime, setDueTime] = useState(task?.dueTime || '')
  const [noDueDate, setNoDueDate] = useState(!task?.dueDate)
  const [notifyAfter, setNotifyAfter] = useState<number | ''>(
    (task as Task & { notifyAfter?: number | null })?.notifyAfter ?? ''
  )
  const [notifyAfterUnit, setNotifyAfterUnit] = useState(
    (task as Task & { notifyAfterUnit?: string | null })?.notifyAfterUnit || 'days'
  )
  const [repeatCount, setRepeatCount] = useState<number | ''>(
    (task as Task & { repeatCount?: number | null })?.repeatCount ?? ''
  )
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'NONE')
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(task?.recurrenceDays || [])
  const [skipWeekends, setSkipWeekends] = useState(task?.skipWeekends || false)
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM')
  const [assignmentType, setAssignmentType] = useState(task?.assignmentType || 'MANUAL')
  const [assignedToId, setAssignedToId] = useState(task?.assignedToId || '')
  const [roundRobinUsers, setRoundRobinUsers] = useState<string[]>([])
  const [recordId, setRecordId] = useState(task?.recordId || '')
  const [selectedRecord, setSelectedRecord] = useState<TaskRecord | null>(task?.record || null)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const isEditing = task?.id ? true : false

  // Search records
  useEffect(() => {
    const searchRecords = async () => {
      if (recordSearch.length < 2) {
        setRecords([])
        return
      }
      
      try {
        const response = await fetch(`/api/records?search=${encodeURIComponent(recordSearch)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setRecords(data.records || [])
        }
      } catch (error) {
        console.error('Error searching records:', error)
      }
    }
    
    const debounce = setTimeout(searchRecords, 300)
    return () => clearTimeout(debounce)
  }, [recordSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title,
        description: description || null,
        dueDate: noDueDate ? null : dueDate || null,
        dueTime: dueTime || null,
        notifyAfter: noDueDate && notifyAfter !== '' ? notifyAfter : null,
        notifyAfterUnit: noDueDate && notifyAfter !== '' ? notifyAfterUnit : null,
        repeatCount: noDueDate && repeatCount !== '' ? repeatCount : null,
        recurrence: recurrence === 'NONE' ? null : recurrence,
        recurrenceDays,
        skipWeekends,
        priority,
        assignmentType,
        assignedToId: assignmentType === 'MANUAL' ? (assignedToId || null) : null,
        roundRobinUsers: assignmentType === 'ROUND_ROBIN' ? roundRobinUsers : [],
        recordId: recordId || null,
        createdById: 'system', // TODO: Get from auth
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName : null,
      }

      const url = isEditing && task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save task')
      }

      showToast(isEditing ? 'Task updated' : 'Task created', 'success')
      onSave()
    } catch (error) {
      console.error('Error saving task:', error)
      showToast(error instanceof Error ? error.message : 'Failed to save task', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecurrenceDay = (day: string) => {
    setRecurrenceDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const toggleRoundRobinUser = (userId: string) => {
    setRoundRobinUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority & Link to Property */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🟠 High</option>
                <option value="URGENT">🔴 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Property
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedRecord ? (selectedRecord.propertyStreet || selectedRecord.ownerFullName) : recordSearch}
                  onChange={(e) => {
                    setRecordSearch(e.target.value)
                    setSelectedRecord(null)
                    setRecordId('')
                    setShowRecordDropdown(true)
                  }}
                  onFocus={() => setShowRecordDropdown(true)}
                  placeholder="Search property..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecord(null)
                      setRecordId('')
                      setRecordSearch('')
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                {showRecordDropdown && records.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowRecordDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {records.map(record => (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => {
                            setSelectedRecord(record)
                            setRecordId(record.id)
                            setRecordSearch('')
                            setShowRecordDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                          <div className="font-medium">{record.propertyStreet || 'No address'}</div>
                          <div className="text-gray-500">{record.ownerFullName}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scheduling Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Scheduling
            </h3>

            <div className="space-y-4">
              {/* No Due Date Toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={noDueDate}
                  onChange={(e) => setNoDueDate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No due date</span>
              </label>

              {!noDueDate ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Time (optional)
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Notify After */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notify after
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 7"
                        value={notifyAfter}
                        onChange={(e) => setNotifyAfter(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={notifyAfterUnit}
                        onChange={(e) => setNotifyAfterUnit(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Leave empty for no notification</p>
                  </div>

                  {/* Repeat Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recurrence
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={repeatCount === '' ? 'one-time' : 'repeat'}
                        onChange={(e) => {
                          if (e.target.value === 'one-time') {
                            setRepeatCount('')
                          } else {
                            setRepeatCount(1)
                          }
                        }}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="one-time">One time</option>
                        <option value="repeat">Repeat</option>
                      </select>
                      {repeatCount !== '' && (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={repeatCount}
                            onChange={(e) => setRepeatCount(e.target.value ? parseInt(e.target.value) : 1)}
                            className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-500">times</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Assignment
            </h3>

            <div className="space-y-4">
              {/* Assignment Type */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentType"
                    value="MANUAL"
                    checked={assignmentType === 'MANUAL'}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Manual Assignment</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentType"
                    value="ROUND_ROBIN"
                    checked={assignmentType === 'ROUND_ROBIN'}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Round Robin</span>
                </label>
              </div>

              {/* Manual Assignment */}
              {assignmentType === 'MANUAL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Round Robin Users */}
              {assignmentType === 'ROUND_ROBIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select users for rotation
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={roundRobinUsers.includes(user.id)}
                          onChange={() => toggleRoundRobinUser(user.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{user.name || user.email}</span>
                      </label>
                    ))}
                  </div>
                  {roundRobinUsers.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Next assignment will go to: {users.find(u => u.id === roundRobinUsers[0])?.name || users.find(u => u.id === roundRobinUsers[0])?.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save as Template */}
          {!isEditing && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Save as template</span>
              </label>

              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Template Selection Modal
function TemplateSelectionModal({
  templates,
  onClose,
  onSelect,
}: {
  templates: TaskTemplate[]
  onClose: () => void
  onSelect: (template: TaskTemplate) => void
}) {
  const [search, setSearch] = useState('')

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const groupedTemplates: Record<string, TaskTemplate[]> = {}
  filteredTemplates.forEach(template => {
    const category = template.category || 'Other'
    if (!groupedTemplates[category]) groupedTemplates[category] = []
    groupedTemplates[category].push(template)
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Select Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-96">
          {Object.keys(groupedTemplates).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No templates found</p>
              <p className="text-sm mt-1">Create a task and save it as a template</p>
            </div>
          ) : (
            Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
                  {category}
                </div>
                {categoryTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {template.dueDaysFromNow !== null ? `Due: +${template.dueDaysFromNow} days` : 'No due date'}
                      {' • '}
                      Priority: {template.priority}
                      {template.recurrence && template.recurrence !== 'NONE' && ` • ${template.recurrence}`}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
