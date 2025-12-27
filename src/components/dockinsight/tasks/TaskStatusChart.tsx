/**
 * DockInsight 3.0 - Tasks by Status Pie Chart
 */

'use client'

import { Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface StatusData {
  label: string
  value: number
  color: string
}

interface TaskStatusChartProps {
  data: StatusData[] | null
  loading?: boolean
}

export function TaskStatusChart({ data, loading }: TaskStatusChartProps) {
  const total = data?.reduce((sum, item) => sum + item.value, 0) || 0
  
  // Calculate percentages
  const dataWithPercent = data?.map(item => ({
    ...item,
    percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
  })) || []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Tasks by Status</h3>
      
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : dataWithPercent.length > 0 ? (
        <div className="flex h-56">
          {/* Pie Chart */}
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithPercent as any[]}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="label"
                >
                  {dataWithPercent.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [Number(value).toLocaleString(), 'Tasks']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="w-1/2 flex flex-col justify-center space-y-2">
            {dataWithPercent.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.label}</span>
                </div>
                <span className="text-gray-900 font-medium">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
          No task data
        </div>
      )}
    </div>
  )
}
