/**
 * DockInsight 3.0 - Activity Over Time Chart
 * 
 * Features:
 * - Date range dropdown: Today, Last 7 Days, Last 30 Days, Custom
 * - Hourly view for single day, Daily view for multiple days
 * - Stacked bar chart for Records and Tasks
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Calendar, X } from 'lucide-react'

type DateRangeOption = 'today' | 'last_7_days' | 'last_30_days' | 'custom'

interface ActivityDataPoint {
  label: string
  records: number
  tasks: number
}

interface ActivityOverTimeChartProps {
  onDateRangeChange: (range: DateRangeOption, customStart?: Date, customEnd?: Date) => void
  data: ActivityDataPoint[] | null
  loading?: boolean
  isHourly: boolean
}

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
]

export function ActivityOverTimeChart({
  onDateRangeChange,
  data,
  loading = false,
  isHourly
}: ActivityOverTimeChartProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('last_7_days')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRangeSelect = (range: DateRangeOption) => {
    if (range === 'custom') {
      setShowCustomPicker(true)
      setIsDropdownOpen(false)
    } else {
      setSelectedRange(range)
      setIsDropdownOpen(false)
      setShowCustomPicker(false)
      onDateRangeChange(range)
    }
  }

  const handleCustomApply = () => {
    if (customStartDate) {
      const start = new Date(customStartDate)
      const end = customEndDate ? new Date(customEndDate) : start
      setSelectedRange('custom')
      setShowCustomPicker(false)
      onDateRangeChange('custom', start, end)
    }
  }

  const getDisplayLabel = () => {
    if (selectedRange === 'custom' && customStartDate) {
      if (customEndDate && customStartDate !== customEndDate) {
        return `${formatDateShort(customStartDate)} - ${formatDateShort(customEndDate)}`
      }
      return formatDateShort(customStartDate)
    }
    return DATE_OPTIONS.find(o => o.value === selectedRange)?.label || 'Last 7 Days'
  }

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate max value for scaling
  const maxValue = data ? Math.max(...data.map(d => d.records + d.tasks), 1) : 1

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          Activity ({isHourly ? 'Hourly' : 'Daily'})
        </h3>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{getDisplayLabel()}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRangeSelect(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                    selectedRange === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom date picker */}
      {showCustomPicker && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Select Date Range</span>
            <button onClick={() => setShowCustomPicker(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">To (optional)</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStartDate}
              className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Select only "From" date for hourly view of a single day
          </p>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : data && data.length > 0 ? (
        <div className="h-48">
          <div className="flex items-end justify-between h-40 gap-1 overflow-x-auto">
            {data.map((point, index) => {
              const total = point.records + point.tasks
              const totalHeight = (total / maxValue) * 100
              const recordHeight = total > 0 ? (point.records / total) * totalHeight : 0
              const taskHeight = total > 0 ? (point.tasks / total) * totalHeight : 0

              return (
                <div 
                  key={index} 
                  className="flex-1 min-w-[20px] max-w-[60px] flex flex-col items-center group"
                >
                  <div className="w-full flex flex-col justify-end h-32 relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        <div>Records: {point.records}</div>
                        <div>Tasks: {point.tasks}</div>
                      </div>
                    </div>
                    
                    {total > 0 ? (
                      <>
                        <div 
                          className="w-full bg-green-500 rounded-t transition-all"
                          style={{ height: `${taskHeight}%` }}
                        />
                        <div 
                          className="w-full bg-blue-500 rounded-b transition-all"
                          style={{ height: `${recordHeight}%` }}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-gray-200 rounded h-1" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-xs text-gray-600">Records</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-xs text-gray-600">Tasks</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No activity data
        </div>
      )}
    </div>
  )
}
