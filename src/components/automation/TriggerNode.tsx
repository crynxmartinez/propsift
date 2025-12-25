'use client'

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Zap, MoreVertical, Plus, Copy, Trash2, Move } from 'lucide-react'

interface TriggerNodeData {
  label: string
  type: string
  config: Record<string, unknown>
  onAddAction?: () => void
  onDelete?: () => void
  onCopy?: () => void
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <div
        className={`px-4 py-3 rounded-lg border-2 min-w-[180px] bg-white shadow-sm ${
          selected ? 'border-purple-500 shadow-md' : 'border-purple-300'
        }`}
      >
        {/* Three-dot menu */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-2 right-2 p-1 hover:bg-purple-100 rounded opacity-0 group-hover:opacity-100 transition"
          style={{ opacity: selected ? 1 : undefined }}
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
          <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-purple-600 uppercase">Trigger</span>
        </div>
        <div className="font-medium text-gray-900">{data.label}</div>
        
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-purple-500 border-2 border-white"
        />
      </div>

      {/* Add Action Button below card */}
      <div className="flex justify-center mt-2">
        <div className="w-px h-6 bg-gray-300"></div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            data.onAddAction?.()
          }}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default memo(TriggerNode)
