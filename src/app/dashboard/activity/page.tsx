'use client'

import { useState, useEffect } from 'react'
import { Activity, Upload, Download, RefreshCw, FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ActivityLog {
  id: string
  type: string
  action: string
  filename: string | null
  description: string | null
  total: number
  processed: number
  status: string
  metadata: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

type TabType = 'actions' | 'upload' | 'download'

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('actions')
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const typeFilter = activeTab === 'actions' ? 'action' : activeTab
      const res = await fetch(`/api/activity?type=${typeFilter}&page=${page}&limit=20`)
      if (!res.ok) throw new Error('Failed to fetch activities')
      const data = await res.json()
      setActivities(data.activities)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [activeTab, page])

  // Auto-refresh for pending/processing items
  useEffect(() => {
    const hasPending = activities.some(a => a.status === 'pending' || a.status === 'processing')
    if (hasPending) {
      const interval = setInterval(fetchActivities, 5000)
      return () => clearInterval(interval)
    }
  }, [activities])

  // Handle download from activity
  const handleDownload = async (activityId: string, filename: string | null) => {
    try {
      const res = await fetch(`/api/activity/${activityId}/download`)
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'Download failed')
        return
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'export.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }) + ' - ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Complete
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const getProgressBar = (processed: number, total: number) => {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'bulk_import':
        return 'Bulk Import'
      case 'export':
        return 'Export Records'
      case 'owner_vacancy_check':
        return 'Owner Vacancy Check'
      case 'property_vacancy_check':
        return 'Property Vacancy Check'
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getImportTypeLabel = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return ''
    const importType = metadata.importType as string
    const importOption = metadata.importOption as string
    
    if (importType === 'add') {
      return importOption === 'new_motivation' 
        ? 'Add new properties' 
        : 'Add new properties'
    } else {
      return importOption === 'property_address'
        ? 'Update by property address'
        : 'Update by mailing address'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <button
          onClick={fetchActivities}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => { setActiveTab('actions'); setPage(1) }}
            className={`flex items-center gap-2 pb-3 border-b-2 transition ${
              activeTab === 'actions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Actions
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setPage(1) }}
            className={`flex items-center gap-2 pb-3 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={() => { setActiveTab('download'); setPage(1) }}
            className={`flex items-center gap-2 pb-3 border-b-2 transition ${
              activeTab === 'download'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No activity found</p>
        </div>
      ) : (
        <>
          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Process</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{getActionLabel(activity.action)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{activity.total.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {activity.processed.toLocaleString()} ({activity.total > 0 ? Math.round((activity.processed / activity.total) * 100) : 0}%)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(activity.createdAt)}</td>
                      <td className="px-6 py-4 w-40">{getProgressBar(activity.processed, activity.total)}</td>
                      <td className="px-6 py-4">{getStatusBadge(activity.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breakdown</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-blue-600">{activity.filename || 'Unknown file'}</td>
                      <td className="px-6 py-4">
                        <button className="text-sm text-blue-600 hover:text-blue-800">See Breakdown</button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{getImportTypeLabel(activity.metadata)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {activity.processed.toLocaleString()} ({activity.total > 0 ? Math.round((activity.processed / activity.total) * 100) : 0}%)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(activity.createdAt).split(' - ')[0]}</td>
                      <td className="px-6 py-4">{getStatusBadge(activity.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Download Tab */}
          {activeTab === 'download' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-blue-600">{activity.filename || 'Export'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{activity.total.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {activity.processed.toLocaleString()} ({activity.total > 0 ? Math.round((activity.processed / activity.total) * 100) : 0}%)
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(activity.createdAt)}</td>
                      <td className="px-6 py-4 w-40">{getProgressBar(activity.processed, activity.total)}</td>
                      <td className="px-6 py-4">{getStatusBadge(activity.status)}</td>
                      <td className="px-6 py-4">
                        {activity.status === 'completed' && (
                          <button 
                            onClick={() => handleDownload(activity.id, activity.filename)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
