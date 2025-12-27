/**
 * DockInsight 3.0 Top Assignees Table
 * 
 * Displays top assignees by record count.
 */

'use client'

import { Loader2, User } from 'lucide-react'

interface AssigneeStats {
  id: string
  name: string
  recordCount: number
}

interface TopAssigneesTableProps {
  data: AssigneeStats[] | null
  loading?: boolean
  onAssigneeClick?: (assigneeId: string) => void
}

export function TopAssigneesTable({ data, loading, onAssigneeClick }: TopAssigneesTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Top Assignees</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="overflow-auto h-52">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Agent</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Records</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onAssigneeClick?.(item.id)}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-semibold text-gray-900">
                      {item.recordCount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No assignee data available
        </div>
      )}
    </div>
  )
}
