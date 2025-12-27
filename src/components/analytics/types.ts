/**
 * DockInsight 2.2.2 UI Types
 * 
 * Type definitions for analytics UI components.
 */

import type { 
  GlobalFilters, 
  DateRange,
  MetricConfig 
} from '@/lib/analytics/registry/types'

/**
 * Widget configuration stored in dashboard
 */
export interface WidgetConfig {
  id: string
  type: 'metric' | 'chart' | 'table' | 'pie'
  title: string
  entityKey: string
  segmentKey?: string
  metric: MetricConfig
  dimension?: string
  filters?: Array<{
    field: string
    operator: string
    value: unknown
  }>
  dateRange?: DateRange
  dateMode?: string
  granularity?: 'day' | 'week' | 'month'
  sort?: {
    field: string
    dir: 'asc' | 'desc'
  }
  limit?: number
  // Layout
  x: number
  y: number
  w: number
  h: number
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string
  name: string
  description?: string
  isDefault?: boolean
  widgets: WidgetConfig[]
  globalFilters: GlobalFilters
  createdAt?: string
  updatedAt?: string
}

/**
 * Widget data response
 */
export interface WidgetData {
  type: 'single' | 'grouped'
  value?: number
  dimension?: string
  data?: Array<{
    value: string | null
    count: number
  }>
  total?: number
  cached: boolean
  cachedAt?: string
}

/**
 * Drilldown data response
 */
export interface DrilldownData {
  rows: unknown[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Widget state
 */
export interface WidgetState {
  loading: boolean
  error: string | null
  data: WidgetData | null
}

/**
 * Dashboard state
 */
export interface DashboardState {
  loading: boolean
  error: string | null
  dashboard: DashboardConfig | null
  widgetStates: Record<string, WidgetState>
}
