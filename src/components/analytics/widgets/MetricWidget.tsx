/**
 * DockInsight 2.2.2 Metric Widget
 * 
 * Displays a single metric value with optional comparison.
 */

'use client'

import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { WidgetConfig, WidgetData } from '../types'

interface MetricWidgetProps {
  config: WidgetConfig
  data: WidgetData | null
  loading: boolean
  error: string | null
  onClick?: () => void
}

export function MetricWidget({
  config,
  data,
  loading,
  error,
  onClick
}: MetricWidgetProps) {
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toLocaleString()
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 truncate">
          {config.title}
        </h3>
        {data?.cached && (
          <span className="text-xs text-gray-400">cached</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        ) : error ? (
          <div className="text-sm text-red-500 text-center">{error}</div>
        ) : data?.type === 'single' ? (
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {formatValue(data.value ?? 0)}
            </div>
            {config.segmentKey && (
              <div className="text-xs text-gray-500 mt-1">
                {config.segmentKey}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No data</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          {config.entityKey}
          {config.metric?.key && ` · ${config.metric.key}`}
        </div>
      </div>
    </div>
  )
}
