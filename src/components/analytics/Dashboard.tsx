/**
 * DockInsight 2.2.2 Dashboard Component
 * 
 * Main dashboard component that combines all analytics UI elements.
 */

'use client'

import { useState } from 'react'
import { GlobalFiltersBar } from './GlobalFiltersBar'
import { DashboardGrid } from './DashboardGrid'
import { DrilldownModal } from './DrilldownModal'
import type { DashboardConfig, WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface DashboardProps {
  initialDashboard: DashboardConfig
  token: string
}

export function Dashboard({ initialDashboard, token }: DashboardProps) {
  const [dashboard] = useState<DashboardConfig>(initialDashboard)
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>(
    initialDashboard.globalFilters || {}
  )
  const [drilldownWidget, setDrilldownWidget] = useState<WidgetConfig | null>(null)

  const handleDrilldown = (widget: WidgetConfig) => {
    setDrilldownWidget(widget)
  }

  const closeDrilldown = () => {
    setDrilldownWidget(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">{dashboard.name}</h1>
        {dashboard.description && (
          <p className="text-sm text-gray-500 mt-1">{dashboard.description}</p>
        )}
      </div>

      {/* Global Filters */}
      <GlobalFiltersBar 
        filters={globalFilters} 
        onChange={setGlobalFilters} 
      />

      {/* Widget Grid */}
      <DashboardGrid
        dashboard={{ ...dashboard, globalFilters }}
        globalFilters={globalFilters}
        token={token}
        onDrilldown={handleDrilldown}
      />

      {/* Drilldown Modal */}
      {drilldownWidget && (
        <DrilldownModal
          widget={drilldownWidget}
          globalFilters={globalFilters}
          token={token}
          onClose={closeDrilldown}
        />
      )}
    </div>
  )
}
