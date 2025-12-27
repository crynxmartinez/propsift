/**
 * DockInsight 3.0 - Recent Activities Table with Search and Pagination
 */

'use client'

import { useState } from 'react'
import { Loader2, Search, ChevronLeft, ChevronRight, FileText, MessageSquare, Layers, Upload, LayoutGrid, Zap, MoreHorizontal } from 'lucide-react'

interface ActivityItem {
  id: string
  type: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  source: string | null
  sourceGroup: string
  createdAt: string
  agentId: string | null
  agentName: string
  recordId: string
  recordName: string
  recordAddress: string | null
}

interface RecentActivitiesTableProps {
  activities: ActivityItem[] | null
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading?: boolean
  search: string
  onSearchChange: (search: string) => void
  onPageChange: (page: number) => void
  filterTitle: string
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  'CRM': <FileText className="w-4 h-4" />,
  'Comments': <MessageSquare className="w-4 h-4" />,
  'Bulk Actions': <Layers className="w-4 h-4" />,
  'Bulk Import': <Upload className="w-4 h-4" />,
  'Board': <LayoutGrid className="w-4 h-4" />,
  'Automation': <Zap className="w-4 h-4" />,
  'Other': <MoreHorizontal className="w-4 h-4" />
}

const SOURCE_COLORS: Record<string, string> = {
  'CRM': 'bg-blue-100 text-blue-600',
  'Comments': 'bg-purple-100 text-purple-600',
  'Bulk Actions': 'bg-orange-100 text-orange-600',
  'Bulk Import': 'bg-green-100 text-green-600',
  'Board': 'bg-pink-100 text-pink-600',
  'Automation': 'bg-indigo-100 text-indigo-600',
  'Other': 'bg-gray-100 text-gray-600'
}

const ACTION_LABELS: Record<string, string> = {
  'created': 'Created',
  'updated': 'Updated',
  'deleted': 'Deleted'
}

export function RecentActivitiesTable({ 
  activities, 
  total, 
  page, 
  pageSize, 
  totalPages,
  loading, 
  search,
  onSearchChange,
  onPageChange,
  filterTitle
}: RecentActivitiesTableProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    if (activityDate.getTime() === today.getTime()) {
      return `Today, ${timeStr}`
    }
    if (activityDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeStr}`
    }
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`
  }

  const getActivityDescription = (activity: ActivityItem) => {
    const action = ACTION_LABELS[activity.type] || activity.type
    if (activity.field) {
      return `${action} ${activity.field}`
    }
    return action
  }

  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          {filterTitle} ({total.toLocaleString()})
        </h3>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : activities && activities.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Agent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Activity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${SOURCE_COLORS[activity.sourceGroup] || SOURCE_COLORS['Other']}`}>
                          {SOURCE_ICONS[activity.sourceGroup] || SOURCE_ICONS['Other']}
                        </div>
                        <span className="text-gray-700 text-xs">{activity.sourceGroup}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                          {activity.agentName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700 truncate max-w-[100px]">
                          {activity.agentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 text-xs">
                          {getActivityDescription(activity)}
                        </div>
                        {activity.newValue && (
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {activity.newValue}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 text-xs truncate max-w-[120px]">
                          {activity.recordName}
                        </div>
                        {activity.recordAddress && (
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">
                            {activity.recordAddress}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {formatDateTime(activity.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {startIndex}–{endIndex} of {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No activities found
        </div>
      )}
    </div>
  )
}
