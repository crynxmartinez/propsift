/**
 * DockInsight 3.0 - Task Sidebar with Category Counts
 */

'use client'

import { Loader2, Plus } from 'lucide-react'

interface SidebarCategory {
  key: string
  label: string
  count: number
  color: string
}

interface TaskSidebarProps {
  categories: SidebarCategory[]
  activeCategory: string
  onCategoryChange: (key: string) => void
  loading?: boolean
}

export function TaskSidebar({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  loading 
}: TaskSidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        categories.map((category) => (
          <button
            key={category.key}
            onClick={() => onCategoryChange(category.key)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
              ${activeCategory === category.key 
                ? 'text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            style={activeCategory === category.key ? { backgroundColor: category.color } : {}}
          >
            <div className="flex items-center gap-2">
              {category.key === 'open_overdue' && <Plus className="w-4 h-4" />}
              <span className="font-medium">{category.count.toLocaleString()}</span>
            </div>
            <span className="truncate">{category.label}</span>
          </button>
        ))
      )}
    </div>
  )
}
