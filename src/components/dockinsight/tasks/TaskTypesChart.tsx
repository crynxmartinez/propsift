/**
 * DockInsight 3.0 - Top Task Types Bar Chart
 */

'use client'

import { Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TaskTypeData {
  label: string
  value: number
  color: string
}

interface TaskTypesChartProps {
  data: TaskTypeData[] | null
  loading?: boolean
}

export function TaskTypesChart({ data, loading }: TaskTypesChartProps) {
  const maxValue = data ? Math.max(...data.map(d => d.value), 1) : 1

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Top Task Types</h3>
      
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="flex h-56">
          {/* Legend */}
          <div className="w-24 flex flex-col justify-center space-y-3 pr-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 truncate">{item.label}</span>
              </div>
            ))}
          </div>
          
          {/* Bar Chart */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, maxValue]}
                />
                <YAxis 
                  type="category" 
                  dataKey="label" 
                  hide
                />
                <Tooltip 
                  formatter={(value) => [Number(value).toLocaleString(), 'Tasks']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
          No task type data
        </div>
      )}
    </div>
  )
}
