/**
 * DockInsight 3.0 - Task Table with Search and Pagination
 */

'use client'

import { useState } from 'react'
import { Loader2, Search, ChevronLeft, ChevronRight, Check, MoreHorizontal, Phone, Mail, Calendar, Users, FileText } from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  description: string | null
  taskType: string
  dueDate: string | null
  priority: string
  status: string
  ageDays: number
  assigneeId: string | null
  assigneeName: string | null
  recordId: string | null
  recordName: string | null
}

interface TaskTableProps {
  tasks: TaskItem[] | null
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading?: boolean
  search: string
  onSearchChange: (search: string) => void
  onPageChange: (page: number) => void
  onMarkAsDone: (taskIds: string[]) => void
  filterTitle: string
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  'Call': <Phone className="w-4 h-4" />,
  'Meeting': <Users className="w-4 h-4" />,
  'Email': <Mail className="w-4 h-4" />,
  'Follow-Up': <Calendar className="w-4 h-4" />,
  'Review': <FileText className="w-4 h-4" />,
  'Task': <FileText className="w-4 h-4" />
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-green-500 text-white'
}

export function TaskTable({ 
  tasks, 
  total, 
  page, 
  pageSize, 
  totalPages,
  loading, 
  search,
  onSearchChange,
  onPageChange,
  onMarkAsDone,
  filterTitle
}: TaskTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const toggleAll = () => {
    if (tasks && selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else if (tasks) {
      setSelectedTasks(new Set(tasks.map(t => t.id)))
    }
  }

  const handleMarkAsDone = () => {
    if (selectedTasks.size > 0) {
      onMarkAsDone(Array.from(selectedTasks))
      setSelectedTasks(new Set())
    }
  }

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (taskDate.getTime() === today.getTime()) return 'Today'
    if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
    if (taskDate < today) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatAge = (days: number) => {
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          {filterTitle} ({total.toLocaleString()})
        </h3>
        <div className="flex items-center gap-2">
          {selectedTasks.size > 0 && (
            <button
              onClick={handleMarkAsDone}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Mark as Done
            </button>
          )}
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            More
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : tasks && tasks.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={tasks.length > 0 && selectedTasks.size === tasks.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Age</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTask(task.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {taskTypeIcons[task.taskType] || taskTypeIcons['Task']}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-[150px]">
                            {task.taskType}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {task.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        <span className="text-gray-700">{formatDueDate(task.dueDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority] || 'bg-gray-100 text-gray-700'}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                            {task.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700 truncate max-w-[100px]">
                            {task.assigneeName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatAge(task.ageDays)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onMarkAsDone([task.id])}
                          className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Done
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {startIndex}–{endIndex} of {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No tasks found
        </div>
      )}
    </div>
  )
}
