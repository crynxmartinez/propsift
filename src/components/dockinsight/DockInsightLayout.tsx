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
import { TaskStatusChart, TaskTypesChart, WorkflowCompletion, TaskActionCard, TaskSidebar, TaskTable } from './tasks'
import { useKPIs, useCharts, useTables, useActionCards, useTasks, useActivity, useTasksKPIs, useTasksCharts, useTasksActionCards, useTasksList } from './hooks'
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
      
      {/* Charts Row - Temperature, Tags, Motivations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TemperatureChart 
          data={charts?.temperature ?? null} 
          loading={chartsLoading}
        />
        <TopTagsChart 
          data={charts?.tags ?? null} 
          loading={chartsLoading}
        />
        <MotivationsChart 
          data={charts?.motivations ?? null} 
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
  // Task state
  const [activeCategory, setActiveCategory] = useState('open_overdue')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch task data using new hooks
  const { data: kpis, loading: kpisLoading } = useTasksKPIs({ filters, isExecutiveView })
  const { data: charts, loading: chartsLoading } = useTasksCharts({ filters, isExecutiveView })
  const { data: actionCards, loading: actionCardsLoading, refetch: refetchActionCards } = useTasksActionCards({ filters, isExecutiveView })
  const { data: tasksList, loading: tasksListLoading, markAsDone, refetch: refetchTasksList } = useTasksList({
    filters,
    isExecutiveView,
    filterType: activeCategory,
    search,
    page,
    pageSize
  })

  // Reset page when category or search changes
  useEffect(() => {
    setPage(1)
  }, [activeCategory, search])

  // Handle mark as done
  const handleMarkAsDone = async (taskIds: string[]) => {
    const success = await markAsDone(taskIds)
    if (success) {
      refetchActionCards()
    }
  }

  // Build sidebar categories
  const sidebarCategories = [
    { key: 'open_overdue', label: 'Open + Overdue', count: actionCards?.openPlusOverdue.count || 0, color: '#3b82f6' },
    { key: 'overdue', label: 'Overdue', count: actionCards?.overdue.count || 0, color: '#ef4444' },
    { key: 'due_tomorrow', label: 'Due Tomorrow', count: actionCards?.dueTomorrow.count || 0, color: '#f97316' },
    { key: 'due_next_7_days', label: 'Due Next 7 Days', count: actionCards?.dueNext7Days.count || 0, color: '#eab308' },
    { key: 'completed', label: 'Completed', count: actionCards?.completed.count || 0, color: '#22c55e' }
  ]

  // Get filter title for table
  const filterTitles: Record<string, string> = {
    'open_overdue': 'Open Tasks',
    'overdue': 'Overdue Tasks',
    'due_tomorrow': 'Due Tomorrow',
    'due_next_7_days': 'Due Next 7 Days',
    'completed': 'Completed Tasks'
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

      {/* Task KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Tasks"
          value={kpis?.totalTasks.current ?? null}
          previousValue={kpis?.totalTasks.previous}
          loading={kpisLoading}
        />
        <KPICard
          title="Overdue Tasks"
          value={kpis?.overdueTasks.current ?? null}
          previousValue={kpis?.overdueTasks.previous}
          loading={kpisLoading}
          valueColor="text-red-600"
        />
        <KPICard
          title="Due Today"
          value={kpis?.dueToday.current ?? null}
          previousValue={kpis?.dueToday.previous}
          loading={kpisLoading}
        />
        <KPICard
          title="Completed Tasks"
          value={kpis?.completedTasks.current ?? null}
          previousValue={kpis?.completedTasks.previous}
          loading={kpisLoading}
          valueColor="text-green-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TaskStatusChart 
          data={charts?.tasksByStatus || null} 
          loading={chartsLoading} 
        />
        <TaskTypesChart 
          data={charts?.taskTypes || null} 
          loading={chartsLoading} 
        />
        <WorkflowCompletion 
          data={charts?.workflowCompletion || null} 
          loading={chartsLoading} 
        />
      </div>

      {/* Action Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <TaskActionCard
          title="Open + Overdue"
          count={actionCards?.openPlusOverdue.count ?? null}
          color="blue"
          loading={actionCardsLoading}
          active={activeCategory === 'open_overdue'}
          onClick={() => setActiveCategory('open_overdue')}
        />
        <TaskActionCard
          title="Overdue"
          count={actionCards?.overdue.count ?? null}
          color="red"
          loading={actionCardsLoading}
          active={activeCategory === 'overdue'}
          onClick={() => setActiveCategory('overdue')}
        />
        <TaskActionCard
          title="Due Tomorrow"
          count={actionCards?.dueTomorrow.count ?? null}
          color="orange"
          loading={actionCardsLoading}
          active={activeCategory === 'due_tomorrow'}
          onClick={() => setActiveCategory('due_tomorrow')}
        />
        <TaskActionCard
          title="Due Next 7 Days"
          count={actionCards?.dueNext7Days.count ?? null}
          color="yellow"
          loading={actionCardsLoading}
          active={activeCategory === 'due_next_7_days'}
          onClick={() => setActiveCategory('due_next_7_days')}
        />
        <TaskActionCard
          title="Completed"
          count={actionCards?.completed.count ?? null}
          color="green"
          loading={actionCardsLoading}
          active={activeCategory === 'completed'}
          onClick={() => setActiveCategory('completed')}
        />
      </div>

      {/* Task List Section */}
      <div className="flex gap-4">
        {/* Sidebar */}
        <TaskSidebar
          categories={sidebarCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          loading={actionCardsLoading}
        />

        {/* Task Table */}
        <TaskTable
          tasks={tasksList?.tasks || null}
          total={tasksList?.total || 0}
          page={tasksList?.page || 1}
          pageSize={tasksList?.pageSize || pageSize}
          totalPages={tasksList?.totalPages || 1}
          loading={tasksListLoading}
          search={search}
          onSearchChange={setSearch}
          onPageChange={setPage}
          onMarkAsDone={handleMarkAsDone}
          filterTitle={filterTitles[activeCategory] || 'Tasks'}
        />
      </div>
    </div>
  )
}

function ActivityTab({ filters, setFilters, isExecutiveView, userId }: TabProps) {
  const { data: activityData, loading } = useActivity({ filters, isExecutiveView })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const activityTypeIcons: Record<string, { icon: string; color: string }> = {
    record_created: { icon: '📄', color: 'bg-blue-100 text-blue-700' },
    task_created: { icon: '📋', color: 'bg-purple-100 text-purple-700' },
    task_completed: { icon: '✅', color: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="space-y-6">
      {/* Activity KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Records Created Today"
          value={activityData?.kpis.recordsCreatedToday ?? null}
          loading={loading}
        />
        <KPICard
          title="Records This Week"
          value={activityData?.kpis.recordsCreatedThisWeek ?? null}
          loading={loading}
        />
        <KPICard
          title="Tasks Completed Today"
          value={activityData?.kpis.tasksCompletedToday ?? null}
          loading={loading}
        />
        <KPICard
          title="Tasks This Week"
          value={activityData?.kpis.tasksCompletedThisWeek ?? null}
          loading={loading}
        />
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Activity (Last 7 Days)</h3>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activityData?.activityByDay && activityData.activityByDay.length > 0 ? (
          <div className="h-48">
            <div className="flex items-end justify-between h-40 gap-2">
              {activityData.activityByDay.map((day, index) => {
                const maxValue = Math.max(
                  ...activityData.activityByDay.map(d => d.records + d.tasks),
                  1
                )
                const totalHeight = ((day.records + day.tasks) / maxValue) * 100
                const recordHeight = (day.records / (day.records + day.tasks || 1)) * totalHeight
                const taskHeight = (day.tasks / (day.records + day.tasks || 1)) * totalHeight

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col justify-end h-32">
                      {(day.records > 0 || day.tasks > 0) ? (
                        <>
                          <div 
                            className="w-full bg-green-500 rounded-t"
                            style={{ height: `${taskHeight}%` }}
                            title={`Tasks: ${day.tasks}`}
                          />
                          <div 
                            className="w-full bg-blue-500 rounded-b"
                            style={{ height: `${recordHeight}%` }}
                            title={`Records: ${day.records}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-gray-200 rounded h-1" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-gray-600">Records</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-xs text-gray-600">Tasks</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
            No activity data
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Activity Feed</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activityData?.activityFeed && activityData.activityFeed.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-auto">
            {activityData.activityFeed.map((item) => {
              const typeInfo = activityTypeIcons[item.type] || { icon: '📌', color: 'bg-gray-100 text-gray-700' }
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${typeInfo.color}`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                      <span className="text-xs text-gray-400">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{item.description}</p>
                    <p className="text-xs text-gray-400">by {item.userName}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
