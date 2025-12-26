'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface PieChartWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    groupBy: string
    filters?: Array<{ field: string; operator: string; value: string }>
    limit?: number
  }
  appearance?: {
    colors?: string[]
    showLegend?: boolean
    showLabels?: boolean
    donut?: boolean
    centerText?: string
  } | null
}

interface ChartDataItem {
  label: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export default function PieChartWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: PieChartWidgetProps) {
  const [data, setData] = useState<ChartDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData()
  }, [widgetId, JSON.stringify(config)])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/analytics-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          widgetId,
          type: 'pie_chart',
          config,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
      } else {
        setError('Failed to load data')
      }
    } catch (err) {
      console.error('Error fetching widget data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const colors = appearance?.colors || DEFAULT_COLORS
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  const renderCustomLabel = (props: {
    cx?: number
    cy?: number
    midAngle?: number
    innerRadius?: number
    outerRadius?: number
    percent?: number
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
    if (percent < 0.05) return null // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      <div className="flex-1 min-h-0 relative" style={{ minHeight: 100 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={appearance?.donut ? '50%' : 0}
              outerRadius="80%"
              dataKey="value"
              nameKey="label"
              label={appearance?.showLabels !== false ? renderCustomLabel : false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => {
                const numValue = typeof value === 'number' ? value : 0
                return [`${numValue.toLocaleString()} (${((numValue / total) * 100).toFixed(1)}%)`, '']
              }}
            />
            {appearance?.showLegend !== false && (
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text for donut chart */}
        {appearance?.donut && appearance?.centerText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {total.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {appearance.centerText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
