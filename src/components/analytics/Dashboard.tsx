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
  config: DashboardConfig
}

export function Dashboard({ config }: DashboardProps) {
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>(
    config.globalFilters || {}
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
        <h1 className="text-xl font-semibold text-gray-900">{config.name}</h1>
        {config.description && (
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        )}
      </div>

      {/* Global Filters */}
      <GlobalFiltersBar 
        filters={globalFilters} 
        onChange={setGlobalFilters} 
      />

      {/* Widget Grid */}
      <DashboardGrid
        widgets={config.widgets}
        globalFilters={globalFilters}
        onWidgetClick={handleDrilldown}
      />

      {/* Drilldown Modal */}
      {drilldownWidget && (
        <DrilldownModal
          widget={drilldownWidget}
          globalFilters={globalFilters}
          onClose={closeDrilldown}
        />
      )}
    </div>
  )
}
