/**
 * DockInsight 3.0 - Activity KPIs Hook
 */

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActivityKPIsData {
  totalActivities: { current: number; previous: number }
  recordUpdates: { current: number; previous: number }
  tasksCompleted: { current: number; previous: number }
  recordsCreated: { current: number; previous: number }
  sourceBreakdown: { source: string; group: string; count: number }[]
}

interface UseActivityKPIsParams {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useActivityKPIs({ filters, isExecutiveView }: UseActivityKPIsParams) {
  const [data, setData] = useState<ActivityKPIsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('preset', filters.dateRange.preset)
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) {
        params.set('assigneeIds', filters.assigneeIds.join(','))
      }

      const response = await fetch(`/api/dockinsight/activity-kpis?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity KPIs')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Activity KPIs fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.dateRange.preset, filters.assigneeIds, isExecutiveView])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
