/**
 * DockInsight 3.0 KPI Card Component
 * 
 * Displays a single KPI metric with value and % change indicator.
 */

'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number | null
  previousValue?: number | null
  loading?: boolean
  format?: 'number' | 'currency' | 'percent'
  valueColor?: string
  onClick?: () => void
}

export function KPICard({
  title,
  value,
  previousValue,
  loading = false,
  format = 'number',
  valueColor = 'text-gray-900',
  onClick
}: KPICardProps) {
  // Calculate percent change
  const percentChange = calculatePercentChange(value, previousValue)
  
  // Format the value
  const formattedValue = formatValue(value, format)
  
  // Determine trend direction
  const trend = percentChange === null ? 'neutral' : percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral'

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {/* Title */}
      <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
      
      {/* Value and Change */}
      <div className="flex items-end justify-between mt-2">
        {/* Main Value */}
        <div className="flex-1">
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className={`text-3xl font-bold ${valueColor}`}>
              {formattedValue}
            </p>
          )}
        </div>
        
        {/* Percent Change Badge */}
        {percentChange !== null && !loading && (
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium
            ${trend === 'up' ? 'bg-green-100 text-green-700' : ''}
            ${trend === 'down' ? 'bg-red-100 text-red-700' : ''}
            ${trend === 'neutral' ? 'bg-gray-100 text-gray-600' : ''}
          `}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            <span>
              {trend === 'up' ? '+' : ''}{percentChange.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function calculatePercentChange(current: number | null, previous: number | null | undefined): number | null {
  if (current === null || previous === null || previous === undefined) return null
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function formatValue(value: number | null, format: 'number' | 'currency' | 'percent'): string {
  if (value === null) return '--'
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}
