'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trophy, Medal, Award } from 'lucide-react'

interface LeaderboardWidgetProps {
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
    sortOrder?: string
  }
  appearance?: {
    showRank?: boolean
    showAvatar?: boolean
    showValue?: boolean
    showBar?: boolean
    colors?: string[]
  } | null
}

interface LeaderboardItem {
  name: string
  value: number
  avatar?: string
  change?: number
}

export default function LeaderboardWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: LeaderboardWidgetProps) {
  const [data, setData] = useState<LeaderboardItem[]>([])
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
          type: 'leaderboard',
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

  const maxValue = Math.max(...data.map(d => d.value))
  const colors = appearance?.colors || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-500" />
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />
      default:
        return <span className="w-4 h-4 text-xs text-gray-400 flex items-center justify-center">{rank}</span>
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100
          const color = colors[index % colors.length]
          
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Rank */}
              {appearance?.showRank !== false && (
                <div className="flex-shrink-0 w-6">
                  {getRankIcon(index + 1)}
                </div>
              )}
              
              {/* Avatar */}
              {appearance?.showAvatar !== false && (
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: color }}
                >
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(item.name)
                  )}
                </div>
              )}
              
              {/* Name and bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </span>
                  {appearance?.showValue !== false && (
                    <span className="text-sm font-semibold text-gray-700 ml-2">
                      {item.value.toLocaleString()}
                    </span>
                  )}
                </div>
                
                {/* Progress bar */}
                {appearance?.showBar !== false && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Change indicator */}
              {item.change !== undefined && (
                <div className={`text-xs font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
