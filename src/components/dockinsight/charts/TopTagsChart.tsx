/**
 * DockInsight 3.0 Top Tags Chart
 * 
 * Displays top tags as a horizontal bar chart.
 */

'use client'

import { Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ChartDataPoint {
  label: string
  value: number
  color: string
}

interface TopTagsChartProps {
  data: ChartDataPoint[] | null
  loading?: boolean
  onClick?: (tagLabel: string) => void
}

export function TopTagsChart({ data, loading, onClick }: TopTagsChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Top Tags</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
            <YAxis 
              type="category" 
              dataKey="label" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={75}
            />
            <Tooltip 
              formatter={(value) => [Number(value).toLocaleString(), 'Records']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
              cursor={onClick ? 'pointer' : 'default'}
              onClick={(data: any) => onClick?.(data.label)}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
