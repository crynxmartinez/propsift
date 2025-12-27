/**
 * DockInsight 2.2.2 Dashboard Builder
 * 
 * Main dashboard management UI with:
 * - Dashboard CRUD
 * - Widget CRUD
 * - Global filters
 * - Grid layout
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Settings, Trash2, Edit2, LayoutGrid, RefreshCw } from 'lucide-react'
import { DashboardGrid } from './DashboardGrid'
import { GlobalFiltersBar } from './GlobalFiltersBar'
import { WidgetConfigPanel } from './WidgetConfigPanel'
import { DrilldownModal } from './DrilldownModal'
import type { DashboardConfig, WidgetConfig } from './types'
import type { GlobalFilters } from '@/lib/analytics/registry/types'

interface DashboardBuilderProps {
  initialDashboardId?: string
}

export function DashboardBuilder({ initialDashboardId }: DashboardBuilderProps) {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([])
  const [currentDashboard, setCurrentDashboard] = useState<DashboardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [showWidgetConfig, setShowWidgetConfig] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)
  const [showDashboardSettings, setShowDashboardSettings] = useState(false)
  const [drilldownWidget, setDrilldownWidget] = useState<WidgetConfig | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Get auth token
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }
  
  // Fetch dashboards
  const fetchDashboards = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }
    
    try {
      const res = await fetch('/api/analytics/dashboards', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to fetch dashboards')
      
      const data = await res.json()
      setDashboards(data.dashboards || [])
      
      // Set current dashboard
      if (data.dashboards?.length > 0) {
        const target = initialDashboardId 
          ? data.dashboards.find((d: DashboardConfig) => d.id === initialDashboardId)
          : data.dashboards.find((d: DashboardConfig) => d.isDefault) || data.dashboards[0]
        
        if (target) {
          setCurrentDashboard({
            ...target,
            widgets: target.widgets || [],
            globalFilters: target.globalFilters || { dateRange: { preset: 'all_time' } }
          })
        }
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch dashboards:', err)
      setError('Failed to load dashboards')
      setLoading(false)
    }
  }, [initialDashboardId])
  
  useEffect(() => {
    fetchDashboards()
  }, [fetchDashboards])
  
  // Create dashboard
  const createDashboard = async (name: string) => {
    const token = getToken()
    if (!token) return
    
    try {
      const res = await fetch('/api/analytics/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          isDefault: dashboards.length === 0,
          globalFilters: { dateRange: { preset: 'all_time' } }
        })
      })
      
      if (!res.ok) throw new Error('Failed to create dashboard')
      
      const data = await res.json()
      setDashboards([...dashboards, data.dashboard])
      setCurrentDashboard({
        ...data.dashboard,
        widgets: [],
        globalFilters: data.dashboard.globalFilters || { dateRange: { preset: 'all_time' } }
      })
    } catch (err) {
      console.error('Failed to create dashboard:', err)
      alert('Failed to create dashboard')
    }
  }
  
  // Delete dashboard
  const deleteDashboard = async (id: string) => {
    const token = getToken()
    if (!token) return
    
    if (!confirm('Are you sure you want to delete this dashboard?')) return
    
    try {
      const res = await fetch(`/api/analytics/dashboards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to delete dashboard')
      
      const remaining = dashboards.filter(d => d.id !== id)
      setDashboards(remaining)
      
      if (currentDashboard?.id === id) {
        setCurrentDashboard(remaining[0] || null)
      }
    } catch (err) {
      console.error('Failed to delete dashboard:', err)
      alert('Failed to delete dashboard')
    }
  }
  
  // Update global filters
  const updateGlobalFilters = async (filters: GlobalFilters) => {
    if (!currentDashboard) return
    
    const token = getToken()
    if (!token) return
    
    try {
      await fetch(`/api/analytics/dashboards/${currentDashboard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ globalFilters: filters })
      })
      
      setCurrentDashboard({ ...currentDashboard, globalFilters: filters })
      setRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Failed to update filters:', err)
    }
  }
  
  // Add widget
  const addWidget = async (widget: Omit<WidgetConfig, 'id'>) => {
    if (!currentDashboard) return
    
    const token = getToken()
    if (!token) return
    
    try {
      const res = await fetch(`/api/analytics/dashboards/${currentDashboard.id}/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(widget)
      })
      
      if (!res.ok) throw new Error('Failed to add widget')
      
      const data = await res.json()
      setCurrentDashboard({
        ...currentDashboard,
        widgets: [...currentDashboard.widgets, data.widget]
      })
      setShowWidgetConfig(false)
    } catch (err) {
      console.error('Failed to add widget:', err)
      alert('Failed to add widget')
    }
  }
  
  // Update widget
  const updateWidget = async (widget: WidgetConfig) => {
    if (!currentDashboard) return
    
    const token = getToken()
    if (!token) return
    
    try {
      const res = await fetch(`/api/analytics/dashboards/${currentDashboard.id}/widgets/${widget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(widget)
      })
      
      if (!res.ok) throw new Error('Failed to update widget')
      
      const data = await res.json()
      setCurrentDashboard({
        ...currentDashboard,
        widgets: currentDashboard.widgets.map(w => w.id === widget.id ? data.widget : w)
      })
      setShowWidgetConfig(false)
      setEditingWidget(null)
    } catch (err) {
      console.error('Failed to update widget:', err)
      alert('Failed to update widget')
    }
  }
  
  // Delete widget
  const deleteWidget = async (widgetId: string) => {
    if (!currentDashboard) return
    
    const token = getToken()
    if (!token) return
    
    if (!confirm('Are you sure you want to delete this widget?')) return
    
    try {
      const res = await fetch(`/api/analytics/dashboards/${currentDashboard.id}/widgets/${widgetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to delete widget')
      
      setCurrentDashboard({
        ...currentDashboard,
        widgets: currentDashboard.widgets.filter(w => w.id !== widgetId)
      })
    } catch (err) {
      console.error('Failed to delete widget:', err)
      alert('Failed to delete widget')
    }
  }
  
  // Handle widget save
  const handleWidgetSave = (widget: Omit<WidgetConfig, 'id'> & { id?: string }) => {
    if (widget.id) {
      updateWidget(widget as WidgetConfig)
    } else {
      addWidget(widget)
    }
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }
  
  // No dashboards - prompt to create
  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LayoutGrid className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">No dashboards yet</p>
        <button
          onClick={() => {
            const name = prompt('Dashboard name:')
            if (name) createDashboard(name)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Dashboard
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Dashboard selector */}
          <select
            value={currentDashboard?.id || ''}
            onChange={(e) => {
              const dashboard = dashboards.find(d => d.id === e.target.value)
              if (dashboard) {
                setCurrentDashboard({
                  ...dashboard,
                  widgets: dashboard.widgets || [],
                  globalFilters: dashboard.globalFilters || { dateRange: { preset: 'all_time' } }
                })
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
          
          {/* Dashboard actions */}
          <button
            onClick={() => {
              const name = prompt('Dashboard name:')
              if (name) createDashboard(name)
            }}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded"
            title="New Dashboard"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          {currentDashboard && (
            <>
              <button
                onClick={() => setShowDashboardSettings(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                title="Dashboard Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => deleteDashboard(currentDashboard.id)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                title="Delete Dashboard"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              setEditingWidget(null)
              setShowWidgetConfig(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Widget
          </button>
        </div>
      </div>
      
      {/* Global Filters */}
      {currentDashboard && (
        <GlobalFiltersBar
          filters={currentDashboard.globalFilters}
          onChange={updateGlobalFilters}
        />
      )}
      
      {/* Dashboard Grid */}
      {currentDashboard && (
        <DashboardGrid
          key={refreshKey}
          widgets={currentDashboard.widgets}
          globalFilters={currentDashboard.globalFilters}
          onWidgetClick={(widget) => setDrilldownWidget(widget)}
          onWidgetEdit={(widget) => {
            setEditingWidget(widget)
            setShowWidgetConfig(true)
          }}
          onWidgetDelete={deleteWidget}
        />
      )}
      
      {/* Empty state */}
      {currentDashboard && currentDashboard.widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
          <LayoutGrid className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No widgets yet</p>
          <button
            onClick={() => {
              setEditingWidget(null)
              setShowWidgetConfig(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Widget
          </button>
        </div>
      )}
      
      {/* Widget Config Panel */}
      {showWidgetConfig && (
        <WidgetConfigPanel
          widget={editingWidget}
          onSave={handleWidgetSave}
          onClose={() => {
            setShowWidgetConfig(false)
            setEditingWidget(null)
          }}
        />
      )}
      
      {/* Drilldown Modal */}
      {drilldownWidget && currentDashboard && (
        <DrilldownModal
          widget={drilldownWidget}
          globalFilters={currentDashboard.globalFilters}
          onClose={() => setDrilldownWidget(null)}
        />
      )}
    </div>
  )
}
