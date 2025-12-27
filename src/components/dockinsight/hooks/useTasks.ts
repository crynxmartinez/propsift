/**
 * DockInsight 3.0 - useTasks Hook
 * 
 * Fetches task data from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface TaskKPIs {
  tasksDueToday: number
  overdueTasks: number
  completedThisWeek: number
}

interface StatusData {
  label: string
  value: number
  color: string
}

interface AssigneeTaskData {
  id: string
  name: string
  taskCount: number
}

interface UpcomingTask {
  id: string
  title: string
  dueDate: string | null
  priority: string
  status: string
  assigneeId: string | null
  assigneeName: string | null
  recordId: string | null
  recordName: string | null
}

interface TasksData {
  kpis: TaskKPIs
  tasksByStatus: StatusData[]
  tasksByAssignee: AssigneeTaskData[]
  upcomingTasks: UpcomingTask[]
}

interface UseTasksOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useTasks({ filters, isExecutiveView }: UseTasksOptions) {
  const [data, setData] = useState<TasksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))

      const response = await fetch(`/api/dockinsight/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filters, isExecutiveView])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { data, loading, error, refetch: fetchTasks }
}
