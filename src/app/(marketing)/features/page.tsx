import Link from 'next/link'
import { 
  ArrowRight,
  CheckCircle,
  ClipboardList,
  BarChart3,
  Target,
  Zap,
  Users,
  Phone,
  Mail,
  Building,
  Filter,
  Tag,
  Thermometer,
  Calendar,
  Bell,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  LayoutGrid,
  GitBranch,
  Clock,
  UserCheck,
  Activity,
  PieChart,
  TrendingUp,
  Settings
} from 'lucide-react'

export const metadata = {
  title: 'Features - PropSift',
  description: 'Explore all the powerful features PropSift offers for real estate wholesalers.',
}

export default function FeaturesPage() {
  return (
    <div className="bg-white">
      <HeroSection />
      <LeadManagementSection />
      <AnalyticsSection />
      <KanbanSection />
      <AutomationsSection />
      <TeamSection />
      <MoreFeaturesSection />
      <CTASection />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Powerful Features for{' '}
          <span className="text-blue-600">Modern Wholesalers</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Everything you need to manage leads, automate workflows, and close more deals — all in one platform built specifically for real estate wholesalers.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Free Trial
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}

function LeadManagementSection() {
  const features = [
    {
      icon: Building,
      title: 'Complete Property Records',
      description: 'Store property address, bedrooms, bathrooms, sqft, lot size, year built, structure type, and estimated value.',
    },
    {
      icon: Users,
      title: 'Owner Information',
      description: 'Track owner name, mailing address, multiple phone numbers, and email addresses. Auto-detect corporate vs individual owners.',
    },
    {
      icon: Phone,
      title: 'Outreach Tracking',
      description: 'Log call attempts, direct mail, SMS, and voicemails. Know exactly when and how you contacted each lead.',
    },
    {
      icon: Thermometer,
      title: 'Lead Temperature',
      description: 'Mark leads as Hot, Warm, or Cold. Instantly see which leads need immediate attention.',
    },
    {
      icon: Tag,
      title: 'Tags & Motivations',
      description: 'Categorize leads with custom tags (Vacant, Absentee, Tax Lien) and seller motivations (Divorce, Probate, Foreclosure).',
    },
    {
      icon: Settings,
      title: 'Custom Fields',
      description: 'Add your own fields to track any data specific to your business. Text, numbers, dates, dropdowns — you decide.',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <ClipboardList className="w-4 h-4" />
              Lead Management
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              All Your Leads in One Place
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Stop juggling spreadsheets. PropSift centralizes all your property leads with complete owner and property information, outreach history, and custom categorization.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="flex gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Visual */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Search records...</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { name: 'John Smith', address: '123 Main St, Houston TX', temp: 'Hot', tags: ['Vacant', 'Absentee'] },
                  { name: 'ABC Holdings LLC', address: '456 Oak Ave, Dallas TX', temp: 'Warm', tags: ['Tax Lien'] },
                  { name: 'Mary Johnson', address: '789 Pine Rd, Austin TX', temp: 'Hot', tags: ['Probate'] },
                ].map((record, i) => (
                  <div key={i} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{record.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        record.temp === 'Hot' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {record.temp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{record.address}</p>
                    <div className="flex gap-1">
                      {record.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AnalyticsSection() {
  const kpis = [
    { label: 'Total Records', value: '1,247', change: '+12%' },
    { label: 'Hot Leads', value: '89', change: '+8' },
    { label: 'Call Ready', value: '342', change: null },
    { label: 'Tasks Due', value: '15', change: '3 overdue' },
  ]

  const actionCards = [
    { label: 'Hot + Unassigned', count: 12, color: 'red' },
    { label: 'No Phone Number', count: 45, color: 'yellow' },
    { label: 'Call Ready Today', count: 28, color: 'green' },
    { label: 'Stale Leads (30+ days)', count: 67, color: 'gray' },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    {kpi.change && (
                      <p className={`text-xs ${kpi.change.includes('overdue') ? 'text-orange-600' : 'text-green-600'}`}>
                        {kpi.change}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Cards */}
              <p className="text-sm font-medium text-gray-700 mb-3">Action Cards</p>
              <div className="grid grid-cols-2 gap-3">
                {actionCards.map((card) => (
                  <div key={card.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-8 rounded-full ${
                      card.color === 'red' ? 'bg-red-500' :
                      card.color === 'yellow' ? 'bg-yellow-500' :
                      card.color === 'green' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-lg font-bold text-gray-900">{card.count}</p>
                      <p className="text-xs text-gray-500">{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              DockInsight Analytics
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Data-Driven Decisions at a Glance
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Stop guessing where to focus. DockInsight shows you real-time KPIs, charts, and action cards so you always know what to work on next.
            </p>

            <ul className="space-y-4">
              {[
                { icon: PieChart, text: 'Temperature distribution charts show your lead quality' },
                { icon: TrendingUp, text: 'Track trends over time with period comparisons' },
                { icon: Activity, text: 'Action cards surface leads that need attention NOW' },
                { icon: UserCheck, text: 'Executive view for owners, personal view for team members' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-gray-700">{item.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function KanbanSection() {
  const columns = [
    { name: 'New Leads', color: 'bg-gray-400', count: 24 },
    { name: 'Contacted', color: 'bg-blue-500', count: 18 },
    { name: 'Negotiating', color: 'bg-yellow-500', count: 7 },
    { name: 'Under Contract', color: 'bg-green-500', count: 3 },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
              <LayoutGrid className="w-4 h-4" />
              Kanban Boards
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Visual Pipeline Management
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Create custom boards for acquisitions, dispositions, or any workflow. Drag and drop records through stages and see your pipeline at a glance.
            </p>

            <ul className="space-y-4">
              {[
                'Create unlimited boards with custom columns',
                'Drag and drop records between stages',
                'Color-coded columns for quick visual scanning',
                'See record counts per stage instantly',
                'Multiple boards for different workflows',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {columns.map((col) => (
                <div key={col.name} className="flex-shrink-0 w-48">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${col.color}`} />
                    <span className="font-medium text-gray-900 text-sm">{col.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{col.count}</span>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <div className="h-2 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AutomationsSection() {
  const triggers = ['Record Created', 'Status Changed', 'Tag Added', 'Record Assigned', 'Task Completed']
  const actions = ['Update Status', 'Update Temperature', 'Add/Remove Tags', 'Assign User', 'Create Task', 'Send Notification']

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              {/* Workflow visualization */}
              <div className="flex flex-col items-center gap-4">
                {/* Trigger */}
                <div className="w-full max-w-xs bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 font-medium mb-1">TRIGGER</p>
                  <p className="font-semibold text-gray-900">When record marked HOT</p>
                </div>
                
                <GitBranch className="w-6 h-6 text-gray-400 rotate-180" />
                
                {/* Condition */}
                <div className="w-full max-w-xs bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-yellow-600 font-medium mb-1">CONDITION</p>
                  <p className="font-semibold text-gray-900">If unassigned</p>
                </div>
                
                <GitBranch className="w-6 h-6 text-gray-400 rotate-180" />
                
                {/* Actions */}
                <div className="w-full max-w-xs space-y-2">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">ACTION</p>
                    <p className="font-medium text-gray-900 text-sm">Assign to closer</p>
                  </div>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">ACTION</p>
                    <p className="font-medium text-gray-900 text-sm">Create "Make Offer" task</p>
                  </div>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">ACTION</p>
                    <p className="font-medium text-gray-900 text-sm">Send notification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Workflow Automations
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Automate the Repetitive Stuff
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Build trigger-based workflows that run automatically. When something happens, PropSift takes action — so you can focus on talking to sellers.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold text-gray-900 mb-3">Triggers</p>
                <ul className="space-y-2">
                  {triggers.map((trigger) => (
                    <li key={trigger} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-3">Actions</p>
                <ul className="space-y-2">
                  {actions.map((action) => (
                    <li key={action} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  const roles = [
    { name: 'Owner', description: 'Full access to everything including billing and team management' },
    { name: 'Super Admin', description: 'Full access except billing settings' },
    { name: 'Admin', description: 'Can manage data, import/export, but limited settings access' },
    { name: 'Member', description: 'Can only see and work on assigned records and tasks' },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Team Collaboration
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Scale Your Operation
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Add team members with role-based access. Assign leads, distribute tasks with round-robin, and track everyone's performance.
            </p>

            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.name} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Team Performance</p>
            <div className="space-y-4">
              {[
                { name: 'John D.', records: 145, tasks: 28, deals: 5 },
                { name: 'Sarah M.', records: 132, tasks: 35, deals: 4 },
                { name: 'Mike R.', records: 98, tasks: 22, deals: 3 },
              ].map((member) => (
                <div key={member.name} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">{member.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{member.records}</p>
                      <p className="text-xs text-gray-500">Records</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{member.tasks}</p>
                      <p className="text-xs text-gray-500">Tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{member.deals}</p>
                      <p className="text-xs text-gray-500">Deals</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MoreFeaturesSection() {
  const features = [
    { icon: Upload, title: 'Bulk Import', description: 'Import thousands of leads from CSV in seconds' },
    { icon: Download, title: 'Export to CSV', description: 'Export filtered records for mail houses or other tools' },
    { icon: Filter, title: 'Advanced Filtering', description: 'Build complex filters with multiple conditions' },
    { icon: Calendar, title: 'Task Scheduling', description: 'Due dates, priorities, and recurrence options' },
    { icon: Bell, title: 'Notifications', description: 'Get notified when important things happen' },
    { icon: Clock, title: 'Activity Logs', description: 'Full audit trail of every change made' },
    { icon: FileSpreadsheet, title: 'Task Templates', description: 'Create reusable task sequences' },
    { icon: Search, title: 'Global Search', description: 'Find any record instantly' },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            And Much More...
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            PropSift is packed with features to help you work smarter.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-20 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Transform Your Wholesaling Business?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Start your free 14-day trial today. No credit card required.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Start Free Trial
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  )
}
