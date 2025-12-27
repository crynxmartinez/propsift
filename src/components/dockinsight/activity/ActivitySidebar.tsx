/**
 * DockInsight 3.0 - Activity Sidebar with Source Counts
 */

'use client'

import { Loader2, FileText, MessageSquare, Layers, Upload, LayoutGrid, Zap, MoreHorizontal } from 'lucide-react'

interface SourceCount {
  source: string
  group: string
  count: number
}

interface ActivitySidebarProps {
  data: SourceCount[] | null
  activeSource: string | null
  onSourceChange: (source: string | null) => void
  loading?: boolean
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
  'CRM': '#3b82f6',
  'Comments': '#8b5cf6',
  'Bulk Actions': '#f59e0b',
  'Bulk Import': '#10b981',
  'Board': '#ec4899',
  'Automation': '#6366f1',
  'Other': '#6b7280'
}

export function ActivitySidebar({ 
  data, 
  activeSource, 
  onSourceChange,
  loading 
}: ActivitySidebarProps) {
  // Group data by source group
  const groupedData = data?.reduce((acc, item) => {
    const existing = acc.find(g => g.group === item.group)
    if (existing) {
      existing.count += item.count
    } else {
      acc.push({ group: item.group, count: item.count })
    }
    return acc
  }, [] as { group: string; count: number }[]) || []

  // Sort by count descending
  groupedData.sort((a, b) => b.count - a.count)

  // Calculate total
  const total = groupedData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="w-48 flex-shrink-0 space-y-2">
      {/* All Activities */}
      <button
        onClick={() => onSourceChange(null)}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
          ${activeSource === null 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="font-medium">All</span>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className="font-medium">{total.toLocaleString()}</span>
        )}
      </button>

      {/* Source Categories */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        groupedData.map((item) => (
          <button
            key={item.group}
            onClick={() => onSourceChange(item.group)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
              ${activeSource === item.group 
                ? 'text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            style={activeSource === item.group ? { backgroundColor: SOURCE_COLORS[item.group] || SOURCE_COLORS['Other'] } : {}}
          >
            <div className="flex items-center gap-2">
              {SOURCE_ICONS[item.group] || SOURCE_ICONS['Other']}
              <span className="font-medium truncate">{item.group}</span>
            </div>
            <span className="font-medium">{item.count.toLocaleString()}</span>
          </button>
        ))
      )}
    </div>
  )
}
