/**
 * DockInsight 3.0 - useTables Hook
 * 
 * Fetches table data from the API with filters applied.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActivityItem {
  id: string
  recordName: string
  assigneeId: string | null
  assigneeName: string | null
  lastActivityAt: string
}

interface AssigneeStats {
  id: string
  name: string
  recordCount: number
}

interface TablesData {
  recentActivity: ActivityItem[]
  topAssignees: AssigneeStats[]
}

interface UseTablesOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useTables({ filters, isExecutiveView }: UseTablesOptions) {
  const [data, setData] = useState<TablesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTables = useCallback(async () => {
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

      const response = await fetch(`/api/dockinsight/tables?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tables')
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
    fetchTables()
  }, [fetchTables])

  return { data, loading, error, refetch: fetchTables }
}
