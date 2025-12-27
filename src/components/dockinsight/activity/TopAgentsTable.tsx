/**
 * DockInsight 3.0 - Top Agents (Activity) Table
 */

'use client'

import { Loader2 } from 'lucide-react'

interface AgentData {
  id: string
  name: string
  activityCount: number
  tasksCompleted: number
}

interface TopAgentsTableProps {
  data: AgentData[] | null
  loading?: boolean
}

export function TopAgentsTable({ data, loading = false }: TopAgentsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Top Agents (Activity)</h3>
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Top Agents (Activity)</h3>
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No agent data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Top Agents (Activity)</h3>
      <div className="overflow-auto h-52">
        <div className="space-y-2">
          {data.map((agent, index) => (
            <div 
              key={agent.id} 
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-900 font-medium">{agent.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">{agent.activityCount.toLocaleString()}</span>
                <span className="text-green-600">{agent.tasksCompleted.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
