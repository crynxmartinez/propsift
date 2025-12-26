'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ProgressWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    filters?: Array<{ field: string; operator: string; value: string }>
    goalValue?: number
    goalDataSource?: string
  }
  appearance?: {
    color?: string
    showPercentage?: boolean
    showValues?: boolean
  } | null
}

interface WidgetData {
  value: number
  goal: number
}

export default function ProgressWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: ProgressWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null)
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
          type: 'number',
          config,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setData({
          value: result.value || 0,
          goal: config.goalValue || 100,
        })
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

  const percentage = data ? Math.min((data.value / data.goal) * 100, 100) : 0

  return (
    <div className="h-full flex flex-col justify-center">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      
      {/* Progress bar */}
      <div className="relative">
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        
        {/* Labels */}
        <div className="flex items-center justify-between mt-2">
          {appearance?.showValues !== false && (
            <span className="text-sm font-medium text-gray-900">
              {data?.value.toLocaleString()}
            </span>
          )}
          {appearance?.showPercentage !== false && (
            <span className="text-sm text-gray-500">
              {percentage.toFixed(0)}%
            </span>
          )}
          {appearance?.showValues !== false && (
            <span className="text-sm text-gray-400">
              / {data?.goal.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
