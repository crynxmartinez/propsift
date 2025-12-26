'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface GaugeWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    field?: string
    filters?: Array<{ field: string; operator: string; value: string }>
    timePeriod?: string
    goalValue?: number
  }
  appearance?: {
    color?: string
    showPercentage?: boolean
    thresholds?: { warning: number; danger: number }
  } | null
}

export default function GaugeWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: GaugeWidgetProps) {
  const [value, setValue] = useState<number>(0)
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
          type: 'gauge',
          config,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setValue(result.value || 0)
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

  const goalValue = config.goalValue || 100
  const percentage = Math.min(100, Math.max(0, (value / goalValue) * 100))
  
  // Determine color based on thresholds
  let gaugeColor = appearance?.color || '#3B82F6'
  if (appearance?.thresholds) {
    if (percentage <= appearance.thresholds.danger) {
      gaugeColor = '#EF4444' // red
    } else if (percentage <= appearance.thresholds.warning) {
      gaugeColor = '#F59E0B' // yellow
    } else {
      gaugeColor = '#10B981' // green
    }
  }

  // SVG arc calculation
  const size = 120
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * Math.PI // Half circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="h-full flex flex-col items-center justify-center">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      
      <div className="relative">
        <svg
          width={size}
          height={size / 2 + 20}
          className="transform -rotate-0"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        
        {/* Center value */}
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <span className="text-2xl font-bold text-gray-900">
              {value.toLocaleString()}
            </span>
            {appearance?.showPercentage !== false && (
              <span className="text-sm text-gray-500 ml-1">
                ({percentage.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Goal indicator */}
      <div className="text-xs text-gray-500 mt-1">
        Goal: {goalValue.toLocaleString()}
      </div>
    </div>
  )
}
