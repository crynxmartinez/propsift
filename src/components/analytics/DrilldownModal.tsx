/**
 * DockInsight 2.2.2 Drilldown Modal
 * 
 * Modal for viewing detailed rows when clicking on a widget.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useDrilldown } from './hooks'
import type { WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface DrilldownModalProps {
  widget: WidgetConfig
  globalFilters: GlobalFilters
  token: string
  onClose: () => void
}

export function DrilldownModal({
  widget,
  globalFilters,
  token,
  onClose
}: DrilldownModalProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { loading, error, data, fetchDrilldown } = useDrilldown({
    widget,
    globalFilters,
    token
  })

  useEffect(() => {
    fetchDrilldown(page, pageSize, search)
  }, [page, search, fetchDrilldown])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchDrilldown(1, pageSize, search)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{widget.title}</h2>
            <p className="text-sm text-gray-500">
              {widget.entityKey}
              {widget.segmentKey && ` · ${widget.segmentKey}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-red-500">{error}</div>
            </div>
          ) : data && data.rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {Object.keys(data.rows[0] as object).slice(0, 6).map(key => (
                    <th key={key} className="text-left py-2 px-2 font-medium text-gray-600">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    {Object.keys(row).slice(0, 6).map(key => (
                      <td key={key} className="py-2 px-2 text-gray-900">
                        {formatCellValue(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No results found
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} of {data.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
