'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface WidgetConfig {
  dataSource: string
  metric: string
  field?: string
  groupBy?: string
  granularity?: string
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
  showPercentage?: boolean
  showRank?: boolean
  showAvatar?: boolean
  showBar?: boolean
  showArea?: boolean
  showPoints?: boolean
  smooth?: boolean
  showHeader?: boolean
  striped?: boolean
  compact?: boolean
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

// ==========================================
// PHASE 1: ALL 12 DATA SOURCES
// ==========================================
const DATA_SOURCES = [
  // Records (Main Entity)
  { value: 'records', label: 'Records', category: 'Records' },
  { value: 'records_hot', label: 'Hot Leads', category: 'Records' },
  { value: 'records_warm', label: 'Warm Leads', category: 'Records' },
  { value: 'records_cold', label: 'Cold Leads', category: 'Records' },
  { value: 'records_contacts', label: 'Contacts Only', category: 'Records' },
  { value: 'records_non_contacts', label: 'Non-Contacts', category: 'Records' },
  { value: 'records_completed', label: 'Completed Records', category: 'Records' },
  { value: 'records_unassigned', label: 'Unassigned Records', category: 'Records' },
  
  // Tasks
  { value: 'tasks', label: 'All Tasks', category: 'Tasks' },
  { value: 'tasks_pending', label: 'Pending Tasks', category: 'Tasks' },
  { value: 'tasks_in_progress', label: 'In Progress Tasks', category: 'Tasks' },
  { value: 'tasks_completed', label: 'Completed Tasks', category: 'Tasks' },
  { value: 'tasks_overdue', label: 'Overdue Tasks', category: 'Tasks' },
  { value: 'tasks_due_today', label: 'Due Today', category: 'Tasks' },
  { value: 'tasks_due_this_week', label: 'Due This Week', category: 'Tasks' },
  { value: 'tasks_unassigned', label: 'Unassigned Tasks', category: 'Tasks' },
  { value: 'tasks_recurring', label: 'Recurring Tasks', category: 'Tasks' },
  
  // Tags
  { value: 'tags', label: 'All Tags', category: 'Tags' },
  { value: 'tags_most_used', label: 'Most Used Tags', category: 'Tags' },
  { value: 'tags_unused', label: 'Unused Tags', category: 'Tags' },
  { value: 'records_with_tags', label: 'Records with Tags', category: 'Tags' },
  { value: 'records_without_tags', label: 'Records without Tags', category: 'Tags' },
  { value: 'records_multiple_tags', label: 'Records with Multiple Tags', category: 'Tags' },
  
  // Motivations
  { value: 'motivations', label: 'All Motivations', category: 'Motivations' },
  { value: 'motivations_most_used', label: 'Most Used Motivations', category: 'Motivations' },
  { value: 'motivations_unused', label: 'Unused Motivations', category: 'Motivations' },
  { value: 'records_with_motivations', label: 'Records with Motivations', category: 'Motivations' },
  { value: 'records_without_motivations', label: 'Records without Motivations', category: 'Motivations' },
  
  // Statuses
  { value: 'statuses', label: 'All Statuses', category: 'Statuses' },
  { value: 'statuses_active', label: 'Active Statuses', category: 'Statuses' },
  { value: 'statuses_inactive', label: 'Inactive Statuses', category: 'Statuses' },
  
  // Phone Numbers
  { value: 'phones', label: 'All Phone Numbers', category: 'Phones' },
  { value: 'phones_mobile', label: 'Mobile Phones', category: 'Phones' },
  { value: 'phones_landline', label: 'Landline Phones', category: 'Phones' },
  { value: 'phones_voip', label: 'VOIP Phones', category: 'Phones' },
  { value: 'phones_dnc', label: 'DNC Numbers', category: 'Phones' },
  { value: 'records_with_phones', label: 'Records with Phones', category: 'Phones' },
  { value: 'records_without_phones', label: 'Records without Phones', category: 'Phones' },
  { value: 'records_multiple_phones', label: 'Records with Multiple Phones', category: 'Phones' },
  
  // Emails
  { value: 'emails', label: 'All Emails', category: 'Emails' },
  { value: 'emails_primary', label: 'Primary Emails', category: 'Emails' },
  { value: 'records_with_emails', label: 'Records with Emails', category: 'Emails' },
  { value: 'records_without_emails', label: 'Records without Emails', category: 'Emails' },
  { value: 'records_multiple_emails', label: 'Records with Multiple Emails', category: 'Emails' },
  
  // Boards
  { value: 'boards', label: 'All Boards', category: 'Boards' },
  { value: 'board_columns', label: 'Board Columns', category: 'Boards' },
  { value: 'records_on_boards', label: 'Records on Boards', category: 'Boards' },
  { value: 'records_not_on_boards', label: 'Records Not on Any Board', category: 'Boards' },
  
  // Automations
  { value: 'automations', label: 'All Automations', category: 'Automations' },
  { value: 'automations_active', label: 'Active Automations', category: 'Automations' },
  { value: 'automations_inactive', label: 'Inactive Automations', category: 'Automations' },
  { value: 'automation_runs', label: 'Automation Runs', category: 'Automations' },
  { value: 'automation_runs_completed', label: 'Completed Runs', category: 'Automations' },
  { value: 'automation_runs_failed', label: 'Failed Runs', category: 'Automations' },
  { value: 'automation_runs_running', label: 'Running Now', category: 'Automations' },
  
  // Team/Users
  { value: 'team', label: 'All Team Members', category: 'Team' },
  { value: 'team_owners', label: 'Owners', category: 'Team' },
  { value: 'team_admins', label: 'Admins', category: 'Team' },
  { value: 'team_members', label: 'Members', category: 'Team' },
  { value: 'team_active', label: 'Active Users', category: 'Team' },
  { value: 'team_inactive', label: 'Inactive Users', category: 'Team' },
  
  // Activity Logs
  { value: 'activity', label: 'All Activity', category: 'Activity' },
  { value: 'activity_record', label: 'Record Activity', category: 'Activity' },
  { value: 'activity_imports', label: 'Import History', category: 'Activity' },
  
  // Notifications
  { value: 'notifications', label: 'All Notifications', category: 'Notifications' },
  { value: 'notifications_unread', label: 'Unread Notifications', category: 'Notifications' },
  { value: 'notifications_dismissed', label: 'Dismissed Notifications', category: 'Notifications' },
  
  // Custom Fields
  { value: 'custom_fields', label: 'Custom Field Definitions', category: 'Custom Fields' },
  { value: 'custom_field_values', label: 'Custom Field Values', category: 'Custom Fields' },
]

// ==========================================
// PHASE 2: METRICS PER DATA SOURCE
// ==========================================
const METRICS_BY_SOURCE: Record<string, Array<{ value: string; label: string; field?: string }>> = {
  // Records metrics
  records: [
    { value: 'count', label: 'Total Count' },
    { value: 'count_by_status', label: 'Count by Status' },
    { value: 'count_by_temperature', label: 'Count by Temperature' },
    { value: 'count_by_owner', label: 'Count by Owner' },
    { value: 'count_by_creator', label: 'Count by Creator' },
    { value: 'count_by_state', label: 'Count by Property State' },
    { value: 'count_by_city', label: 'Count by Property City' },
    { value: 'count_by_structure_type', label: 'Count by Structure Type' },
    { value: 'count_by_year_built', label: 'Count by Year Built' },
    { value: 'count_by_bedrooms', label: 'Count by Bedrooms' },
    { value: 'count_by_bathrooms', label: 'Count by Bathrooms' },
    { value: 'count_over_time', label: 'Count Over Time' },
    { value: 'sum_estimated_value', label: 'Total Estimated Value', field: 'estimatedValue' },
    { value: 'avg_estimated_value', label: 'Average Estimated Value', field: 'estimatedValue' },
    { value: 'sum_sqft', label: 'Total Sqft', field: 'sqft' },
    { value: 'avg_sqft', label: 'Average Sqft', field: 'sqft' },
    { value: 'sum_call_attempts', label: 'Total Call Attempts', field: 'callAttempts' },
    { value: 'avg_call_attempts', label: 'Avg Call Attempts', field: 'callAttempts' },
    { value: 'sum_sms_attempts', label: 'Total SMS Attempts', field: 'smsAttempts' },
    { value: 'avg_sms_attempts', label: 'Avg SMS Attempts', field: 'smsAttempts' },
    { value: 'sum_direct_mail_attempts', label: 'Total Direct Mail Attempts', field: 'directMailAttempts' },
    { value: 'sum_rvm_attempts', label: 'Total RVM Attempts', field: 'rvmAttempts' },
    { value: 'sum_total_attempts', label: 'Total All Attempts' },
    { value: 'count_zero_attempts', label: 'Records with 0 Attempts' },
    { value: 'count_high_attempts', label: 'Records with 5+ Attempts' },
  ],
  
  // Tasks metrics
  tasks: [
    { value: 'count', label: 'Total Count' },
    { value: 'count_by_status', label: 'Count by Status' },
    { value: 'count_by_priority', label: 'Count by Priority' },
    { value: 'count_by_assignee', label: 'Count by Assignee' },
    { value: 'count_over_time', label: 'Count Over Time' },
    { value: 'completion_rate', label: 'Completion Rate (%)' },
    { value: 'avg_completion_time', label: 'Avg Time to Complete' },
    { value: 'count_by_record', label: 'Tasks per Record' },
  ],
  
  // Tags metrics
  tags: [
    { value: 'count', label: 'Total Tags' },
    { value: 'records_per_tag', label: 'Records per Tag' },
  ],
  
  // Motivations metrics
  motivations: [
    { value: 'count', label: 'Total Motivations' },
    { value: 'records_per_motivation', label: 'Records per Motivation' },
  ],
  
  // Statuses metrics
  statuses: [
    { value: 'count', label: 'Total Statuses' },
    { value: 'records_per_status', label: 'Records per Status' },
  ],
  
  // Phones metrics
  phones: [
    { value: 'count', label: 'Total Phone Numbers' },
    { value: 'count_by_type', label: 'Count by Type' },
    { value: 'count_by_status', label: 'Count by Status' },
  ],
  
  // Emails metrics
  emails: [
    { value: 'count', label: 'Total Emails' },
    { value: 'count_primary', label: 'Primary Emails' },
  ],
  
  // Boards metrics
  boards: [
    { value: 'count', label: 'Total Boards' },
    { value: 'records_per_board', label: 'Records per Board' },
    { value: 'records_per_column', label: 'Records per Column' },
  ],
  
  // Automations metrics
  automations: [
    { value: 'count', label: 'Total Automations' },
    { value: 'count_active', label: 'Active Count' },
    { value: 'total_runs', label: 'Total Runs' },
    { value: 'success_rate', label: 'Success Rate (%)' },
    { value: 'runs_over_time', label: 'Runs Over Time' },
    { value: 'runs_by_status', label: 'Runs by Status' },
  ],
  
  // Team metrics
  team: [
    { value: 'count', label: 'Total Members' },
    { value: 'count_by_role', label: 'Count by Role' },
    { value: 'records_per_user', label: 'Records per User' },
    { value: 'tasks_per_user', label: 'Tasks per User' },
  ],
  
  // Activity metrics
  activity: [
    { value: 'count', label: 'Total Activities' },
    { value: 'count_by_action', label: 'Count by Action Type' },
    { value: 'count_over_time', label: 'Activity Over Time' },
    { value: 'count_by_user', label: 'Activity by User' },
  ],
  
  // Notifications metrics
  notifications: [
    { value: 'count', label: 'Total Notifications' },
    { value: 'count_by_type', label: 'Count by Type' },
    { value: 'unread_count', label: 'Unread Count' },
  ],
  
  // Custom Fields metrics
  custom_fields: [
    { value: 'count', label: 'Total Fields Defined' },
    { value: 'count_by_type', label: 'Count by Field Type' },
    { value: 'usage_rate', label: 'Field Usage Rate' },
  ],
}

// Default metrics for sources not explicitly defined
const DEFAULT_METRICS = [
  { value: 'count', label: 'Count' },
]

// ==========================================
// PHASE 4: GROUP BY OPTIONS PER DATA SOURCE
// ==========================================
const GROUP_BY_OPTIONS_BY_SOURCE: Record<string, Array<{ value: string; label: string }>> = {
  records: [
    { value: 'status', label: 'By Status' },
    { value: 'temperature', label: 'By Temperature' },
    { value: 'assignedTo', label: 'By Owner/Assignee' },
    { value: 'createdBy', label: 'By Creator' },
    { value: 'propertyState', label: 'By Property State' },
    { value: 'propertyCity', label: 'By Property City' },
    { value: 'structureType', label: 'By Structure Type' },
    { value: 'yearBuilt', label: 'By Year Built' },
    { value: 'bedrooms', label: 'By Bedrooms' },
    { value: 'bathrooms', label: 'By Bathrooms' },
    { value: 'tag', label: 'By Tag' },
    { value: 'motivation', label: 'By Motivation' },
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
    { value: 'month', label: 'By Month' },
    { value: 'quarter', label: 'By Quarter' },
    { value: 'year', label: 'By Year' },
  ],
  tasks: [
    { value: 'status', label: 'By Status' },
    { value: 'priority', label: 'By Priority' },
    { value: 'assignedTo', label: 'By Assignee' },
    { value: 'record', label: 'By Record' },
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
    { value: 'month', label: 'By Month' },
  ],
  phones: [
    { value: 'type', label: 'By Type' },
    { value: 'status', label: 'By Status' },
  ],
  automations: [
    { value: 'status', label: 'By Status' },
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
    { value: 'month', label: 'By Month' },
  ],
  team: [
    { value: 'role', label: 'By Role' },
    { value: 'status', label: 'By Status' },
  ],
  activity: [
    { value: 'action', label: 'By Action Type' },
    { value: 'user', label: 'By User' },
    { value: 'day', label: 'By Day' },
    { value: 'week', label: 'By Week' },
    { value: 'month', label: 'By Month' },
  ],
  notifications: [
    { value: 'type', label: 'By Type' },
    { value: 'isRead', label: 'By Read Status' },
  ],
  custom_fields: [
    { value: 'fieldType', label: 'By Field Type' },
    { value: 'displayType', label: 'By Display Type' },
  ],
}

const DEFAULT_GROUP_BY_OPTIONS = [
  { value: 'day', label: 'By Day' },
  { value: 'week', label: 'By Week' },
  { value: 'month', label: 'By Month' },
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
  { value: 'previous_week', label: 'Same Day Last Week' },
  { value: 'previous_month', label: 'Same Day Last Month' },
  { value: 'previous_year', label: 'Same Day Last Year' },
]

// ==========================================
// PHASE 3: FILTER OPTIONS PER DATA SOURCE
// ==========================================
const FILTER_FIELDS_BY_SOURCE: Record<string, Array<{ value: string; label: string; type: 'select' | 'text' | 'number' | 'boolean' | 'date'; options?: Array<{ value: string; label: string }> }>> = {
  records: [
    { 
      value: 'temperature', 
      label: 'Temperature', 
      type: 'select',
      options: [
        { value: 'Hot', label: 'Hot' },
        { value: 'Warm', label: 'Warm' },
        { value: 'Cold', label: 'Cold' },
      ]
    },
    { value: 'statusId', label: 'Status', type: 'select' },
    { value: 'assignedToId', label: 'Assigned To', type: 'select' },
    { value: 'createdById', label: 'Created By', type: 'select' },
    { value: 'propertyState', label: 'Property State', type: 'text' },
    { value: 'propertyCity', label: 'Property City', type: 'text' },
    { value: 'propertyZip', label: 'Property Zip', type: 'text' },
    { value: 'structureType', label: 'Structure Type', type: 'text' },
    { value: 'yearBuilt', label: 'Year Built', type: 'number' },
    { value: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { value: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { value: 'estimatedValue', label: 'Estimated Value', type: 'number' },
    { value: 'sqft', label: 'Square Feet', type: 'number' },
    { value: 'callAttempts', label: 'Call Attempts', type: 'number' },
    { value: 'smsAttempts', label: 'SMS Attempts', type: 'number' },
    { value: 'directMailAttempts', label: 'Direct Mail Attempts', type: 'number' },
    { value: 'rvmAttempts', label: 'RVM Attempts', type: 'number' },
    { value: 'isContact', label: 'Is Contact', type: 'boolean' },
    { value: 'isComplete', label: 'Is Complete', type: 'boolean' },
    { value: 'createdAt', label: 'Created Date', type: 'date' },
    { value: 'updatedAt', label: 'Updated Date', type: 'date' },
  ],
  tasks: [
    { 
      value: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'COMPLETED', label: 'Completed' },
      ]
    },
    { 
      value: 'priority', 
      label: 'Priority', 
      type: 'select',
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' },
      ]
    },
    { value: 'assignedToId', label: 'Assigned To', type: 'select' },
    { value: 'recordId', label: 'Record', type: 'select' },
    { value: 'dueDate', label: 'Due Date', type: 'date' },
    { value: 'createdAt', label: 'Created Date', type: 'date' },
  ],
  automations: [
    { value: 'isActive', label: 'Is Active', type: 'boolean' },
    { value: 'isDraft', label: 'Is Draft', type: 'boolean' },
  ],
  team: [
    { 
      value: 'role', 
      label: 'Role', 
      type: 'select',
      options: [
        { value: 'owner', label: 'Owner' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' },
      ]
    },
    { 
      value: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ]
    },
  ],
  phones: [
    { 
      value: 'type', 
      label: 'Phone Type', 
      type: 'select',
      options: [
        { value: 'MOBILE', label: 'Mobile' },
        { value: 'LANDLINE', label: 'Landline' },
        { value: 'VOIP', label: 'VOIP' },
      ]
    },
  ],
  notifications: [
    { value: 'isRead', label: 'Is Read', type: 'boolean' },
    { value: 'isDismissed', label: 'Is Dismissed', type: 'boolean' },
    { value: 'type', label: 'Type', type: 'text' },
  ],
  activity: [
    { value: 'action', label: 'Action Type', type: 'text' },
    { value: 'type', label: 'Log Type', type: 'text' },
  ],
  custom_fields: [
    { 
      value: 'fieldType', 
      label: 'Field Type', 
      type: 'select',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
        { value: 'select', label: 'Select' },
        { value: 'checkbox', label: 'Checkbox' },
      ]
    },
    { 
      value: 'displayType', 
      label: 'Display Type', 
      type: 'select',
      options: [
        { value: 'card', label: 'Card' },
        { value: 'additional_info', label: 'Additional Info' },
      ]
    },
  ],
}

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_or_equal', label: 'Greater or Equal' },
  { value: 'less_or_equal', label: 'Less or Equal' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
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
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const updateAppearance = (key: keyof WidgetAppearance, value: unknown) => {
    setAppearance(prev => ({ ...prev, [key]: value }))
  }

  const isChartWidget = ['bar_chart', 'horizontal_bar', 'pie_chart', 'donut_chart', 'line_chart', 'area_chart'].includes(widget.type)
  const isTimeSeriesChart = ['line_chart', 'area_chart'].includes(widget.type)
  const isGroupedChart = ['bar_chart', 'horizontal_bar', 'pie_chart', 'donut_chart'].includes(widget.type)

  // Get the base data source category (e.g., 'records' from 'records_hot')
  const getBaseSource = (source: string): string => {
    if (source.startsWith('records')) return 'records'
    if (source.startsWith('tasks')) return 'tasks'
    if (source.startsWith('tags') || source === 'records_with_tags' || source === 'records_without_tags' || source === 'records_multiple_tags') return 'tags'
    if (source.startsWith('motivations') || source === 'records_with_motivations' || source === 'records_without_motivations') return 'motivations'
    if (source.startsWith('statuses')) return 'statuses'
    if (source.startsWith('phones') || source === 'records_with_phones' || source === 'records_without_phones' || source === 'records_multiple_phones') return 'phones'
    if (source.startsWith('emails') || source === 'records_with_emails' || source === 'records_without_emails' || source === 'records_multiple_emails') return 'emails'
    if (source.startsWith('boards') || source === 'board_columns' || source === 'records_on_boards' || source === 'records_not_on_boards') return 'boards'
    if (source.startsWith('automation')) return 'automations'
    if (source.startsWith('team')) return 'team'
    if (source.startsWith('activity')) return 'activity'
    if (source.startsWith('notification')) return 'notifications'
    if (source.startsWith('custom_field')) return 'custom_fields'
    return 'records'
  }

  const baseSource = getBaseSource(config.dataSource)
  const availableMetrics = METRICS_BY_SOURCE[baseSource] || DEFAULT_METRICS
  const availableGroupBy = GROUP_BY_OPTIONS_BY_SOURCE[baseSource] || DEFAULT_GROUP_BY_OPTIONS

  // Group data sources by category for better UX
  const groupedDataSources = DATA_SOURCES.reduce((acc, ds) => {
    if (!acc[ds.category]) acc[ds.category] = []
    acc[ds.category].push(ds)
    return acc
  }, {} as Record<string, typeof DATA_SOURCES>)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Configure Dock</h3>
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

              {/* Data Source - Grouped by Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Source
                </label>
                <select
                  value={config.dataSource}
                  onChange={(e) => {
                    updateConfig('dataSource', e.target.value)
                    // Reset metric when data source changes
                    updateConfig('metric', 'count')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(groupedDataSources).map(([category, sources]) => (
                    <optgroup key={category} label={category}>
                      {sources.map((ds) => (
                        <option key={ds.value} value={ds.value}>
                          {ds.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Metric - Dynamic based on Data Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric
                </label>
                <select
                  value={config.metric}
                  onChange={(e) => updateConfig('metric', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableMetrics.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By (for bar/pie charts) - Dynamic based on Data Source */}
              {isGroupedChart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group By
                  </label>
                  <select
                    value={config.groupBy || availableGroupBy[0]?.value || 'status'}
                    onChange={(e) => updateConfig('groupBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableGroupBy.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Granularity (for line/area charts) */}
              {isTimeSeriesChart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Granularity
                  </label>
                  <select
                    value={config.granularity || 'daily'}
                    onChange={(e) => updateConfig('granularity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
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

              {/* Filters Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Filters
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newFilters = [...(config.filters || []), { field: '', operator: 'equals', value: '' }]
                      updateConfig('filters', newFilters)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Filter
                  </button>
                </div>
                
                {(config.filters || []).length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No filters applied</p>
                ) : (
                  <div className="space-y-2">
                    {(config.filters || []).map((filter, index) => {
                      const availableFilters = FILTER_FIELDS_BY_SOURCE[baseSource] || []
                      const selectedField = availableFilters.find(f => f.value === filter.field)
                      
                      return (
                        <div key={index} className="flex gap-1 items-start">
                          <div className="flex-1 space-y-1">
                            {/* Field selector */}
                            <select
                              value={filter.field}
                              onChange={(e) => {
                                const newFilters = [...(config.filters || [])]
                                newFilters[index] = { ...filter, field: e.target.value, value: '' }
                                updateConfig('filters', newFilters)
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select field...</option>
                              {availableFilters.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            
                            {filter.field && (
                              <div className="flex gap-1">
                                {/* Operator */}
                                <select
                                  value={filter.operator}
                                  onChange={(e) => {
                                    const newFilters = [...(config.filters || [])]
                                    newFilters[index] = { ...filter, operator: e.target.value }
                                    updateConfig('filters', newFilters)
                                  }}
                                  className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                >
                                  {FILTER_OPERATORS.filter(op => {
                                    // Filter operators based on field type
                                    if (selectedField?.type === 'boolean') {
                                      return ['equals'].includes(op.value)
                                    }
                                    if (selectedField?.type === 'select') {
                                      return ['equals', 'not_equals'].includes(op.value)
                                    }
                                    return true
                                  }).map((op) => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                  ))}
                                </select>
                                
                                {/* Value input - varies by field type */}
                                {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                                  <>
                                    {selectedField?.type === 'boolean' ? (
                                      <select
                                        value={filter.value}
                                        onChange={(e) => {
                                          const newFilters = [...(config.filters || [])]
                                          newFilters[index] = { ...filter, value: e.target.value }
                                          updateConfig('filters', newFilters)
                                        }}
                                        className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                      >
                                        <option value="">Select...</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                      </select>
                                    ) : selectedField?.options ? (
                                      <select
                                        value={filter.value}
                                        onChange={(e) => {
                                          const newFilters = [...(config.filters || [])]
                                          newFilters[index] = { ...filter, value: e.target.value }
                                          updateConfig('filters', newFilters)
                                        }}
                                        className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                      >
                                        <option value="">Select...</option>
                                        {selectedField.options.map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type={selectedField?.type === 'number' ? 'number' : selectedField?.type === 'date' ? 'date' : 'text'}
                                        value={filter.value}
                                        onChange={(e) => {
                                          const newFilters = [...(config.filters || [])]
                                          newFilters[index] = { ...filter, value: e.target.value }
                                          updateConfig('filters', newFilters)
                                        }}
                                        placeholder="Value..."
                                        className="w-1/2 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Remove filter button */}
                          <button
                            type="button"
                            onClick={() => {
                              const newFilters = (config.filters || []).filter((_, i) => i !== index)
                              updateConfig('filters', newFilters)
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* ==========================================
                  PHASE 6: ENHANCED APPEARANCE OPTIONS
                  ========================================== */}
              
              {/* Color Scheme Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Scheme
                </label>
                <div className="space-y-2">
                  {/* Preset Palettes */}
                  {[
                    { name: 'Blue', colors: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'] },
                    { name: 'Green', colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'] },
                    { name: 'Purple', colors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'] },
                    { name: 'Orange', colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'] },
                    { name: 'Red', colors: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'] },
                    { name: 'Pink', colors: ['#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FCE7F3'] },
                    { name: 'Teal', colors: ['#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1'] },
                    { name: 'Indigo', colors: ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF'] },
                    { name: 'Rainbow', colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'] },
                    { name: 'Grayscale', colors: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'] },
                  ].map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => updateAppearance('colors', palette.colors)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border ${
                        JSON.stringify(appearance.colors) === JSON.stringify(palette.colors)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Options Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Options
                </label>
                <div className="space-y-2">
                  {/* Show Values */}
                  {isChartWidget && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={appearance.showValues ?? false}
                        onChange={(e) => updateAppearance('showValues', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Values on Chart</span>
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

                  {/* Show Change Indicator (number widget) */}
                  {widget.type === 'number' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={appearance.showChange ?? false}
                        onChange={(e) => updateAppearance('showChange', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Change Indicator (+5% / -3%)</span>
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

                  {/* Show Percentage (gauge, progress) */}
                  {['gauge', 'progress'].includes(widget.type) && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={appearance.showPercentage ?? true}
                        onChange={(e) => updateAppearance('showPercentage', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Percentage</span>
                    </label>
                  )}

                  {/* Show Rank (leaderboard) */}
                  {widget.type === 'leaderboard' && (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={appearance.showRank ?? true}
                          onChange={(e) => updateAppearance('showRank', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Show Rank Numbers</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={appearance.showAvatar ?? true}
                          onChange={(e) => updateAppearance('showAvatar', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Show Avatars</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={appearance.showBar ?? true}
                          onChange={(e) => updateAppearance('showBar', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Show Progress Bars</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

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

              {/* Accent Color (single color widgets) */}
              {['number', 'progress', 'gauge'].includes(widget.type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#84CC16'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateAppearance('color', color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          appearance.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Thresholds (for gauge, progress, number) */}
              {['gauge', 'progress', 'number'].includes(widget.type) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Thresholds
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Set thresholds to change color based on value
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-yellow-600 mb-1">Warning Below</label>
                      <input
                        type="number"
                        value={appearance.thresholds?.warning || ''}
                        onChange={(e) => updateAppearance('thresholds', {
                          ...appearance.thresholds,
                          warning: parseInt(e.target.value) || 0
                        })}
                        placeholder="e.g., 50"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-red-600 mb-1">Danger Below</label>
                      <input
                        type="number"
                        value={appearance.thresholds?.danger || ''}
                        onChange={(e) => updateAppearance('thresholds', {
                          ...appearance.thresholds,
                          danger: parseInt(e.target.value) || 0
                        })}
                        placeholder="e.g., 25"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
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
