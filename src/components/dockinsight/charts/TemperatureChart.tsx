/**
 * DockInsight 3.0 Temperature Chart
 * 
 * Displays records by temperature as a pie chart.
 */

'use client'

import { Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
  // Filter out zero values for cleaner pie chart
  const filteredData = data?.filter(d => d.value > 0) || []
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Records by Temperature</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={filteredData as any[]}
              cx="50%"
              cy="45%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              cursor={onClick ? 'pointer' : 'default'}
              onClick={(data: any) => onClick?.(data.label.toLowerCase().replace(' ', '_'))}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [Number(value).toLocaleString(), 'Records']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
