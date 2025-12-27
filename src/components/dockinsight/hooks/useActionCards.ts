/**
 * DockInsight 3.0 - useActionCards Hook
 * 
 * Fetches action card counts from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActionCardData {
  count: number
  filterKey: string
}

interface ActionCardsData {
  hotUnassigned: ActionCardData
  noPhone: ActionCardData
  callReady: ActionCardData
  staleLeads: ActionCardData
}

interface UseActionCardsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useActionCards({ filters, isExecutiveView }: UseActionCardsOptions) {
  const [data, setData] = useState<ActionCardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActionCards = useCallback(async () => {
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
      if (filters.motivationIds?.length) params.set('motivationIds', filters.motivationIds.join(','))
      if (filters.callReady !== undefined) params.set('callReady', String(filters.callReady))

      const response = await fetch(`/api/dockinsight/action-cards?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch action cards')
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
    fetchActionCards()
  }, [fetchActionCards])

  return { data, loading, error, refetch: fetchActionCards }
}
