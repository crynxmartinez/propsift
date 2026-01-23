'use client'

import { cn } from '@/lib/utils'

type CadenceState = 
  | 'NOT_ENROLLED'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'PAUSED'
  | 'COMPLETED_NO_CONTACT'
  | 'EXITED_ENGAGED'
  | 'EXITED_DNC'
  | 'EXITED_DEAD'
  | 'EXITED_CLOSED'
  | 'STALE_ENGAGED'
  | 'LONG_TERM_NURTURE'

interface StateBadgeProps {
  state: CadenceState | string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const STATE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  NOT_ENROLLED: {
    label: 'Not Enrolled',
    icon: '○',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
  },
  ACTIVE: {
    label: 'Active',
    icon: '●',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
  },
  SNOOZED: {
    label: 'Snoozed',
    icon: '💤',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20 border-yellow-500/30',
  },
  PAUSED: {
    label: 'Paused',
    icon: '⏸',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
  },
  COMPLETED_NO_CONTACT: {
    label: 'Completed',
    icon: '✓',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
  },
  EXITED_ENGAGED: {
    label: 'Engaged',
    icon: '🤝',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20 border-emerald-500/30',
  },
  EXITED_DNC: {
    label: 'DNC',
    icon: '🚫',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
  },
  EXITED_DEAD: {
    label: 'Dead',
    icon: '💀',
    color: 'text-gray-500',
    bgColor: 'bg-gray-600/20 border-gray-600/30',
  },
  EXITED_CLOSED: {
    label: 'Closed',
    icon: '🏠',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  STALE_ENGAGED: {
    label: 'Stale',
    icon: '⏰',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 border-amber-500/30',
  },
  LONG_TERM_NURTURE: {
    label: 'Nurture',
    icon: '🌱',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20 border-teal-500/30',
  },
}

export function StateBadge({ state, size = 'md', showIcon = true, className }: StateBadgeProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.NOT_ENROLLED

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  )
}

export default StateBadge
