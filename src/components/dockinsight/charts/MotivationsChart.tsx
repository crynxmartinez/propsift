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
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Top Motivations</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart 
            data={data.slice(0, 5)} 
            margin={{ top: 5, right: 5, left: 0, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={30}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value, name) => [
                Number(value).toLocaleString(), 
                name === 'total' ? 'Total' : name === 'hot' ? 'Hot' : String(name)
              ]}
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
              yAxisId="left"
              type="monotone" 
              dataKey="hot" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
