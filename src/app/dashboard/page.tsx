'use client'

import { BarChart3 } from 'lucide-react'

export default function DockInsightPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Dock Insight
        </h2>
        <p className="text-gray-500 mb-6">
          A new version of Dock Insight is coming soon with powerful analytics and insights.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Version 2.2 in development
        </div>
      </div>
    </div>
  )
}
