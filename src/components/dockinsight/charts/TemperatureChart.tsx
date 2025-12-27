/**
 * DockInsight 3.0 Temperature Chart
 * 
 * Displays records by temperature as a vertical bar chart.
 */

'use client'

import { Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ChartDataPoint {
  label: string
  value: number
  color: string
}

interface TemperatureChartProps {
  data: ChartDataPoint[] | null
  loading?: boolean
  onClick?: (temperature: string) => void
}

export function TemperatureChart({ data, loading, onClick }: TemperatureChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Records by Temperature</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 && data.some(d => d.value > 0) ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              formatter={(value) => [Number(value).toLocaleString(), 'Records']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              cursor={onClick ? 'pointer' : 'default'}
              onClick={(data: any) => onClick?.(data.label.toLowerCase())}
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
