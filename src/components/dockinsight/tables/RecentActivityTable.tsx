/**
 * DockInsight 3.0 Recent Activity Table
 * 
 * Displays recent record activity with assignee and time.
 */

'use client'

import { Loader2, User } from 'lucide-react'

interface ActivityItem {
  id: string
  recordName: string
  assigneeId: string | null
  assigneeName: string | null
  lastActivityAt: string
}

interface RecentActivityTableProps {
  data: ActivityItem[] | null
  loading?: boolean
  onRecordClick?: (recordId: string) => void
}

export function RecentActivityTable({ data, loading, onRecordClick }: RecentActivityTableProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="overflow-auto h-52">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">Record</th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">Assignee</th>
                <th className="text-right py-2 px-2 font-medium text-gray-600">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onRecordClick?.(item.id)}
                >
                  <td className="py-2 px-2 text-blue-600 hover:underline truncate max-w-[150px]">
                    {item.recordName}
                  </td>
                  <td className="py-2 px-2">
                    {item.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-gray-700 truncate max-w-[100px]">{item.assigneeName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-500 whitespace-nowrap">
                    {formatTime(item.lastActivityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No recent activity
        </div>
      )}
    </div>
  )
}
