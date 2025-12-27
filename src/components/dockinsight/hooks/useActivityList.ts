/**
 * DockInsight 3.0 - Activity List Hook
 */

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActivityItem {
  id: string
  type: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  source: string | null
  sourceGroup: string
  createdAt: string
  agentId: string | null
  agentName: string
  recordId: string
  recordName: string
  recordAddress: string | null
}

interface ActivityListData {
  activities: ActivityItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface UseActivityListParams {
  filters: GlobalFilters
  isExecutiveView: boolean
  sourceGroup?: string | null
  search?: string
  page?: number
  pageSize?: number
}

export function useActivityList({
  filters,
  isExecutiveView,
  sourceGroup,
  search,
  page = 1,
  pageSize = 10
}: UseActivityListParams) {
  const [data, setData] = useState<ActivityListData | null>(null)
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
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      
      if (filters.assigneeIds?.length) {
        params.set('assigneeIds', filters.assigneeIds.join(','))
      }
      if (sourceGroup) {
        params.set('sourceGroup', sourceGroup)
      }
      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/dockinsight/activity-list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity list')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Activity list fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.dateRange.preset, filters.assigneeIds, isExecutiveView, sourceGroup, search, page, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
