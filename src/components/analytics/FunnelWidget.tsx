'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface FunnelWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    metric: string
    groupBy?: string
    filters?: Array<{ field: string; operator: string; value: string }>
    timePeriod?: string
    limit?: number
  }
  appearance?: {
    showValues?: boolean
    showPercentage?: boolean
    colors?: string[]
  } | null
}

interface FunnelItem {
  name: string
  value: number
}

export default function FunnelWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: FunnelWidgetProps) {
  const [data, setData] = useState<FunnelItem[]>([])
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
          type: 'funnel',
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

  const maxValue = data[0]?.value || 1
  const colors = appearance?.colors || [
    '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      
      <div className="flex-1 flex flex-col justify-center space-y-1">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100
          const widthPercentage = Math.max(20, percentage) // Minimum 20% width for visibility
          const conversionRate = index > 0 ? ((item.value / data[index - 1].value) * 100).toFixed(1) : null
          const color = colors[index % colors.length]
          
          return (
            <div key={index} className="relative">
              {/* Funnel bar */}
              <div
                className="mx-auto rounded-sm py-2 px-3 flex items-center justify-between transition-all duration-300"
                style={{
                  width: `${widthPercentage}%`,
                  backgroundColor: color,
                  minHeight: '36px',
                }}
              >
                <span className="text-white text-sm font-medium truncate">
                  {item.name}
                </span>
                <div className="flex items-center gap-2 text-white">
                  {appearance?.showValues !== false && (
                    <span className="text-sm font-semibold">
                      {item.value.toLocaleString()}
                    </span>
                  )}
                  {appearance?.showPercentage !== false && (
                    <span className="text-xs opacity-80">
                      ({percentage.toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
              
              {/* Conversion rate arrow */}
              {conversionRate && index < data.length && (
                <div className="absolute -right-16 top-1/2 -translate-y-1/2 text-xs text-gray-500 hidden lg:block">
                  → {conversionRate}%
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Summary */}
      {data.length >= 2 && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-500">
            Overall conversion: {((data[data.length - 1].value / data[0].value) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
