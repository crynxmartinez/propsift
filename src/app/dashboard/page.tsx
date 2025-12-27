'use client'

import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/analytics'
import type { DashboardConfig } from '@/components/analytics'
import { Loader2, BarChart3 } from 'lucide-react'

// Default dashboard configuration
const DEFAULT_DASHBOARD: DashboardConfig = {
  id: 'default',
  name: 'Analytics Dashboard',
  description: 'Overview of your records and activities',
  widgets: [
    {
      id: 'total-records',
      title: 'Total Records',
      type: 'metric',
      entityKey: 'records',
      metric: { key: 'count' },
      x: 0,
      y: 0,
      w: 3,
      h: 1
    },
    {
      id: 'total-tasks',
      title: 'Total Tasks',
      type: 'metric',
      entityKey: 'tasks',
      metric: { key: 'count' },
      x: 3,
      y: 0,
      w: 3,
      h: 1
    },
    {
      id: 'hot-leads',
      title: 'Hot Leads',
      type: 'metric',
      entityKey: 'records',
      segmentKey: 'records:hot',
      metric: { key: 'count' },
      x: 6,
      y: 0,
      w: 3,
      h: 1
    },
    {
      id: 'with-phone',
      title: 'With Phone',
      type: 'metric',
      entityKey: 'records',
      segmentKey: 'records:with_phone',
      metric: { key: 'count' },
      x: 9,
      y: 0,
      w: 3,
      h: 1
    },
    {
      id: 'records-by-completion',
      title: 'Records by Completion',
      type: 'chart',
      entityKey: 'records',
      metric: { key: 'count' },
      dimension: 'isComplete',
      x: 0,
      y: 1,
      w: 6,
      h: 2
    },
    {
      id: 'records-by-contact',
      title: 'Records by Contact Status',
      type: 'pie',
      entityKey: 'records',
      metric: { key: 'count' },
      dimension: 'isContact',
      x: 6,
      y: 1,
      w: 6,
      h: 2
    },
    {
      id: 'records-by-city',
      title: 'Records by City',
      type: 'table',
      entityKey: 'records',
      metric: { key: 'count' },
      dimension: 'city',
      limit: 10,
      x: 0,
      y: 3,
      w: 6,
      h: 2
    },
    {
      id: 'records-by-state',
      title: 'Records by State',
      type: 'chart',
      entityKey: 'records',
      metric: { key: 'count' },
      dimension: 'state',
      limit: 10,
      x: 6,
      y: 3,
      w: 6,
      h: 2
    }
  ],
  globalFilters: {
    dateRange: { preset: 'all_time' }
  }
}

export default function DockInsightPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      window.location.href = '/login'
      return
    }
    setToken(storedToken)
    setLoading(false)
  }, [])

  if (loading || !token) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <Dashboard 
        initialDashboard={DEFAULT_DASHBOARD} 
        token={token} 
      />
    </div>
  )
}
