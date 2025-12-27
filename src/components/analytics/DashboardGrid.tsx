/**
 * DockInsight 2.2.2 Dashboard Grid
 * 
 * Renders widgets in a responsive grid layout with edit/delete actions.
 */

'use client'

import { Edit2, Trash2 } from 'lucide-react'
import { WidgetRenderer } from './WidgetRenderer'
import type { WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface DashboardGridProps {
  widgets: WidgetConfig[]
  globalFilters: GlobalFilters
  onWidgetClick?: (widget: WidgetConfig) => void
  onWidgetEdit?: (widget: WidgetConfig) => void
  onWidgetDelete?: (widgetId: string) => void
}

export function DashboardGrid({
  widgets,
  globalFilters,
  onWidgetClick,
  onWidgetEdit,
  onWidgetDelete
}: DashboardGridProps) {
  // Sort widgets by position for consistent rendering
  const sortedWidgets = [...widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {sortedWidgets.map(widget => (
        <div
          key={widget.id}
          className="relative group min-h-[200px]"
          style={{
            gridColumn: `span ${widget.w}`,
            gridRow: `span ${widget.h}`
          }}
        >
          {/* Widget actions overlay */}
          {(onWidgetEdit || onWidgetDelete) && (
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {onWidgetEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onWidgetEdit(widget)
                  }}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-50"
                  title="Edit widget"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {onWidgetDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onWidgetDelete(widget.id)
                  }}
                  className="p-1.5 bg-white rounded shadow hover:bg-gray-50"
                  title="Delete widget"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          )}
          
          <WidgetRenderer
            config={widget}
            globalFilters={globalFilters}
            onClick={onWidgetClick ? () => onWidgetClick(widget) : undefined}
          />
        </div>
      ))}
    </div>
  )
}
