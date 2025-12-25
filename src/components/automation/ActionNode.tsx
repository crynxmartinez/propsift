'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Play } from 'lucide-react'

function ActionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[180px] bg-white shadow-sm ${
        selected ? 'border-blue-500 shadow-md' : 'border-blue-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
          <Play className="w-4 h-4 text-blue-600" />
        </div>
        <span className="text-xs font-medium text-blue-600 uppercase">Action</span>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
    </div>
  )
}

export default memo(ActionNode)
