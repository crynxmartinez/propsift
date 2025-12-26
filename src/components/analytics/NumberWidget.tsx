'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Loader2, LucideIcon } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

// Helper to get icon by name
const getIconByName = (name: string): LucideIcon | null => {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>
  return icons[name] || null
}

interface NumberWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  icon?: string | null
  config: {
    dataSource: string
    metric: string
    field?: string
    filters?: Array<{ field: string; operator: string; value: string }>
    comparison?: string
    prefix?: string
    suffix?: string
  }
  appearance?: {
    color?: string
    showChange?: boolean
    thresholds?: { warning: number; danger: number }
  } | null
}

interface WidgetData {
  value: number
  previousValue?: number
  change?: number
  changePercent?: number
}

export default function NumberWidget({
  widgetId,
  title,
  subtitle,
  icon,
  config,
  appearance,
}: NumberWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null)
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
          type: 'number',
          config,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setData(result)
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

  // Get icon component
  const IconComponent = icon ? getIconByName(icon) : null

  // Format value
  const formatValue = (value: number) => {
    const prefix = config.prefix || ''
    const suffix = config.suffix || ''
    
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M${suffix}`
    }
    if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K${suffix}`
    }
    return `${prefix}${value.toLocaleString()}${suffix}`
  }

  // Get color based on thresholds
  const getValueColor = () => {
    if (!appearance?.thresholds || !data) return 'text-gray-900'
    
    if (data.value <= appearance.thresholds.danger) {
      return 'text-red-600'
    }
    if (data.value <= appearance.thresholds.warning) {
      return 'text-yellow-600'
    }
    return 'text-green-600'
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

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {subtitle && (
            <p className="text-xs text-gray-500 mb-1">{subtitle}</p>
          )}
          <div className={`text-3xl font-bold ${getValueColor()}`}>
            {data ? formatValue(data.value) : '—'}
          </div>
          
          {/* Change indicator */}
          {appearance?.showChange && data?.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {data.change > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : data.change < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-gray-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  data.change > 0
                    ? 'text-green-600'
                    : data.change < 0
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {data.change > 0 ? '+' : ''}
                {data.changePercent?.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">vs previous</span>
            </div>
          )}
        </div>
        
        {IconComponent && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: appearance?.color || '#EBF5FF' }}
          >
            <IconComponent
              className={`w-5 h-5 ${appearance?.color ? 'text-white' : 'text-blue-500'}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
