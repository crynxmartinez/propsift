'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Phone } from 'lucide-react'

interface PhoneExhaustedAlertProps {
  exhaustedAt?: Date | string | null
  onSkipTrace?: () => void
  className?: string
}

export function PhoneExhaustedAlert({ exhaustedAt, onSkipTrace, className }: PhoneExhaustedAlertProps) {
  if (!exhaustedAt) return null

  const exhaustedDate = typeof exhaustedAt === 'string' ? new Date(exhaustedAt) : exhaustedAt

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30',
        className
      )}
    >
      <div className="flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-400">All phones exhausted</p>
        <p className="text-xs text-red-400/70">
          Since {exhaustedDate.toLocaleDateString()}
        </p>
      </div>
      {onSkipTrace && (
        <button
          type="button"
          onClick={onSkipTrace}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Skip Trace</span>
        </button>
      )}
    </div>
  )
}

export default PhoneExhaustedAlert
