'use client'

import { cn } from '@/lib/utils'

type QueueTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

interface QueueTierBadgeProps {
  tier: QueueTier | number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TIER_CONFIG: Record<number, { name: string; icon: string; color: string; bgColor: string }> = {
  1: { name: 'Callbacks', icon: '🔔', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
  2: { name: 'New Leads', icon: '⚡', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  3: { name: 'Blitz', icon: '🔥', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
  4: { name: 'Tasks Due', icon: '✅', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  5: { name: 'Cadence', icon: '📞', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
  6: { name: 'Queue', icon: '📋', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20 border-indigo-500/30' },
  7: { name: 'Verify', icon: '🔍', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30' },
  8: { name: 'Get #s', icon: '📱', color: 'text-pink-400', bgColor: 'bg-pink-500/20 border-pink-500/30' },
  9: { name: 'Nurture', icon: '🌱', color: 'text-teal-400', bgColor: 'bg-teal-500/20 border-teal-500/30' },
}

export function QueueTierBadge({ tier, showLabel = true, size = 'md', className }: QueueTierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[9]

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
      title={`Tier ${tier}: ${config.name}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.name}</span>}
    </span>
  )
}

export default QueueTierBadge
