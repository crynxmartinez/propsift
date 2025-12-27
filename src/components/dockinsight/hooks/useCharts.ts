/**
 * DockInsight 3.0 - useCharts Hook
 * 
 * Fetches chart data from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ChartDataPoint {
  label: string
  value: number
  color: string
}

interface MotivationData {
  label: string
  total: number
  hot: number
  warm: number
  cold: number
}

interface ChartsData {
  temperature: ChartDataPoint[]
  tags: ChartDataPoint[]
  motivations: MotivationData[]
}

interface UseChartsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useCharts({ filters, isExecutiveView }: UseChartsOptions) {
  const [data, setData] = useState<ChartsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCharts = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      
      if (filters.market) params.set('market', filters.market)
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))
      if (filters.temperature?.length) params.set('temperature', filters.temperature.join(','))
      if (filters.tagIds?.length) params.set('tagIds', filters.tagIds.join(','))
      if (filters.callReady !== undefined) params.set('callReady', String(filters.callReady))

      const response = await fetch(`/api/dockinsight/charts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch charts')
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
    fetchCharts()
  }, [fetchCharts])

  return { data, loading, error, refetch: fetchCharts }
}
