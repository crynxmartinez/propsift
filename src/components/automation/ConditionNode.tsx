'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'

function ConditionNode({ data, selected }: NodeProps) {
  return (
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
  )
}

export default memo(ConditionNode)
