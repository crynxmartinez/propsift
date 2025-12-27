/**
 * DockInsight 3.0 - useActivity Hook
 * 
 * Fetches activity data from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActivityKPIs {
  recordsCreatedToday: number
  recordsCreatedThisWeek: number
  tasksCompletedToday: number
  tasksCompletedThisWeek: number
}

interface DayActivity {
  date: string
  records: number
  tasks: number
}

interface ActivityFeedItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  userId: string
  userName: string
}

interface ActivityData {
  kpis: ActivityKPIs
  activityByDay: DayActivity[]
  activityFeed: ActivityFeedItem[]
}

interface UseActivityOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useActivity({ filters, isExecutiveView }: UseActivityOptions) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))

      const response = await fetch(`/api/dockinsight/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
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
    fetchActivity()
  }, [fetchActivity])

  return { data, loading, error, refetch: fetchActivity }
}
