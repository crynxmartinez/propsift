/**
 * DockInsight 2.2.2 Widget Renderer
 * 
 * Renders the appropriate widget component based on type.
 */

'use client'

import { MetricWidget, ChartWidget, PieWidget, TableWidget, LineWidget } from './widgets'
import { useWidgetData } from './hooks'
import type { WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface WidgetRendererProps {
  config: WidgetConfig
  globalFilters: GlobalFilters
  onClick?: () => void
}

export function WidgetRenderer({
  config,
  globalFilters,
  onClick
}: WidgetRendererProps) {
  const { loading, error, data } = useWidgetData({
    widget: config,
    globalFilters
  })

  const commonProps = {
    config,
    data,
    loading,
    error,
    onClick
  }

  switch (config.type) {
    case 'metric':
      return <MetricWidget {...commonProps} />
    case 'chart':
      return <ChartWidget {...commonProps} />
    case 'pie':
      return <PieWidget {...commonProps} />
    case 'table':
      return <TableWidget {...commonProps} />
    case 'line':
      return <LineWidget {...commonProps} />
    default:
      return <MetricWidget {...commonProps} />
  }
}
