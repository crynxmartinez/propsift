/**
 * DockInsight 3.0 - Activity Chart Hook
 * 
 * Fetches activity chart data with date range support
 */

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

type DateRangeOption = 'today' | 'last_7_days' | 'last_30_days' | 'custom'

interface ActivityDataPoint {
  label: string
  records: number
  tasks: number
}

interface ActivityChartData {
  data: ActivityDataPoint[]
  isHourly: boolean
  range: string
  startDate: string
  endDate: string
}

interface UseActivityChartParams {
  filters: GlobalFilters
  isExecutiveView: boolean
  range: DateRangeOption
  customStartDate?: Date
  customEndDate?: Date
}

export function useActivityChart({
  filters,
  isExecutiveView,
  range,
  customStartDate,
  customEndDate
}: UseActivityChartParams) {
  const [data, setData] = useState<ActivityChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('range', range)
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) {
        params.set('assigneeIds', filters.assigneeIds.join(','))
      }
      
      if (range === 'custom' && customStartDate) {
        params.set('startDate', customStartDate.toISOString().split('T')[0])
        if (customEndDate) {
          params.set('endDate', customEndDate.toISOString().split('T')[0])
        }
      }

      const response = await fetch(`/api/dockinsight/activity-chart?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity chart data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Activity chart fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.assigneeIds, isExecutiveView, range, customStartDate, customEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
