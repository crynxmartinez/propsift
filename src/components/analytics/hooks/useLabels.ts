/**
 * DockInsight 2.2.2 Labels Hook
 * 
 * React hook for fetching labels for dimension values.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface LabelData {
  id: string
  name: string
  color?: string
}

interface UseLabelsOptions {
  entityKey: string
  ids: string[]
  enabled?: boolean
}

export function useLabels({
  entityKey,
  ids,
  enabled = true
}: UseLabelsOptions) {
  const [labels, setLabels] = useState<Record<string, LabelData>>({})
  const [loading, setLoading] = useState(false)

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  const fetchLabels = useCallback(async () => {
    if (!enabled || ids.length === 0) return

    const token = getToken()
    if (!token) return

    // Only fetch for entities that have labels
    const labelEntities = ['tags', 'motivations', 'statuses', 'users']
    if (!labelEntities.includes(entityKey)) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/analytics/labels?entity=${entityKey}&ids=${ids.join(',')}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels || {})
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    } finally {
      setLoading(false)
    }
  }, [entityKey, ids, enabled])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  // Helper to get label for an ID
  const getLabel = (id: string | null): string => {
    if (!id) return 'Unknown'
    return labels[id]?.name || id
  }

  return {
    labels,
    loading,
    getLabel
  }
}
