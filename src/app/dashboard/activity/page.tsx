'use client'

import { useState, useEffect } from 'react'
import { Activity, Upload, Download, RefreshCw, FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

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

  // Handle cancel processing activity
  const handleCancelUpload = async (activityId: string) => {
    try {
      const res = await fetch(`/api/activity/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'failed',
          errorMessage: 'Cancelled by user'
        }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      toast.success('Upload cancelled')
      fetchActivities()
    } catch (error) {
      console.error('Cancel error:', error)
      toast.error('Failed to cancel upload')
    }
  }

  // Handle download from activity
  const handleDownload = async (activityId: string, filename: string | null) => {
    try {
      const res = await fetch(`/api/activity/${activityId}/download`)
      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Download failed')
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
      toast.success('Download started!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download file')
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
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Complete
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="info" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  const getProgressBar = (processed: number, total: number) => {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0
    return <Progress value={percentage} className="h-2" />
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
        <h1 className="text-2xl font-bold">System</h1>
        <Button variant="ghost" onClick={fetchActivities}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabType); setPage(1) }}>
        <TabsList className="mb-6">
          <TabsTrigger value="actions" className="gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="download" className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No activity found</p>
          </div>
        ) : (
          <>
            <TabsContent value="actions">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.description || getActionLabel(activity.action)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(activity.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(activity.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Breakdown</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="text-primary">{activity.filename || 'Unknown file'}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="p-0 h-auto">See Breakdown</Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{getImportTypeLabel(activity.metadata)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {activity.processed.toLocaleString()} ({activity.total > 0 ? Math.round((activity.processed / activity.total) * 100) : 0}%)
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(activity.createdAt).split(' - ')[0]}</TableCell>
                          <TableCell>{getStatusBadge(activity.status)}</TableCell>
                          <TableCell>
                            {(activity.status === 'processing' || activity.status === 'pending') && (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleCancelUpload(activity.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="download">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-40">Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="text-primary">{activity.filename || 'Export'}</TableCell>
                          <TableCell className="text-muted-foreground">{activity.total.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {activity.processed.toLocaleString()} ({activity.total > 0 ? Math.round((activity.processed / activity.total) * 100) : 0}%)
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(activity.createdAt)}</TableCell>
                          <TableCell>{getProgressBar(activity.processed, activity.total)}</TableCell>
                          <TableCell>{getStatusBadge(activity.status)}</TableCell>
                          <TableCell>
                            {activity.status === 'completed' && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="p-0 h-auto"
                                onClick={() => handleDownload(activity.id, activity.filename)}
                              >
                                Download
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  )
}
