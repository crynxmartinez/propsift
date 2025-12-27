/**
 * DockInsight 3.0 Main Layout
 * 
 * Provides the main layout with tabs (Records, Tasks, Activity)
 * and role-based view switching.
 */

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, FileText, CheckSquare, Activity, ChevronDown, Flame, PhoneOff, Phone, Clock } from 'lucide-react'
import { GlobalFiltersBar } from './GlobalFiltersBar'
import { KPICard } from './KPICard'
import { ActionCard } from './ActionCard'
import { DrilldownModal } from './DrilldownModal'
import { TemperatureChart, TopTagsChart, MotivationsChart } from './charts'
import { RecentActivityTable, TopAssigneesTable } from './tables'
import { useKPIs, useCharts, useTables, useActionCards, useTasks } from './hooks'
import type { TabType, ViewMode, GlobalFilters } from './types'

interface DockInsightLayoutProps {
  userRole: string
  userId: string
  userName: string
}

const DEFAULT_FILTERS: GlobalFilters = {
  dateRange: { preset: 'last_30_days' }
}

export function DockInsightLayout({ userRole, userId, userName }: DockInsightLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('records')
  const [viewMode, setViewMode] = useState<ViewMode>('kpi')
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS)
  
  // Super admin and owner can see executive overview (all data)
  // Others see only their own data
  const canViewAll = ['owner', 'super_admin'].includes(userRole)
  const [isExecutiveView, setIsExecutiveView] = useState(canViewAll)

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'records', label: 'Records', icon: <FileText className="w-4 h-4" /> },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { key: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo and Tabs */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-900">DockInsight</span>
              </div>
              
              {/* Tabs */}
              <nav className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${activeTab === tab.key 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Right side - View selector and user */}
            <div className="flex items-center gap-4">
              {/* View Selector (only for admins) */}
              {canViewAll && (
                <div className="relative">
                  <button
                    onClick={() => setIsExecutiveView(!isExecutiveView)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    {isExecutiveView ? 'Executive Overview' : 'My Dashboard'}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('kpi')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    viewMode === 'kpi' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  KPI
                </button>
                <button
                  onClick={() => setViewMode('builder')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    viewMode === 'builder' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Builder
                </button>
              </div>
              
              {/* User Avatar */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Tab Content */}
        {activeTab === 'records' && (
          <RecordsTab 
            filters={filters}
            setFilters={setFilters}
            isExecutiveView={isExecutiveView}
            userId={userId}
            viewMode={viewMode}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab 
            filters={filters}
            setFilters={setFilters}
            isExecutiveView={isExecutiveView}
            userId={userId}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab 
            filters={filters}
            setFilters={setFilters}
            isExecutiveView={isExecutiveView}
            userId={userId}
          />
        )}
      </main>
    </div>
  )
}

// Placeholder components - will be built in subsequent phases
interface TabProps {
  filters: GlobalFilters
  setFilters: (filters: GlobalFilters) => void
  isExecutiveView: boolean
  userId: string
  viewMode?: ViewMode
}

interface Assignee {
  id: string
  name: string
}

function RecordsTab({ filters, setFilters, isExecutiveView, userId, viewMode }: TabProps) {
  const { data: kpis, loading: kpisLoading } = useKPIs({ filters, isExecutiveView })
  const { data: charts, loading: chartsLoading } = useCharts({ filters, isExecutiveView })
  const { data: tables, loading: tablesLoading } = useTables({ filters, isExecutiveView })
  const { data: actionCards, loading: actionCardsLoading } = useActionCards({ filters, isExecutiveView })
  
  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownTitle, setDrilldownTitle] = useState('')
  const [drilldownFilterType, setDrilldownFilterType] = useState('')
  const [assignees, setAssignees] = useState<Assignee[]>([])

  // Fetch assignees for drilldown
  useEffect(() => {
    const fetchAssignees = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const response = await fetch('/api/dockinsight/filters', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setAssignees(data.assignees || [])
        }
      } catch (error) {
        console.error('Failed to fetch assignees:', error)
      }
    }
    fetchAssignees()
  }, [])

  const openDrilldown = (title: string, filterType: string) => {
    setDrilldownTitle(title)
    setDrilldownFilterType(filterType)
    setDrilldownOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Global Filters */}
      <GlobalFiltersBar
        filters={filters}
        onChange={setFilters}
        isExecutiveView={isExecutiveView}
        userId={userId}
      />
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Records"
          value={kpis?.totalRecords.current ?? null}
          previousValue={kpis?.totalRecords.previous}
          loading={kpisLoading}
        />
        <KPICard
          title="Hot Records"
          value={kpis?.hotRecords.current ?? null}
          previousValue={kpis?.hotRecords.previous}
          loading={kpisLoading}
        />
        <KPICard
          title="Call Ready Leads"
          value={kpis?.callReady.current ?? null}
          previousValue={kpis?.callReady.previous}
          loading={kpisLoading}
        />
        <KPICard
          title="Tasks Due"
          value={kpis?.tasksDue.current ?? null}
          previousValue={kpis?.tasksDue.previous}
          loading={kpisLoading}
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TemperatureChart 
          data={charts?.temperature ?? null} 
          loading={chartsLoading}
        />
        <TopTagsChart 
          data={charts?.tags ?? null} 
          loading={chartsLoading}
        />
      </div>
      
      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityTable 
          data={tables?.recentActivity ?? null} 
          loading={tablesLoading}
        />
        <TopAssigneesTable 
          data={tables?.topAssignees ?? null} 
          loading={tablesLoading}
        />
      </div>
      
      {/* Motivations Chart with Temperature Overlay */}
      <MotivationsChart 
        data={charts?.motivations ?? null} 
        loading={chartsLoading}
      />
      
      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          title="Hot + Unassigned"
          count={actionCards?.hotUnassigned.count ?? null}
          description="Needs assignment"
          icon={<Flame className="w-4 h-4" />}
          color="blue"
          loading={actionCardsLoading}
          onClick={() => openDrilldown('Hot + Unassigned', 'hot_unassigned')}
        />
        <ActionCard
          title="No Phone Number"
          count={actionCards?.noPhone.count ?? null}
          description="Missing contact info"
          icon={<PhoneOff className="w-4 h-4" />}
          color="orange"
          loading={actionCardsLoading}
          onClick={() => openDrilldown('No Phone Number', 'no_phone')}
        />
        <ActionCard
          title="Call Ready"
          count={actionCards?.callReady.count ?? null}
          description="Complete records"
          icon={<Phone className="w-4 h-4" />}
          color="green"
          loading={actionCardsLoading}
          onClick={() => openDrilldown('Call Ready', 'call_ready')}
        />
        <ActionCard
          title="Stale Leads"
          count={actionCards?.staleLeads.count ?? null}
          description="No activity 30+ days"
          icon={<Clock className="w-4 h-4" />}
          color="red"
          loading={actionCardsLoading}
          onClick={() => openDrilldown('Stale Leads', 'stale_leads')}
        />
      </div>

      {/* Drilldown Modal */}
      <DrilldownModal
        isOpen={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
        title={drilldownTitle}
        filterType={drilldownFilterType}
        isExecutiveView={isExecutiveView}
        assignees={assignees}
      />
    </div>
  )
}

function TasksTab({ filters, setFilters, isExecutiveView, userId }: TabProps) {
  const { data: tasksData, loading } = useTasks({ filters, isExecutiveView })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const priorityColors: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700'
  }

  return (
    <div className="space-y-6">
      {/* Task KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Tasks Due Today"
          value={tasksData?.kpis.tasksDueToday ?? null}
          loading={loading}
        />
        <KPICard
          title="Overdue Tasks"
          value={tasksData?.kpis.overdueTasks ?? null}
          loading={loading}
        />
        <KPICard
          title="Completed This Week"
          value={tasksData?.kpis.completedThisWeek ?? null}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks by Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Tasks by Status</h3>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tasksData?.tasksByStatus && tasksData.tasksByStatus.length > 0 ? (
            <div className="space-y-3">
              {tasksData.tasksByStatus.map((status) => (
                <div key={status.label} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 truncate">{status.label}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (status.value / Math.max(...tasksData.tasksByStatus.map(s => s.value))) * 100)}%`,
                        backgroundColor: status.color 
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-gray-900">{status.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
              No task data
            </div>
          )}
        </div>

        {/* Tasks by Assignee (Executive View Only) */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-72">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Tasks by Assignee</h3>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : isExecutiveView && tasksData?.tasksByAssignee && tasksData.tasksByAssignee.length > 0 ? (
            <div className="overflow-auto h-52">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Assignee</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Open Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksData.tasksByAssignee.map((assignee) => (
                    <tr key={assignee.id} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">
                            {assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700">{assignee.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-gray-900">
                        {assignee.taskCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
              {isExecutiveView ? 'No assignee data' : 'Available in Executive View'}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Upcoming Tasks</h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tasksData?.upcomingTasks && tasksData.upcomingTasks.length > 0 ? (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Task</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Record</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Due</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Priority</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasksData.upcomingTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {task.title}
                    </td>
                    <td className="py-2 px-3 text-blue-600 max-w-[150px] truncate">
                      {task.recordName || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority] || 'bg-gray-100 text-gray-700'}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {task.assigneeName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
            No upcoming tasks
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityTab({ filters, setFilters, isExecutiveView, userId }: TabProps) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Activity Tab (Phase 9)</p>
      </div>
    </div>
  )
}
