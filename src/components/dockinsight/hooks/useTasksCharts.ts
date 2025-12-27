/**
 * DockInsight 3.0 - useTasksCharts Hook
 * 
 * Fetches task chart data from the API.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface StatusData {
  label: string
  value: number
  color: string
}

interface TaskTypeData {
  label: string
  value: number
  color: string
}

interface WorkflowData {
  label: string
  completed: number
  total: number
}

interface TasksChartsData {
  tasksByStatus: StatusData[]
  taskTypes: TaskTypeData[]
  workflowCompletion: WorkflowData[]
}

interface UseTasksChartsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useTasksCharts({ filters, isExecutiveView }: UseTasksChartsOptions) {
  const [data, setData] = useState<TasksChartsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasksCharts = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))

      const response = await fetch(`/api/dockinsight/tasks-charts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch task charts')
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
    fetchTasksCharts()
  }, [fetchTasksCharts])

  return { data, loading, error, refetch: fetchTasksCharts }
}
