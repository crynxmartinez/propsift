/**
 * DockInsight 3.0 Global Filters Bar
 * 
 * Provides filtering controls for date range, market, assignees,
 * temperature, tags, and call ready status.
 */

'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronDown, X, Filter } from 'lucide-react'
import type { GlobalFilters, DatePreset } from './types'

interface GlobalFiltersBarProps {
  filters: GlobalFilters
  onChange: (filters: GlobalFilters) => void
  isExecutiveView: boolean
  userId: string
}

interface FilterOption {
  id: string
  name: string
  color?: string
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
]

const TEMPERATURE_OPTIONS = [
  { value: 'hot', label: 'Hot', color: '#ef4444' },
  { value: 'warm', label: 'Warm', color: '#f97316' },
  { value: 'cold', label: 'Cold', color: '#3b82f6' },
]

export function GlobalFiltersBar({ 
  filters, 
  onChange, 
  isExecutiveView,
  userId 
}: GlobalFiltersBarProps) {
  const [markets, setMarkets] = useState<FilterOption[]>([])
  const [assignees, setAssignees] = useState<FilterOption[]>([])
  const [tags, setTags] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const response = await fetch('/api/dockinsight/filters', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setMarkets(data.markets || [])
          setAssignees(data.assignees || [])
          setTags(data.tags || [])
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFilterOptions()
  }, [])

  const updateFilter = <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const clearFilter = (key: keyof GlobalFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onChange(newFilters)
  }

  const activeFilterCount = [
    filters.market,
    filters.assigneeIds?.length,
    filters.temperature?.length,
    filters.tagIds?.length,
    filters.callReady !== undefined
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-gray-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Date Range */}
        <DateRangeSelect
          value={filters.dateRange.preset}
          onChange={(preset) => updateFilter('dateRange', { preset })}
        />

        {/* Market */}
        <FilterDropdown
          label="Market"
          value={filters.market}
          options={markets}
          onChange={(value) => value ? updateFilter('market', value) : clearFilter('market')}
          loading={loading}
        />

        {/* Assignees (only show all options for executive view) */}
        <MultiFilterDropdown
          label="Assignees"
          values={filters.assigneeIds || []}
          options={isExecutiveView ? assignees : assignees.filter(a => a.id === userId)}
          onChange={(values) => values.length ? updateFilter('assigneeIds', values) : clearFilter('assigneeIds')}
          loading={loading}
        />

        {/* Temperature */}
        <MultiFilterDropdown
          label="Temperature"
          values={filters.temperature || []}
          options={TEMPERATURE_OPTIONS.map(t => ({ id: t.value, name: t.label, color: t.color }))}
          onChange={(values) => values.length ? updateFilter('temperature', values as ('hot' | 'warm' | 'cold')[]) : clearFilter('temperature')}
        />

        {/* Tags */}
        <MultiFilterDropdown
          label="Tags"
          values={filters.tagIds || []}
          options={tags}
          onChange={(values) => values.length ? updateFilter('tagIds', values) : clearFilter('tagIds')}
          loading={loading}
        />

        {/* Call Ready */}
        <ToggleFilter
          label="Call Ready"
          value={filters.callReady}
          onChange={(value) => value !== undefined ? updateFilter('callReady', value) : clearFilter('callReady')}
        />

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => onChange({ dateRange: filters.dateRange })}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="w-3 h-3" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  )
}

// Date Range Select Component
function DateRangeSelect({ 
  value, 
  onChange 
}: { 
  value: DatePreset
  onChange: (value: DatePreset) => void 
}) {
  const [open, setOpen] = useState(false)
  const selected = DATE_PRESETS.find(p => p.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span>{selected?.label || 'Select Date'}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 min-w-[160px]">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => { onChange(preset.value); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                  value === preset.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Single Select Dropdown
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  loading
}: {
  label: string
  value?: string
  options: FilterOption[]
  onChange: (value: string | null) => void
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
          value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span>{selected?.name || label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 min-w-[160px] max-h-60 overflow-y-auto">
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              All {label}
            </button>
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => { onChange(option.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                    value === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Multi Select Dropdown
function MultiFilterDropdown({
  label,
  values,
  options,
  onChange,
  loading
}: {
  label: string
  values: string[]
  options: FilterOption[]
  onChange: (values: string[]) => void
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)

  const toggleValue = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter(v => v !== id))
    } else {
      onChange([...values, id])
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
          values.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span>{values.length > 0 ? `${label} (${values.length})` : label}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 min-w-[180px] max-h-60 overflow-y-auto">
            {values.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 border-b border-gray-100"
              >
                Clear selection
              </button>
            )}
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleValue(option.id)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    values.includes(option.id) 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300'
                  }`}>
                    {values.includes(option.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {option.color && (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                  )}
                  <span className="text-gray-700">{option.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Toggle Filter (Yes/No/All)
function ToggleFilter({
  label,
  value,
  onChange
}: {
  label: string
  value?: boolean
  onChange: (value: boolean | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  const displayValue = value === true ? 'Yes' : value === false ? 'No' : label

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
          value !== undefined ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <span>{displayValue}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 min-w-[120px]">
            <button
              onClick={() => { onChange(undefined); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                value === undefined ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { onChange(true); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                value === true ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => { onChange(false); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${
                value === false ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              No
            </button>
          </div>
        </>
      )}
    </div>
  )
}
