/**
 * DockInsight 2.2.2 Table Widget
 * 
 * Displays grouped data as a table.
 */

'use client'

import { Loader2 } from 'lucide-react'
import type { WidgetConfig, WidgetData } from '../types'

interface TableWidgetProps {
  config: WidgetConfig
  data: WidgetData | null
  loading: boolean
  error: string | null
  onClick?: () => void
}

export function TableWidget({
  config,
  data,
  loading,
  error,
  onClick
}: TableWidgetProps) {
  const tableData = data?.data?.map((item: any, index: number) => ({
    name: item.label || item.value || 'Unknown',
    count: item.count
  })) || []

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 truncate">
          {config.title}
        </h3>
        {data?.cached && (
          <span className="text-xs text-gray-400">cached</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-red-500 text-center">{error}</div>
          </div>
        ) : tableData.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">
                  {config.dimension || 'Value'}
                </th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-2 text-gray-900">
                    {row.name}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-600">
                    {row.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            {data?.total !== undefined && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="py-2 px-2 text-gray-900">Total</td>
                  <td className="py-2 px-2 text-right text-gray-900">
                    {data.total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">No data</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          {config.entityKey}
          {config.dimension && ` by ${config.dimension}`}
        </div>
      </div>
    </div>
  )
}
