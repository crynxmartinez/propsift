/**
 * DockInsight 2.2.2 Pie Widget
 * 
 * Displays grouped data as a pie chart.
 */

'use client'

import { Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { WidgetConfig, WidgetData } from '../types'

interface PieWidgetProps {
  config: WidgetConfig
  data: WidgetData | null
  loading: boolean
  error: string | null
  onClick?: () => void
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

export function PieWidget({
  config,
  data,
  loading,
  error,
  onClick
}: PieWidgetProps) {
  const chartData = data?.data?.map((item: any, index: number) => ({
    name: item.label || item.value || 'Unknown',
    value: item.count,
    color: COLORS[index % COLORS.length]
  })) || []

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 truncate">
          {config.title}
        </h3>
        {data?.cached && (
          <span className="text-xs text-gray-400">cached</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-red-500 text-center">{error}</div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => String(value ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">No data</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          {config.entityKey}
          {config.dimension && ` by ${config.dimension}`}
        </div>
      </div>
    </div>
  )
}
