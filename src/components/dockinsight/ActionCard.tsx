/**
 * DockInsight 3.0 Action Card Component
 * 
 * Displays a clickable action card with count and description.
 */

'use client'

import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface ActionCardProps {
  title: string
  count: number | null
  description: string
  icon?: ReactNode
  color: 'blue' | 'orange' | 'green' | 'red'
  loading?: boolean
  onClick?: () => void
}

const colorClasses = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  green: 'bg-green-500 hover:bg-green-600',
  red: 'bg-red-500 hover:bg-red-600'
}

export function ActionCard({
  title,
  count,
  description,
  icon,
  color,
  loading = false,
  onClick
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        ${colorClasses[color]} 
        rounded-lg p-4 text-white text-left w-full
        transition-colors cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <p className="text-sm font-medium opacity-90">{title}</p>
          </div>
          
          {loading ? (
            <div className="mt-2 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <p className="text-3xl font-bold mt-1">
              {count !== null ? count.toLocaleString() : '--'}
            </p>
          )}
          
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
      </div>
    </button>
  )
}
