'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface WidgetConfig {
  dataSource: string
  metric: string
  field?: string
  groupBy?: string
  filters?: Array<{ field: string; operator: string; value: string }>
  sortBy?: string
  sortOrder?: string
  limit?: number
  timePeriod?: string
  comparison?: string
  prefix?: string
  suffix?: string
}

interface WidgetAppearance {
  colors?: string[]
  showValues?: boolean
  showLegend?: boolean
  showLabels?: boolean
  showChange?: boolean
  horizontal?: boolean
  donut?: boolean
  centerText?: string
  color?: string
  thresholds?: { warning: number; danger: number }
}

interface Widget {
  id: string
  dashboardId: string
  type: string
  title: string
  subtitle: string | null
  icon: string | null
  x: number
  y: number
  w: number
  h: number
  config: WidgetConfig
  appearance: WidgetAppearance | null
}

interface WidgetConfigPanelProps {
  widget: Widget
  onSave: (widget: Widget) => void
  onClose: () => void
}

const DATA_SOURCES = [
  { value: 'records', label: 'Records' },
  { value: 'hot_leads', label: 'Hot Leads' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'tasks_pending', label: 'Pending Tasks' },
  { value: 'tasks_completed', label: 'Completed Tasks' },
  { value: 'tasks_overdue', label: 'Overdue Tasks' },
]

const METRICS = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
]

const GROUP_BY_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'tag', label: 'Tag' },
  { value: 'assignedTo', label: 'Assigned To' },
]

const TIME_PERIODS = [
  { value: 'all_time', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
]

const COMPARISON_OPTIONS = [
  { value: '', label: 'No Comparison' },
  { value: 'previous_period', label: 'Previous Period' },
]

export default function WidgetConfigPanel({
  widget,
  onSave,
  onClose,
}: WidgetConfigPanelProps) {
  const [title, setTitle] = useState(widget.title)
  const [subtitle, setSubtitle] = useState(widget.subtitle || '')
  const [config, setConfig] = useState<WidgetConfig>(widget.config)
  const [appearance, setAppearance] = useState<WidgetAppearance>(widget.appearance || {})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'data' | 'appearance'>('data')

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/analytics-dashboards/${widget.dashboardId}/widgets/${widget.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            subtitle: subtitle || null,
            config,
            appearance,
          }),
        }
      )

      if (response.ok) {
        const updated = await response.json()
        onSave(updated)
      }
    } catch (error) {
      console.error('Error saving widget:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: keyof WidgetConfig, value: unknown) => {
    setConfig({ ...config, [key]: value })
  }

  const updateAppearance = (key: keyof WidgetAppearance, value: unknown) => {
    setAppearance({ ...appearance, [key]: value })
  }

  const isChartWidget = ['bar_chart', 'horizontal_bar', 'pie_chart', 'donut_chart', 'line_chart', 'area_chart'].includes(widget.type)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Configure Widget</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'data'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'appearance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'data' ? (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Data Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Source
                </label>
                <select
                  value={config.dataSource}
                  onChange={(e) => updateConfig('dataSource', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DATA_SOURCES.map((ds) => (
                    <option key={ds.value} value={ds.value}>
                      {ds.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric */}
              {config.dataSource === 'records' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metric
                  </label>
                  <select
                    value={config.metric}
                    onChange={(e) => updateConfig('metric', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {METRICS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Group By (for charts) */}
              {isChartWidget && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group By
                  </label>
                  <select
                    value={config.groupBy || 'status'}
                    onChange={(e) => updateConfig('groupBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Period
                </label>
                <select
                  value={config.timePeriod || 'all_time'}
                  onChange={(e) => updateConfig('timePeriod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TIME_PERIODS.map((tp) => (
                    <option key={tp.value} value={tp.value}>
                      {tp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comparison (for number widgets) */}
              {widget.type === 'number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compare To
                  </label>
                  <select
                    value={config.comparison || ''}
                    onChange={(e) => updateConfig('comparison', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {COMPARISON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Prefix/Suffix (for number widgets) */}
              {widget.type === 'number' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={config.prefix || ''}
                      onChange={(e) => updateConfig('prefix', e.target.value)}
                      placeholder="e.g., $"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={config.suffix || ''}
                      onChange={(e) => updateConfig('suffix', e.target.value)}
                      placeholder="e.g., %"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Limit (for charts) */}
              {isChartWidget && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limit Results
                  </label>
                  <input
                    type="number"
                    value={config.limit || 10}
                    onChange={(e) => updateConfig('limit', parseInt(e.target.value) || 10)}
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Show Values */}
              {isChartWidget && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.showValues ?? false}
                    onChange={(e) => updateAppearance('showValues', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Values</span>
                </label>
              )}

              {/* Show Legend */}
              {isChartWidget && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.showLegend ?? true}
                    onChange={(e) => updateAppearance('showLegend', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Legend</span>
                </label>
              )}

              {/* Show Labels (pie chart) */}
              {['pie_chart', 'donut_chart'].includes(widget.type) && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.showLabels ?? true}
                    onChange={(e) => updateAppearance('showLabels', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Labels</span>
                </label>
              )}

              {/* Show Change (number widget) */}
              {widget.type === 'number' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.showChange ?? false}
                    onChange={(e) => updateAppearance('showChange', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Change Indicator</span>
                </label>
              )}

              {/* Horizontal (bar chart) */}
              {widget.type === 'bar_chart' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.horizontal ?? false}
                    onChange={(e) => updateAppearance('horizontal', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Horizontal Bars</span>
                </label>
              )}

              {/* Donut (pie chart) */}
              {widget.type === 'pie_chart' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={appearance.donut ?? false}
                    onChange={(e) => updateAppearance('donut', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Donut Style</span>
                </label>
              )}

              {/* Center Text (donut) */}
              {(widget.type === 'donut_chart' || appearance.donut) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Center Text
                  </label>
                  <input
                    type="text"
                    value={appearance.centerText || ''}
                    onChange={(e) => updateAppearance('centerText', e.target.value)}
                    placeholder="e.g., Total"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Color (number widget) */}
              {widget.type === 'number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateAppearance('color', color)}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          appearance.color === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
