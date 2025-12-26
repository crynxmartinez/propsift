/**
 * DockInsight 2.2.2 Widget Renderer
 * 
 * Renders the appropriate widget component based on type.
 */

'use client'

import { MetricWidget, ChartWidget, PieWidget, TableWidget } from './widgets'
import { useWidgetData } from './hooks'
import type { WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface WidgetRendererProps {
  config: WidgetConfig
  globalFilters: GlobalFilters
  token: string
  onDrilldown?: (widget: WidgetConfig) => void
}

export function WidgetRenderer({
  config,
  globalFilters,
  token,
  onDrilldown
}: WidgetRendererProps) {
  const { loading, error, data } = useWidgetData({
    widget: config,
    globalFilters,
    token
  })

  const handleClick = () => {
    if (onDrilldown) {
      onDrilldown(config)
    }
  }

  const commonProps = {
    config,
    data,
    loading,
    error,
    onClick: handleClick
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
    default:
      return <MetricWidget {...commonProps} />
  }
}
