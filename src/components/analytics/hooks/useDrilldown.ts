/**
 * DockInsight 2.2.2 Drilldown Hook
 * 
 * React hook for fetching drilldown data with pagination and search.
 */

'use client'

import { useState, useCallback } from 'react'
import type { WidgetConfig, DrilldownData } from '../types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface UseDrilldownOptions {
  widget: WidgetConfig
  globalFilters: GlobalFilters
  token: string
}

interface DrilldownState {
  loading: boolean
  error: string | null
  data: DrilldownData | null
}

export function useDrilldown({
  widget,
  globalFilters,
  token
}: UseDrilldownOptions) {
  const [state, setState] = useState<DrilldownState>({
    loading: false,
    error: null,
    data: null
  })

  const fetchDrilldown = useCallback(async (
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/analytics/drilldown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: {
            entityKey: widget.entityKey,
            segmentKey: widget.segmentKey,
            metric: widget.metric,
            filters: widget.filters || [],
            globalFilters,
            dateRange: widget.dateRange,
            dateMode: widget.dateMode
          },
          page,
          pageSize,
          search
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch drilldown data')
      }

      const result = await response.json()

      setState({
        loading: false,
        error: null,
        data: {
          rows: result.rows,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      })

      return result
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      })
      return null
    }
  }, [widget, globalFilters, token])

  return {
    ...state,
    fetchDrilldown
  }
}
