/**
 * DockInsight 2.2.2 Analytics Components
 * 
 * Central export for all analytics UI components.
 */

// Main components
export { Dashboard } from './Dashboard'
export { DashboardGrid } from './DashboardGrid'
export { GlobalFiltersBar } from './GlobalFiltersBar'
export { DrilldownModal } from './DrilldownModal'
export { WidgetRenderer } from './WidgetRenderer'

// Widgets
export { MetricWidget, ChartWidget, PieWidget, TableWidget } from './widgets'

// Hooks
export { useWidgetData, useDrilldown } from './hooks'

// Types
export type {
  WidgetConfig,
  DashboardConfig,
  WidgetData,
  DrilldownData,
  WidgetState,
  DashboardState
} from './types'
