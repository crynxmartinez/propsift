/**
 * DockInsight 3.0 - Activity Agents Hook
 */

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface AgentData {
  id: string
  name: string
  activityCount: number
  tasksCompleted: number
}

interface UseActivityAgentsParams {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useActivityAgents({ filters, isExecutiveView }: UseActivityAgentsParams) {
  const [data, setData] = useState<AgentData[] | null>(null)
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

      const response = await fetch(`/api/dockinsight/activity-agents?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity agents')
      }

      const result = await response.json()
      setData(result.agents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Activity agents fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.dateRange.preset, isExecutiveView])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
