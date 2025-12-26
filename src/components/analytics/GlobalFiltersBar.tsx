/**
 * DockInsight 2.2.2 Global Filters Bar
 * 
 * Displays and manages global filters for the dashboard.
 */

'use client'

import { useState } from 'react'
import { Calendar, Filter, X } from 'lucide-react'
import type { GlobalFilters, DateRangePreset } from '@/lib/analytics/registry/types'

interface GlobalFiltersBarProps {
  filters: GlobalFilters
  onChange: (filters: GlobalFilters) => void
}

const DATE_PRESETS: { value: DateRangePreset['preset']; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' }
]

export function GlobalFiltersBar({ filters, onChange }: GlobalFiltersBarProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  const currentPreset = filters.dateRange && 'preset' in filters.dateRange 
    ? filters.dateRange.preset 
    : null

  const handleDatePresetChange = (preset: DateRangePreset['preset']) => {
    onChange({
      ...filters,
      dateRange: { preset }
    })
    setShowDatePicker(false)
  }

  const clearDateRange = () => {
    const { dateRange, ...rest } = filters
    onChange(rest)
  }

  const activeFilterCount = [
    filters.assignees?.length,
    filters.status?.length,
    filters.temperature?.length,
    filters.tags?.include?.length || filters.tags?.exclude?.length,
    filters.motivations?.include?.length || filters.motivations?.exclude?.length,
    filters.market?.states?.length || filters.market?.cities?.length,
    filters.callReady !== undefined
  ].filter(Boolean).length

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Date Range */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              {currentPreset 
                ? DATE_PRESETS.find(p => p.value === currentPreset)?.label 
                : 'Select Date Range'}
            </span>
          </button>

          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handleDatePresetChange(preset.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    currentPreset === preset.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear date range */}
        {currentPreset && (
          <button
            onClick={clearDateRange}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Clear date range"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Filter indicator */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm">
            <Filter className="w-4 h-4" />
            <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh hint */}
        <div className="text-xs text-gray-400">
          Data refreshes automatically
        </div>
      </div>
    </div>
  )
}
