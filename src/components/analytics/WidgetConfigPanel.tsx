/**
 * DockInsight 2.2.2 Widget Configuration Panel
 * 
 * Form for configuring widget settings:
 * - Entity selection
 * - Metric selection
 * - Dimension selection
 * - Segment selection
 * - Visualization type
 * - Filters
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Save, BarChart3, PieChart, Table, TrendingUp, Hash } from 'lucide-react'
import { 
  ENTITY_REGISTRY, 
  METRIC_REGISTRY, 
  DIMENSION_REGISTRY, 
  SEGMENT_REGISTRY,
  getMetricsForEntity,
  getDimensionsForEntity,
  getSegmentsForEntity
} from '@/lib/analytics/registry'
import type { WidgetConfig } from './types'

interface WidgetConfigPanelProps {
  widget?: WidgetConfig | null
  onSave: (widget: Omit<WidgetConfig, 'id'> & { id?: string }) => void
  onClose: () => void
}

const WIDGET_TYPES = [
  { value: 'metric', label: 'Metric', icon: Hash, description: 'Single number' },
  { value: 'chart', label: 'Bar Chart', icon: BarChart3, description: 'Grouped bars' },
  { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Proportions' },
  { value: 'table', label: 'Table', icon: Table, description: 'Data grid' },
  { value: 'line', label: 'Line Chart', icon: TrendingUp, description: 'Trends' }
]

export function WidgetConfigPanel({ widget, onSave, onClose }: WidgetConfigPanelProps) {
  const [title, setTitle] = useState(widget?.title || '')
  const [type, setType] = useState<string>(widget?.type || 'metric')
  const [entityKey, setEntityKey] = useState(widget?.entityKey || 'records')
  const [metricKey, setMetricKey] = useState(widget?.metric?.key || 'count')
  const [dimension, setDimension] = useState(widget?.dimension || '')
  const [segmentKey, setSegmentKey] = useState(widget?.segmentKey || '')
  const [limit, setLimit] = useState(widget?.limit || 10)
  
  // Grid position
  const [w, setW] = useState(widget?.w || 6)
  const [h, setH] = useState(widget?.h || 2)
  
  // Get available options based on entity
  const entities = Object.values(ENTITY_REGISTRY)
  const metrics = getMetricsForEntity(entityKey)
  const dimensions = getDimensionsForEntity(entityKey)
  const segments = getSegmentsForEntity(entityKey)
  
  // Reset dependent fields when entity changes
  useEffect(() => {
    if (!widget) {
      setMetricKey('count')
      setDimension('')
      setSegmentKey('')
    }
  }, [entityKey, widget])
  
  // Auto-generate title
  useEffect(() => {
    if (!widget && !title) {
      const entity = ENTITY_REGISTRY[entityKey]
      const metric = METRIC_REGISTRY[metricKey]
      const dim = dimension ? DIMENSION_REGISTRY[dimension] : null
      const seg = segmentKey ? SEGMENT_REGISTRY[segmentKey] : null
      
      let autoTitle = ''
      if (seg) {
        autoTitle = seg.label
      } else if (dim) {
        autoTitle = `${entity?.labelPlural || 'Items'} by ${dim.label}`
      } else {
        autoTitle = `Total ${entity?.labelPlural || 'Items'}`
      }
      
      setTitle(autoTitle)
    }
  }, [entityKey, metricKey, dimension, segmentKey, widget, title])
  
  const handleSave = () => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }
    
    onSave({
      id: widget?.id,
      title: title.trim(),
      type: type as WidgetConfig['type'],
      entityKey,
      metric: { key: metricKey },
      dimension: dimension || undefined,
      segmentKey: segmentKey || undefined,
      limit: type !== 'metric' ? limit : undefined,
      x: widget?.x || 0,
      y: widget?.y || 0,
      w,
      h
    })
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {widget ? 'Edit Widget' : 'Add Widget'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Widget title"
            />
          </div>
          
          {/* Widget Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visualization Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.value}
                  onClick={() => setType(wt.value)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                    type === wt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <wt.icon className={`w-5 h-5 ${type === wt.value ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`text-xs ${type === wt.value ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                    {wt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Data Source */}
          <div className="grid grid-cols-2 gap-4">
            {/* Entity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source
              </label>
              <select
                value={entityKey}
                onChange={(e) => setEntityKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {entities.map((entity) => (
                  <option key={entity.key} value={entity.key}>
                    {entity.labelPlural}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Metric */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metric
              </label>
              <select
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {metrics.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Dimension (for grouped widgets) */}
          {type !== 'metric' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group By (Dimension)
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a dimension...</option>
                {dimensions.map((dim) => (
                  <option key={dim.key} value={dim.key}>
                    {dim.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Segment (optional filter) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Segment (Optional Filter)
            </label>
            <select
              value={segmentKey}
              onChange={(e) => setSegmentKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All {ENTITY_REGISTRY[entityKey]?.labelPlural || 'Items'}</option>
              {segments.map((seg) => (
                <option key={seg.key} value={seg.key}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Limit (for grouped widgets) */}
          {type !== 'metric' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Items to Show
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                min={1}
                max={100}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Size
            </label>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Width (columns)</label>
                <select
                  value={w}
                  onChange={(e) => setW(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[3, 4, 6, 8, 12].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Height (rows)</label>
                <select
                  value={h}
                  onChange={(e) => setH(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {widget ? 'Save Changes' : 'Add Widget'}
          </button>
        </div>
      </div>
    </div>
  )
}
