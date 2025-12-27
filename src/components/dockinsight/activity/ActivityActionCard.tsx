/**
 * DockInsight 3.0 - Activity Action Card
 */

'use client'

import { Loader2 } from 'lucide-react'

interface ActivityActionCardProps {
  title: string
  count: number | null
  icon: React.ReactNode
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
  loading?: boolean
  active?: boolean
  onClick?: () => void
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    activeBg: 'bg-blue-600',
    icon: 'bg-blue-100 text-blue-600'
  },
  green: {
    bg: 'bg-green-500',
    activeBg: 'bg-green-600',
    icon: 'bg-green-100 text-green-600'
  },
  orange: {
    bg: 'bg-orange-500',
    activeBg: 'bg-orange-600',
    icon: 'bg-orange-100 text-orange-600'
  },
  purple: {
    bg: 'bg-purple-500',
    activeBg: 'bg-purple-600',
    icon: 'bg-purple-100 text-purple-600'
  },
  red: {
    bg: 'bg-red-500',
    activeBg: 'bg-red-600',
    icon: 'bg-red-100 text-red-600'
  },
  gray: {
    bg: 'bg-gray-500',
    activeBg: 'bg-gray-600',
    icon: 'bg-gray-100 text-gray-600'
  }
}

export function ActivityActionCard({
  title,
  count,
  icon,
  color,
  loading = false,
  active = false,
  onClick
}: ActivityActionCardProps) {
  const colors = colorClasses[color]

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg text-white text-left transition-all
        ${active ? colors.activeBg : colors.bg}
        ${onClick ? 'hover:opacity-90 cursor-pointer' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
        <div>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="text-xl font-bold">
              {count !== null ? count.toLocaleString() : '--'}
            </div>
          )}
          <div className="text-xs opacity-90">{title}</div>
        </div>
      </div>
    </button>
  )
}
