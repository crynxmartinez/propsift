/**
 * DockInsight 3.0 - useKPIs Hook
 * 
 * Fetches KPI data from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface KPIValue {
  current: number
  previous: number
}

interface KPIsData {
  totalRecords: KPIValue
  hotRecords: KPIValue
  callReady: KPIValue
  tasksDue: KPIValue
}

interface UseKPIsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useKPIs({ filters, isExecutiveView }: UseKPIsOptions) {
  const [data, setData] = useState<KPIsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKPIs = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('preset', filters.dateRange.preset)
      params.set('executive', String(isExecutiveView))
      
      if (filters.market) params.set('market', filters.market)
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))
      if (filters.temperature?.length) params.set('temperature', filters.temperature.join(','))
      if (filters.tagIds?.length) params.set('tagIds', filters.tagIds.join(','))
      if (filters.motivationIds?.length) params.set('motivationIds', filters.motivationIds.join(','))
      if (filters.callReady !== undefined) params.set('callReady', String(filters.callReady))

      const response = await fetch(`/api/dockinsight/kpis?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch KPIs')
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
    fetchKPIs()
  }, [fetchKPIs])

  return { data, loading, error, refetch: fetchKPIs }
}
