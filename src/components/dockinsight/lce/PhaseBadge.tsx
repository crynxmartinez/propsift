'use client'

import { cn } from '@/lib/utils'

type CadencePhase = 'NEW' | 'BLITZ_1' | 'DEEP_PROSPECT' | 'BLITZ_2' | 'TEMPERATURE' | 'COMPLETED' | 'ENGAGED' | 'NURTURE'

interface PhaseBadgeProps {
  phase: CadencePhase | string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const PHASE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  NEW: {
    label: 'New',
    icon: '⚡',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  BLITZ_1: {
    label: 'Blitz 1',
    icon: '🔥',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
  },
  DEEP_PROSPECT: {
    label: 'Deep Prospect',
    icon: '🔍',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
  },
  BLITZ_2: {
    label: 'Blitz 2',
    icon: '🔥',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
  },
  TEMPERATURE: {
    label: 'Cadence',
    icon: '📞',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
  },
  COMPLETED: {
    label: 'Completed',
    icon: '✅',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
  },
  ENGAGED: {
    label: 'Engaged',
    icon: '🤝',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20 border-emerald-500/30',
  },
  NURTURE: {
    label: 'Nurture',
    icon: '🌱',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20 border-teal-500/30',
  },
}

export function PhaseBadge({ phase, size = 'md', showIcon = true, className }: PhaseBadgeProps) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.NEW

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

export default PhaseBadge
