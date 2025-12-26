'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MoreVertical, Plus, Copy, Trash2, GitBranch } from 'lucide-react'

interface BranchCondition {
  field: string
  operator: string
  value: string
  logic?: 'AND' | 'OR'
}

interface BranchNodeData {
  label: string
  branchName: string
  branchIndex: number
  conditions: BranchCondition[]
  color: {
    bg: string
    text: string
    border: string
    light: string
  }
  hasOutgoingEdge?: boolean
  onAddAction?: () => void
  onDelete?: () => void
  onCopy?: () => void
}

// Generate condition summary text
function getConditionSummary(conditions: BranchCondition[]): string {
  if (!conditions || conditions.length === 0) {
    return 'No conditions set'
  }

  const fieldLabels: Record<string, string> = {
    status: 'Status',
    temperature: 'Temperature',
    isComplete: 'Is Complete',
    hasTag: 'Has Tag',
    hasMotivation: 'Has Motivation',
    isAssigned: 'Is Assigned',
  }

  const operatorLabels: Record<string, string> = {
    equals: 'equals',
    not_equals: 'not equals',
    contains: 'contains',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
  }

  const parts = conditions.map((c, i) => {
    const field = fieldLabels[c.field] || c.field || 'Field'
    const operator = operatorLabels[c.operator] || c.operator
    const value = c.value || '...'
    const logic = i > 0 ? ` ${c.logic || 'AND'} ` : ''
    
    if (c.operator === 'is_empty' || c.operator === 'is_not_empty') {
      return `${logic}${field} ${operator}`
    }
    return `${logic}${field} ${operator} "${value}"`
  })

  const summary = parts.join('')
  return summary.length > 40 ? summary.substring(0, 37) + '...' : summary
}

function BranchNode({ data, selected }: NodeProps<BranchNodeData>) {
  const [showMenu, setShowMenu] = useState(false)
  const conditionSummary = getConditionSummary(data.conditions)
  const isNoneBranch = data.branchName === 'None'

  return (
    <div className="relative">
      <div
        className={`px-4 py-3 rounded-lg border-2 min-w-[200px] max-w-[280px] bg-white shadow-sm ${
          selected ? `${data.color.border} shadow-md` : data.color.border
        }`}
        style={{ borderColor: selected ? undefined : data.color.border.replace('border-', '') }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className={`w-3 h-3 border-2 border-white ${data.color.bg}`}
        />

        {/* Three-dot menu */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded transition"
          style={{ opacity: selected ? 1 : 0.5 }}
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute top-8 right-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onCopy?.()
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onDelete?.()
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
        
        {/* Branch Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-6 h-6 rounded ${data.color.light} flex items-center justify-center`}>
            <GitBranch className={`w-4 h-4 ${data.color.text}`} />
          </div>
          <span className={`text-xs font-medium uppercase ${data.color.text}`}>
            {isNoneBranch ? 'None' : 'Branch'}
          </span>
        </div>
        
        {/* Branch Name */}
        <div className="font-medium text-gray-900">{data.branchName}</div>
        
        {/* Condition Summary */}
        {!isNoneBranch && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            {conditionSummary}
          </div>
        )}
        {isNoneBranch && (
          <div className="text-xs text-gray-500 mt-1">
            When no conditions match
          </div>
        )}
        
        <Handle
          type="source"
          position={Position.Bottom}
          className={`w-3 h-3 border-2 border-white ${data.color.bg}`}
        />
      </div>

      {/* Add Action Button below card - only show if no outgoing edge */}
      {!data.hasOutgoingEdge && (
        <>
          <div className="flex justify-center mt-2">
            <div className={`w-px h-6 ${data.color.bg.replace('bg-', 'bg-').replace('500', '300')}`}></div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onAddAction?.()
              }}
              className={`w-8 h-8 rounded-full ${data.color.bg} hover:opacity-80 text-white flex items-center justify-center shadow-md transition`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default memo(BranchNode)
