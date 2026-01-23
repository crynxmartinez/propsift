'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, ChevronDown } from 'lucide-react'

interface SnoozeDropdownProps {
  onSnooze: (hours: number) => void
  disabled?: boolean
  className?: string
}

const SNOOZE_OPTIONS = [
  { label: '1 Hour', hours: 1, icon: '⏰' },
  { label: 'Tomorrow', hours: 24, icon: '📅' },
  { label: '3 Days', hours: 72, icon: '📆' },
  { label: '1 Week', hours: 168, icon: '🗓️' },
]

export function SnoozeDropdown({ onSnooze, disabled = false, className }: SnoozeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (hours: number) => {
    onSnooze(hours)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Clock className="w-4 h-4" />
        <span>Snooze</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {SNOOZE_OPTIONS.map((option) => (
              <button
                key={option.hours}
                type="button"
                onClick={() => handleSelect(option.hours)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SnoozeDropdown
