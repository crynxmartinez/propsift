/**
 * DockInsight 3.0 Top Tags List
 * 
 * Displays top 10 tags as a simple list with counts.
 */

'use client'

import { Loader2, Tag } from 'lucide-react'

interface ChartDataPoint {
  label: string
  value: number
  color: string
}

interface TopTagsChartProps {
  data: ChartDataPoint[] | null
  loading?: boolean
  onClick?: (tagId: string) => void
}

export function TopTagsChart({ data, loading }: TopTagsChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Top 10 Tags</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2 overflow-y-auto max-h-52">
          {data.slice(0, 10).map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 ml-2">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No tags found
        </div>
      )}
    </div>
  )
}
