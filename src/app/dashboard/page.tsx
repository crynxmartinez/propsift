'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  LayoutDashboard,
  Settings,
  Trash2,
  MoreVertical,
  RefreshCw,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

import dynamic from 'next/dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GridLayout = dynamic(() => import('react-grid-layout').then((mod) => mod.default || mod), {
  ssr: false,
}) as any

interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}
import NumberWidget from '@/components/analytics/NumberWidget'
import BarChartWidget from '@/components/analytics/BarChartWidget'
import PieChartWidget from '@/components/analytics/PieChartWidget'
import LineChartWidget from '@/components/analytics/LineChartWidget'
import ProgressWidget from '@/components/analytics/ProgressWidget'
import GaugeWidget from '@/components/analytics/GaugeWidget'
import LeaderboardWidget from '@/components/analytics/LeaderboardWidget'
import FunnelWidget from '@/components/analytics/FunnelWidget'
import TableWidget from '@/components/analytics/TableWidget'
import WidgetConfigPanel from '@/components/analytics/WidgetConfigPanel'

interface Dashboard {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  gridCols: number
  rowHeight: number
  backgroundColor: string | null
  autoRefresh: number
  createdAt: string
  widgets: Widget[]
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
  config: Record<string, unknown>
  appearance: Record<string, unknown> | null
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDashboardMenu, setShowDashboardMenu] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchDashboards = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/analytics-dashboards', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setDashboards(data)
        
        // Select default dashboard or first one
        if (data.length > 0) {
          const defaultDashboard = data.find((d: Dashboard) => d.isDefault) || data[0]
          setSelectedDashboard(defaultDashboard)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboards:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboards()
  }, [fetchDashboards])

  const createDashboard = async () => {
    if (!newDashboardName.trim()) return

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/analytics-dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDashboardName.trim(),
          description: newDashboardDescription.trim() || null,
          isDefault: dashboards.length === 0,
        }),
      })

      if (response.ok) {
        const dashboard = await response.json()
        setDashboards([...dashboards, dashboard])
        setSelectedDashboard(dashboard)
        setShowCreateModal(false)
        setNewDashboardName('')
        setNewDashboardDescription('')
      }
    } catch (error) {
      console.error('Error creating dashboard:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteDashboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/analytics-dashboards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const remaining = dashboards.filter(d => d.id !== id)
        setDashboards(remaining)
        if (selectedDashboard?.id === id) {
          setSelectedDashboard(remaining[0] || null)
        }
      }
    } catch (error) {
      console.error('Error deleting dashboard:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // No dashboards yet - show empty state
  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Create Your First Dashboard
          </h2>
          <p className="text-gray-500 mb-6">
            Build custom analytics dashboards with drag-and-drop widgets to visualize your data.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Dashboard
          </button>
        </div>

        {/* Create Dashboard Modal */}
        {showCreateModal && (
          <CreateDashboardModal
            name={newDashboardName}
            description={newDashboardDescription}
            onNameChange={setNewDashboardName}
            onDescriptionChange={setNewDashboardDescription}
            onCreate={createDashboard}
            onClose={() => {
              setShowCreateModal(false)
              setNewDashboardName('')
              setNewDashboardDescription('')
            }}
            creating={creating}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          {/* Dashboard Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDashboardMenu(!showDashboardMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">
                {selectedDashboard?.name || 'Select Dashboard'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showDashboardMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  {dashboards.map((dashboard) => (
                    <div
                      key={dashboard.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                        selectedDashboard?.id === dashboard.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedDashboard(dashboard)
                        setShowDashboardMenu(false)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="text-sm font-medium">{dashboard.name}</span>
                        {dashboard.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteDashboard(dashboard.id)
                        }}
                        className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-2">
                  <button
                    onClick={() => {
                      setShowDashboardMenu(false)
                      setShowCreateModal(true)
                    }}
                    className="w-full flex items-center gap-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedDashboard?.description && (
            <span className="text-sm text-gray-500">
              {selectedDashboard.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboards}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      <div
        className="flex-1 overflow-auto p-4"
        style={{ backgroundColor: selectedDashboard?.backgroundColor || '#f9fafb' }}
      >
        {selectedDashboard && (
          <DashboardGrid
            dashboard={selectedDashboard}
            onUpdate={(widgets) => {
              setSelectedDashboard({ ...selectedDashboard, widgets })
            }}
          />
        )}
      </div>

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <CreateDashboardModal
          name={newDashboardName}
          description={newDashboardDescription}
          onNameChange={setNewDashboardName}
          onDescriptionChange={setNewDashboardDescription}
          onCreate={createDashboard}
          onClose={() => {
            setShowCreateModal(false)
            setNewDashboardName('')
            setNewDashboardDescription('')
          }}
          creating={creating}
        />
      )}
    </div>
  )
}

// Dashboard Grid Component
function DashboardGrid({
  dashboard,
  onUpdate,
}: {
  dashboard: Dashboard
  onUpdate: (widgets: Widget[]) => void
}) {
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [containerWidth, setContainerWidth] = useState(1200)

  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('dashboard-grid-container')
      if (container) {
        setContainerWidth(container.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const addWidget = async (type: string, title: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // Find next available position
      const maxY = dashboard.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0)
      
      const response = await fetch(`/api/analytics-dashboards/${dashboard.id}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          title,
          x: 0,
          y: maxY,
          w: type === 'number' ? 3 : type === 'progress' ? 4 : 4,
          h: type === 'number' ? 2 : type === 'progress' ? 1 : 3,
          config: { dataSource: 'records', metric: 'count' },
        }),
      })

      if (response.ok) {
        const widget = await response.json()
        onUpdate([...dashboard.widgets, widget])
        setShowAddWidget(false)
      }
    } catch (error) {
      console.error('Error adding widget:', error)
    }
  }

  const deleteWidget = async (widgetId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/analytics-dashboards/${dashboard.id}/widgets/${widgetId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.ok) {
        onUpdate(dashboard.widgets.filter(w => w.id !== widgetId))
      }
    } catch (error) {
      console.error('Error deleting widget:', error)
    }
  }

  const handleLayoutChange = async (newLayout: LayoutItem[]) => {
    // Update local state immediately
    const updatedWidgets = dashboard.widgets.map(widget => {
      const layoutItem = newLayout.find(l => l.i === widget.id)
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    })
    onUpdate(updatedWidgets)

    // Save to backend
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/analytics-dashboards/${dashboard.id}/widgets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          layouts: newLayout.map(l => ({
            i: l.i,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
          })),
        }),
      })
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }

  // Convert widgets to layout format
  const layout: LayoutItem[] = dashboard.widgets.map(widget => ({
    i: widget.id,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h,
    minW: 2,
    minH: 1,
  }))

  if (dashboard.widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No widgets yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add widgets to visualize your data
          </p>
          <button
            onClick={() => setShowAddWidget(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add Widget
          </button>
        </div>

        {showAddWidget && (
          <WidgetTypeSelector
            onSelect={addWidget}
            onClose={() => setShowAddWidget(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative" id="dashboard-grid-container">
      {/* Add Widget Button */}
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={() => setShowAddWidget(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </button>
      </div>

      {/* Widgets Grid with react-grid-layout */}
      <div className="pt-10">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={80}
          width={containerWidth}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLayoutChange={handleLayoutChange as any}
          draggableHandle=".widget-drag-handle"
          isResizable={true}
          isDraggable={true}
          margin={[16, 16]}
        >
          {dashboard.widgets.map((widget) => (
            <div
              key={widget.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 group"
            >
              {/* Widget Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="widget-drag-handle cursor-move p-1 -ml-1 hover:bg-gray-100 rounded">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                    </svg>
                  </div>
                  <h4 
                    className="font-medium text-gray-900 text-sm cursor-pointer hover:text-blue-600"
                    onClick={() => setEditingWidget(widget)}
                  >
                    {widget.title}
                  </h4>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingWidget(widget)}
                    className="p-1 hover:bg-blue-100 rounded text-gray-400 hover:text-blue-600"
                    title="Edit widget"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteWidget(widget.id)}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                    title="Delete widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Widget Content */}
              <div className="h-[calc(100%-2.5rem)] overflow-hidden">
                <WidgetContent widget={widget} />
              </div>
            </div>
          ))}
        </GridLayout>
      </div>

      {showAddWidget && (
        <WidgetTypeSelector
          onSelect={addWidget}
          onClose={() => setShowAddWidget(false)}
        />
      )}

      {/* Widget Config Panel */}
      {editingWidget && (
        <WidgetConfigPanel
          widget={editingWidget as unknown as Parameters<typeof WidgetConfigPanel>[0]['widget']}
          onSave={(updated) => {
            onUpdate(dashboard.widgets.map(w => w.id === updated.id ? updated as unknown as Widget : w))
            setEditingWidget(null)
          }}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  )
}

// Widget Content Component - renders the appropriate widget based on type
function WidgetContent({ widget }: { widget: Widget }) {
  const config = widget.config as {
    dataSource: string
    metric: string
    field?: string
    groupBy?: string
    filters?: Array<{ field: string; operator: string; value: string }>
    sortBy?: string
    sortOrder?: string
    limit?: number
    timePeriod?: string
    granularity?: string
    comparison?: string
    prefix?: string
    suffix?: string
    goalValue?: number
    columns?: string[]
  }

  const appearance = widget.appearance as {
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
    showArea?: boolean
    showPoints?: boolean
    smooth?: boolean
    showPercentage?: boolean
    showHeader?: boolean
    striped?: boolean
    compact?: boolean
  } | null

  switch (widget.type) {
    case 'number':
      return (
        <NumberWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          icon={widget.icon}
          config={config}
          appearance={appearance}
        />
      )
    case 'bar_chart':
    case 'horizontal_bar':
      return (
        <BarChartWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            groupBy: config.groupBy || 'status',
          }}
          appearance={{
            ...appearance,
            horizontal: widget.type === 'horizontal_bar',
          }}
        />
      )
    case 'pie_chart':
    case 'donut_chart':
      return (
        <PieChartWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            groupBy: config.groupBy || 'status',
          }}
          appearance={{
            ...appearance,
            donut: widget.type === 'donut_chart',
          }}
        />
      )
    case 'line_chart':
    case 'area_chart':
      return (
        <LineChartWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            timePeriod: config.timePeriod || 'last_30_days',
            granularity: config.granularity || 'daily',
          }}
          appearance={{
            ...appearance,
            showArea: widget.type === 'area_chart',
          }}
        />
      )
    case 'progress':
      return (
        <ProgressWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            goalValue: (config as { goalValue?: number }).goalValue || 100,
          }}
          appearance={appearance}
        />
      )
    case 'table':
      return (
        <TableWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            limit: config.limit || 10,
          }}
          appearance={appearance}
        />
      )
    case 'gauge':
      return (
        <GaugeWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            goalValue: (config as { goalValue?: number }).goalValue || 100,
          }}
          appearance={appearance}
        />
      )
    case 'leaderboard':
      return (
        <LeaderboardWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            limit: config.limit || 10,
          }}
          appearance={appearance}
        />
      )
    case 'funnel':
      return (
        <FunnelWidget
          widgetId={widget.id}
          title={widget.title}
          subtitle={widget.subtitle}
          config={{
            ...config,
            limit: config.limit || 5,
          }}
          appearance={appearance}
        />
      )
    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
          Widget type &quot;{widget.type}&quot; coming soon
        </div>
      )
  }
}

// Widget Type Selector Modal
function WidgetTypeSelector({
  onSelect,
  onClose,
}: {
  onSelect: (type: string, title: string) => void
  onClose: () => void
}) {
  const widgetTypes = [
    { type: 'number', label: 'Number', icon: '#', description: 'Display a single metric' },
    { type: 'bar_chart', label: 'Bar Chart', icon: '📊', description: 'Compare values' },
    { type: 'pie_chart', label: 'Pie Chart', icon: '🥧', description: 'Show distribution' },
    { type: 'donut_chart', label: 'Donut Chart', icon: '🍩', description: 'Distribution with center' },
    { type: 'line_chart', label: 'Line Chart', icon: '📈', description: 'Track trends' },
    { type: 'area_chart', label: 'Area Chart', icon: '📉', description: 'Filled trend chart' },
    { type: 'progress', label: 'Progress', icon: '▓', description: 'Goal tracking' },
    { type: 'gauge', label: 'Gauge', icon: '⏱️', description: 'Circular progress' },
    { type: 'table', label: 'Table', icon: '📋', description: 'List data' },
    { type: 'leaderboard', label: 'Leaderboard', icon: '🏆', description: 'Ranked list' },
    { type: 'funnel', label: 'Funnel', icon: '🔻', description: 'Pipeline stages' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Widget Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {widgetTypes.map((wt) => (
            <button
              key={wt.type}
              onClick={() => onSelect(wt.type, wt.label)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
            >
              <div className="text-2xl mb-2">{wt.icon}</div>
              <div className="font-medium text-gray-900">{wt.label}</div>
              <div className="text-xs text-gray-500">{wt.description}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Dashboard Modal
function CreateDashboardModal({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onCreate,
  onClose,
  creating,
}: {
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCreate: () => void
  onClose: () => void
  creating: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Dashboard</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., Sales Pipeline"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="What is this dashboard for?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!name.trim() || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
