/**
 * DockInsight 3.0 - useTasksKPIs Hook
 * 
 * Fetches task KPIs from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface TaskKPIData {
  current: number
  previous: number
}

interface TasksKPIsData {
  totalTasks: TaskKPIData
  overdueTasks: TaskKPIData
  dueToday: TaskKPIData
  completedTasks: TaskKPIData
}

interface UseTasksKPIsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useTasksKPIs({ filters, isExecutiveView }: UseTasksKPIsOptions) {
  const [data, setData] = useState<TasksKPIsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasksKPIs = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('preset', filters.dateRange.preset)
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))

      const response = await fetch(`/api/dockinsight/tasks-kpis?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch task KPIs')
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
    fetchTasksKPIs()
  }, [fetchTasksKPIs])

  return { data, loading, error, refetch: fetchTasksKPIs }
}
