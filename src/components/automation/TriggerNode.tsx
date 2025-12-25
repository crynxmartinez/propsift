'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'

function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[180px] bg-white shadow-sm ${
        selected ? 'border-purple-500 shadow-md' : 'border-purple-300'
      }`}
    >
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
  )
}

export default memo(TriggerNode)
