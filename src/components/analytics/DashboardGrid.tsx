/**
 * DockInsight 2.2.2 Dashboard Grid
 * 
 * Renders widgets in a responsive grid layout.
 */

'use client'

import { useState } from 'react'
import { WidgetRenderer } from './WidgetRenderer'
import type { WidgetConfig, DashboardConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface DashboardGridProps {
  dashboard: DashboardConfig
  globalFilters: GlobalFilters
  token: string
  onDrilldown?: (widget: WidgetConfig) => void
}

export function DashboardGrid({
  dashboard,
  globalFilters,
  token,
  onDrilldown
}: DashboardGridProps) {
  // Sort widgets by position for consistent rendering
  const sortedWidgets = [...dashboard.widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })

  return (
    <div className="p-4">
      <div className="grid grid-cols-12 gap-4 auto-rows-min">
        {sortedWidgets.map(widget => (
          <div
            key={widget.id}
            className="min-h-[200px]"
            style={{
              gridColumn: `span ${widget.w}`,
              gridRow: `span ${widget.h}`
            }}
          >
            <WidgetRenderer
              config={widget}
              globalFilters={globalFilters}
              token={token}
              onDrilldown={onDrilldown}
            />
          </div>
        ))}
      </div>

      {sortedWidgets.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium">No widgets yet</p>
            <p className="text-sm mt-1">Add widgets to your dashboard to get started</p>
          </div>
        </div>
      )}
    </div>
  )
}
