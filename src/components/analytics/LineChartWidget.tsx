'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface LineChartWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    filters?: Array<{ field: string; operator: string; value: string }>
    timePeriod?: string
    granularity?: string
  }
  appearance?: {
    color?: string
    showArea?: boolean
    showPoints?: boolean
    smooth?: boolean
  } | null
}

interface ChartDataItem {
  date: string
  value: number
  [key: string]: string | number
}

export default function LineChartWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: LineChartWidgetProps) {
  const [data, setData] = useState<ChartDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [widgetId, config])

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
          type: 'line_chart',
          config: {
            ...config,
            timePeriod: config.timePeriod || 'last_30_days',
            granularity: config.granularity || 'daily',
          },
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

  const color = appearance?.color || '#3B82F6'

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

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const ChartComponent = appearance?.showArea ? AreaChart : LineChart

  return (
    <div className="h-full flex flex-col">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      <div className="flex-1 min-h-0" style={{ minHeight: 100 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <ChartComponent
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={formatDate}
            />
            {appearance?.showArea ? (
              <Area
                type={appearance?.smooth ? 'monotone' : 'linear'}
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                dot={appearance?.showPoints !== false}
              />
            ) : (
              <Line
                type={appearance?.smooth ? 'monotone' : 'linear'}
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={appearance?.showPoints !== false}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
