/**
 * DockInsight 3.0 - Workflow Completion Progress Bars
 */

'use client'

import { Loader2, CheckCircle2 } from 'lucide-react'

interface WorkflowData {
  label: string
  completed: number
  total: number
}

interface WorkflowCompletionProps {
  data: WorkflowData[] | null
  loading?: boolean
}

export function WorkflowCompletion({ data, loading }: WorkflowCompletionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Workflow Completion</h3>
      
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-5">
          {data.map((workflow, index) => {
            const percentage = workflow.total > 0 
              ? Math.round((workflow.completed / workflow.total) * 100) 
              : 0
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{workflow.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {workflow.completed} / {workflow.total}
                    </span>
                    {percentage === 100 && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      percentage === 100 
                        ? 'bg-green-500' 
                        : percentage >= 50 
                          ? 'bg-blue-500' 
                          : 'bg-yellow-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
          No workflow data
        </div>
      )}
    </div>
  )
}
