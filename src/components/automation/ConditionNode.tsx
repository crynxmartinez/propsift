'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, MoreVertical, Plus, Copy, Trash2, ArrowDown } from 'lucide-react'

interface ConditionNodeData {
  label: string
  type: string
  config: Record<string, unknown>
  onAddAction?: (branch: 'yes' | 'no') => void
  onDelete?: () => void
  onCopy?: () => void
}

function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <div
        className={`px-4 py-3 rounded-lg border-2 min-w-[180px] bg-white shadow-sm ${
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
        
        {/* Yes/No outputs */}
        <div className="flex justify-between mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-green-600">Yes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600">No</span>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          </div>
        </div>
        
        <Handle
          type="source"
          position={Position.Bottom}
          id="yes"
          style={{ left: '25%' }}
          className="w-3 h-3 !bg-green-500 border-2 border-white"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="no"
          style={{ left: '75%' }}
          className="w-3 h-3 !bg-red-500 border-2 border-white"
        />
      </div>

      {/* Add Action Buttons below card for Yes/No branches */}
      <div className="flex justify-between mt-2 px-4">
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-green-300"></div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onAddAction?.('yes')
            }}
            className="w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-red-300"></div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              data.onAddAction?.('no')
            }}
            className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ConditionNode)
