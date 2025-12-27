/**
 * DockInsight 3.0 Types
 */

export type ViewMode = 'kpi' | 'builder'
export type TabType = 'records' | 'tasks' | 'activity'

export interface GlobalFilters {
  dateRange: DateRangeFilter
  market?: string
  assigneeIds?: string[]
  temperature?: ('hot' | 'warm' | 'cold')[]
  tagIds?: string[]
  motivationIds?: string[]
  callReady?: boolean
  // Task-specific filters
  priority?: ('HIGH' | 'MEDIUM' | 'LOW')[]
  taskStatus?: ('PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')[]
}

export interface DateRangeFilter {
  preset: DatePreset
  startDate?: string
  endDate?: string
}

export type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface KPIData {
  value: number
  previousValue: number
  percentChange: number
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface MotivationChartData {
  motivation: string
  total: number
  hot: number
  warm: number
  cold: number
}

export interface ActivityItem {
  id: string
  recordId: string
  recordName: string
  assigneeId: string | null
  assigneeName: string | null
  lastActivityAt: Date
  activityType: string
}

export interface AssigneeStats {
  id: string
  name: string
  recordCount: number
}

export interface ActionCardData {
  id: string
  title: string
  count: number
  description: string
  color: 'blue' | 'orange' | 'green' | 'red'
  filterKey: string
}

export interface DrilldownRecord {
  id: string
  ownerName: string | null
  propertyAddress: string | null
  phone: string | null
  temperature: string | null
  assigneeId: string | null
  assigneeName: string | null
}

export interface DrilldownData {
  records: DrilldownRecord[]
  total: number
  page: number
  pageSize: number
}

export interface User {
  id: string
  name: string
  role: string
}
