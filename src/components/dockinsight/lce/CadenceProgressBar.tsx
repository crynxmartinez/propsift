'use client'

import { cn } from '@/lib/utils'

interface CadenceProgressBarProps {
  step: number
  totalSteps: number
  cadenceType?: string | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const CADENCE_COLORS: Record<string, string> = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-blue-500',
  ICE: 'bg-cyan-500',
  GENTLE: 'bg-purple-500',
  ANNUAL: 'bg-teal-500',
  BLITZ: 'bg-orange-500',
}

export function CadenceProgressBar({
  step,
  totalSteps,
  cadenceType,
  size = 'md',
  showLabel = true,
  className,
}: CadenceProgressBarProps) {
  const progress = totalSteps > 0 ? (step / totalSteps) * 100 : 0
  const barColor = cadenceType ? CADENCE_COLORS[cadenceType] || 'bg-green-500' : 'bg-green-500'

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  if (totalSteps === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-white/10 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-white/60 font-medium min-w-[40px] text-right">
          {step}/{totalSteps}
        </span>
      )}
    </div>
  )
}

export default CadenceProgressBar
