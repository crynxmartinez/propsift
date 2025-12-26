'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, MoreVertical, Copy, Trash2 } from 'lucide-react'

interface Branch {
  id: string
  name: string
  conditions: {
    field: string
    operator: string
    value: string
    logic?: 'AND' | 'OR'
  }[]
}

interface ConditionNodeData {
  label: string
  type: string
  config: {
    branches?: Branch[]
  }
  onDelete?: () => void
  onCopy?: () => void
}

// Color palette for branches - exported for use in other components
export const branchColors = [
  { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100', border: 'border-blue-300' },
  { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100', border: 'border-purple-300' },
  { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100', border: 'border-green-300' },
  { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100', border: 'border-yellow-300' },
  { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-100', border: 'border-pink-300' },
]

export const noneColor = { bg: 'bg-gray-400', text: 'text-gray-600', light: 'bg-gray-100', border: 'border-gray-300' }

function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const [showMenu, setShowMenu] = useState(false)

  // Get branches from config
  const branches: Branch[] = data.config?.branches || []
  const allBranches = [
    ...branches,
    { id: 'none', name: 'None', conditions: [] }
  ]

  return (
    <div className="relative">
      <div
        className={`px-4 py-3 rounded-lg border-2 min-w-[220px] bg-white shadow-sm ${
          selected ? 'border-orange-500 shadow-md' : 'border-orange-300'
        }`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-orange-500 border-2 border-white"
        />

        {/* Three-dot menu */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-2 right-2 p-1 hover:bg-orange-100 rounded transition"
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
        
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-xs font-medium text-orange-600 uppercase">Condition</span>
        </div>
        <div className="font-medium text-gray-900">{data.label}</div>
        
        {/* Branch list with colors */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {allBranches.map((branch, index) => {
            const color = branch.id === 'none' ? noneColor : branchColors[index % branchColors.length]
            
            return (
              <div key={branch.id} className="flex items-center gap-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${color.bg}`}></div>
                <span className={color.text}>{branch.name}</span>
              </div>
            )
          })}
        </div>
        
        {/* Single output handle - branches are separate nodes */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-orange-500 border-2 border-white"
        />
      </div>
    </div>
  )
}

export default memo(ConditionNode)
