'use client'

import { memo } from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow'
import { Plus } from 'lucide-react'

interface AddButtonEdgeData {
  onAddAction?: () => void
}

function AddButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<AddButtonEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path
        id={id}
        style={{ ...style, strokeWidth: 2, stroke: '#6366f1' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              data?.onAddAction?.()
            }}
            className="w-6 h-6 rounded-full bg-white border-2 border-indigo-500 hover:bg-indigo-500 hover:text-white text-indigo-500 flex items-center justify-center shadow-sm transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(AddButtonEdge)
