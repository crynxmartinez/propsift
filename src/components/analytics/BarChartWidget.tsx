'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface BarChartWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    groupBy: string
    filters?: Array<{ field: string; operator: string; value: string }>
    sortBy?: string
    sortOrder?: string
    limit?: number
  }
  appearance?: {
    colors?: string[]
    showValues?: boolean
    showLegend?: boolean
    horizontal?: boolean
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

export default function BarChartWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: BarChartWidgetProps) {
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
          type: 'bar_chart',
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

  return (
    <div className="h-full flex flex-col">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      <div className="flex-1 min-h-0" style={{ minHeight: 100 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <BarChart
            data={data}
            layout={appearance?.horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {appearance?.horizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              label={
                appearance?.showValues
                  ? { position: 'top', fontSize: 10, fill: '#6B7280' }
                  : false
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
