/**
 * DockInsight 2.2.2 Widget Data Hook
 * 
 * React hook for fetching widget data with caching.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WidgetConfig, WidgetData, WidgetState } from '../types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface UseWidgetDataOptions {
  widget: WidgetConfig
  globalFilters: GlobalFilters
  enabled?: boolean
}

export function useWidgetData({
  widget,
  globalFilters,
  enabled = true
}: UseWidgetDataOptions): WidgetState & { refetch: () => void } {
  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }
  const [state, setState] = useState<WidgetState>({
    loading: false,
    error: null,
    data: null
  })

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    const token = getToken()
    if (!token) {
      setState({ loading: false, error: 'Not authenticated', data: null })
      return
    }

    try {
      const response = await fetch('/api/analytics/widget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entityKey: widget.entityKey,
          segmentKey: widget.segmentKey,
          metric: widget.metric,
          dimension: widget.dimension,
          filters: widget.filters || [],
          globalFilters,
          dateRange: widget.dateRange,
          dateMode: widget.dateMode,
          granularity: widget.granularity,
          sort: widget.sort,
          limit: widget.limit
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch widget data')
      }

      const result = await response.json()

      setState({
        loading: false,
        error: null,
        data: {
          type: result.type,
          value: result.value,
          dimension: result.dimension,
          data: result.data,
          total: result.total,
          cached: result.cached,
          cachedAt: result.cachedAt
        }
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      })
    }
  }, [widget, globalFilters, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...state,
    refetch: fetchData
  }
}
