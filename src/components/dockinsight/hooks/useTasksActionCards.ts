/**
 * DockInsight 3.0 - useTasksActionCards Hook
 * 
 * Fetches task action card counts from the API.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GlobalFilters } from '../types'

interface ActionCardData {
  count: number
  filterKey: string
}

interface TasksActionCardsData {
  openPlusOverdue: ActionCardData
  overdue: ActionCardData
  dueTomorrow: ActionCardData
  dueNext7Days: ActionCardData
  completed: ActionCardData
}

interface UseTasksActionCardsOptions {
  filters: GlobalFilters
  isExecutiveView: boolean
}

export function useTasksActionCards({ filters, isExecutiveView }: UseTasksActionCardsOptions) {
  const [data, setData] = useState<TasksActionCardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasksActionCards = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('executive', String(isExecutiveView))
      
      if (filters.assigneeIds?.length) params.set('assigneeIds', filters.assigneeIds.join(','))

      const response = await fetch(`/api/dockinsight/tasks-action-cards?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch task action cards')
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
    fetchTasksActionCards()
  }, [fetchTasksActionCards])

  return { data, loading, error, refetch: fetchTasksActionCards }
}
