/**
 * DockInsight 3.0 - useTasksList Hook
 * 
 * Fetches paginated task list from the API with search and filters.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

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

interface TasksListData {
  tasks: TaskItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface UseTasksListOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
  filterType: string
  search: string
  page: number
  pageSize: number
}

export function useTasksList({ 
  filters, 
  isExecutiveView, 
  filterType, 
  search, 
  page, 
  pageSize 
}: UseTasksListOptions) {
  const [data, setData] = useState<TasksListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasksList = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      params.set('filterType', filterType)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))
      if (filters.priority?.length) params.set('priority', filters.priority.join(','))
      if (filters.taskStatus?.length) params.set('taskStatus', filters.taskStatus.join(','))
      if (search) params.set('search', search)

      const response = await fetch(`/api/dockinsight/tasks-list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks list')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filters, isExecutiveView, filterType, search, page, pageSize])

  useEffect(() => {
    fetchTasksList()
  }, [fetchTasksList])

  const markAsDone = async (taskIds: string[]) => {
    const token = localStorage.getItem('token')
    if (!token) return false

    try {
      const response = await fetch('/api/dockinsight/tasks-list', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskIds, action: 'complete' })
      })

      if (!response.ok) {
        throw new Error('Failed to mark tasks as done')
      }

      // Refetch the list
      await fetchTasksList()
      return true
    } catch (err) {
      console.error('Error marking tasks as done:', err)
      return false
    }
  }

  return { data, loading, error, refetch: fetchTasksList, markAsDone }
}
