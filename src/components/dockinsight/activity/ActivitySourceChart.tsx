/**
 * DockInsight 3.0 - Activities by Source Pie Chart
 */

'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Loader2 } from 'lucide-react'

interface SourceData {
  source: string
  group: string
  count: number
}

interface ActivitySourceChartProps {
  data: SourceData[] | null
  loading?: boolean
}

const SOURCE_COLORS: Record<string, string> = {
  'CRM': '#3b82f6',
  'Comments': '#8b5cf6',
  'Bulk Actions': '#f59e0b',
  'Bulk Import': '#10b981',
  'Board': '#ec4899',
  'Automation': '#6366f1',
  'Other': '#6b7280'
}

export function ActivitySourceChart({ data, loading = false }: ActivitySourceChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Activities by Source</h3>
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  // Group data by source group
  const groupedData = data?.reduce((acc, item) => {
    const existing = acc.find(g => g.name === item.group)
    if (existing) {
      existing.value += item.count
    } else {
      acc.push({ name: item.group, value: item.count })
    }
    return acc
  }, [] as { name: string; value: number }[]) || []

  // Sort by value descending
  groupedData.sort((a, b) => b.value - a.value)

  const total = groupedData.reduce((sum, item) => sum + item.value, 0)

  if (!groupedData.length || total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Activities by Source</h3>
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No activity data
        </div>
      </div>
    )
  }

  // Calculate percentages
  const dataWithPercentage = groupedData.map(item => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1)
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Activities by Source</h3>
      <div className="h-52 flex">
        {/* Pie Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentage}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithPercentage.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={SOURCE_COLORS[entry.name] || SOURCE_COLORS['Other']} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [
                  `${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                  ''
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="w-32 flex flex-col justify-center gap-2">
          {dataWithPercentage.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: SOURCE_COLORS[item.name] || SOURCE_COLORS['Other'] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 truncate">{item.name}</div>
                <div className="text-xs font-medium text-gray-900">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
