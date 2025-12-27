/**
 * DockInsight 3.0 Motivations Chart
 * 
 * Displays top motivations as bars with temperature line overlay.
 */

'use client'

import { Loader2 } from 'lucide-react'
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  CartesianGrid
} from 'recharts'

interface MotivationData {
  label: string
  total: number
  hot: number
  warm: number
  cold: number
}

interface MotivationsChartProps {
  data: MotivationData[] | null
  loading?: boolean
  onClick?: (motivation: string) => void
}

export function MotivationsChart({ data, loading, onClick }: MotivationsChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Top 10 Motivations with Temperature</h3>
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart 
            data={data} 
            margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              formatter={(value, name) => [
                Number(value).toLocaleString(), 
                name === 'total' ? 'Total' : name === 'hot' ? 'Hot Leads' : String(name)
              ]}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  total: 'Total Records',
                  hot: 'Hot Leads'
                }
                return labels[value] || value
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="total" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              cursor={onClick ? 'pointer' : 'default'}
              onClick={(data: any) => onClick?.(data.label)}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="hot" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
