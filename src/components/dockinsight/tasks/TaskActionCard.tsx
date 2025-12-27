/**
 * DockInsight 3.0 - Task Action Card
 */

'use client'

import { Loader2 } from 'lucide-react'

interface TaskActionCardProps {
  title: string
  count: number | null
  color: 'blue' | 'red' | 'orange' | 'yellow' | 'green'
  loading?: boolean
  active?: boolean
  onClick?: () => void
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    activeBg: 'bg-blue-600',
    text: 'text-white'
  },
  red: {
    bg: 'bg-red-500',
    activeBg: 'bg-red-600',
    text: 'text-white'
  },
  orange: {
    bg: 'bg-orange-500',
    activeBg: 'bg-orange-600',
    text: 'text-white'
  },
  yellow: {
    bg: 'bg-yellow-500',
    activeBg: 'bg-yellow-600',
    text: 'text-white'
  },
  green: {
    bg: 'bg-green-500',
    activeBg: 'bg-green-600',
    text: 'text-white'
  }
}

export function TaskActionCard({ 
  title, 
  count, 
  color, 
  loading, 
  active,
  onClick 
}: TaskActionCardProps) {
  const colors = colorClasses[color]
  
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-lg transition-all
        ${active ? colors.activeBg : colors.bg}
        ${colors.text}
        ${onClick ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}
        ${active ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
      `}
    >
      {loading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold">
            {count !== null ? count.toLocaleString() : '-'}
          </div>
          <div className="text-sm opacity-90">{title}</div>
        </>
      )}
    </button>
  )
}
