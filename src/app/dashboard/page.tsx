'use client'

import { Building2, Search, Upload, Database } from 'lucide-react'

const stats = [
  { name: 'Total Properties', value: '0', icon: Building2, color: 'bg-blue-500' },
  { name: 'Searches Today', value: '0', icon: Search, color: 'bg-green-500' },
  { name: 'Batch Uploads', value: '0', icon: Upload, color: 'bg-purple-500' },
  { name: 'Cached Data', value: '0 MB', icon: Database, color: 'bg-orange-500' },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back to PropSift</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/dashboard/search"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <Search className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Search Property</p>
                <p className="text-sm text-gray-500">Look up property details by address</p>
              </div>
            </a>
            <a
              href="/dashboard/upload"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <Upload className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Batch Upload</p>
                <p className="text-sm text-gray-500">Upload CSV/Excel with addresses</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Start by searching for a property</p>
          </div>
        </div>
      </div>
    </div>
  )
}
