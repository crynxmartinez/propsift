'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NextUpCard, ActionQueue, TodaysPlan, RecordDrawer } from '@/components/dockinsight'
import { toast } from 'sonner'

interface NextUpData {
  record: {
    id: string
    ownerFullName: string
    ownerFirstName: string | null
    ownerLastName: string | null
    propertyStreet: string | null
    propertyCity: string | null
    propertyState: string | null
    propertyZip: string | null
    temperature: string | null
    callAttempts: number
    lastContactedAt: string | null
    hasEngaged: boolean
  } | null
  score: number
  nextAction: string
  confidence: 'High' | 'Medium' | 'Low'
  reasons: Array<{ label: string; delta: number; category: string }>
  topReason: string
  flags: {
    hasValidPhone: boolean
    hasMobilePhone: boolean
    hasCallablePhone: boolean
    hasTask: boolean
    hasOverdueTask: boolean
    isDnc: boolean
    isClosed: boolean
    isSnoozed: boolean
    neverContacted: boolean
  }
  phones: Array<{ id: string; number: string; type: string; statuses: string[] }>
  motivations: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string }>
  pendingTask: { id: string; title: string; dueDate: string | null; status: string; priority: string } | null
  queuePosition: number
  totalInQueue: number
  suggestions?: Array<{ action: string; delta: number }>
  message?: string
}

interface QueueData {
  bucket: string
  total: number
  records: Array<{
    id: string
    ownerFullName: string
    propertyStreet: string | null
    propertyCity: string | null
    propertyState: string | null
    temperature: string | null
    score: number
    nextAction: string
    topReason: string
    phoneCount: number
    hasMobile: boolean
    motivationCount: number
    topMotivation: string | null
    hasOverdueTask: boolean
    queuePosition: number
  }>
  bucketCounts: {
    'call-now': number
    'follow-up': number
    'get-numbers': number
    'nurture': number
    'not-workable': number
  }
}

interface OverviewData {
  buckets: {
    callNow: number
    followUp: number
    getNumbers: number
    nurture: number
    notWorkable: number
  }
  kpis: {
    totalRecords: number
    hotLeads: number
    callReady: number
    tasksDue: number
    unassignedHot: number
  }
  today: {
    callsMade: number
    contacts: number
    appointments: number
    tasksCompleted: number
  }
  temperature: {
    hot: number
    warm: number
    cold: number
  }
}

interface SessionStats {
  callsMade: number
  skipped: number
  snoozed: number
  completed: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nextUpData, setNextUpData] = useState<NextUpData | null>(null)
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [activeBucket, setActiveBucket] = useState('call-now')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<NextUpData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    callsMade: 0,
    skipped: 0,
    snoozed: 0,
    completed: 0,
  })
  const [workedThisSession, setWorkedThisSession] = useState(0)

  const getToken = useCallback(() => {
    return localStorage.getItem('token')
  }, [])

  const fetchNextUp = useCallback(async (bucket?: string) => {
    const token = getToken()
    if (!token) return

    try {
      const url = bucket 
        ? `/api/dockinsight/next-up?bucket=${bucket}`
        : '/api/dockinsight/next-up'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNextUpData(data)
      }
    } catch (error) {
      console.error('Error fetching next-up:', error)
    }
  }, [getToken])

  const fetchQueue = useCallback(async (bucket: string) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/dockinsight/queue?bucket=${bucket}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setQueueData(data)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }, [getToken])

  const fetchOverview = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/dockinsight/overview', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOverviewData(data)
      }
    } catch (error) {
      console.error('Error fetching overview:', error)
    }
  }, [getToken])

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchNextUp(activeBucket),
      fetchQueue(activeBucket),
      fetchOverview(),
    ])
    setIsRefreshing(false)
  }, [fetchNextUp, fetchQueue, fetchOverview, activeBucket])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    setLoading(true)
    fetchAll().finally(() => setLoading(false))
  }, [router, fetchAll])

  useEffect(() => {
    fetchQueue(activeBucket)
    fetchNextUp(activeBucket)
  }, [activeBucket, fetchQueue, fetchNextUp])

  const handleBucketClick = (bucket: string) => {
    setActiveBucket(bucket)
  }

  const logAction = async (recordId: string, action: string, data: Record<string, unknown> = {}) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/dockinsight/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, action, ...data }),
      })
      
      if (res.ok) {
        await fetchAll()
        return true
      }
    } catch (error) {
      console.error('Error logging action:', error)
    }
    return false
  }

  const handleCall = async (recordId: string, phoneNumber: string) => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`, '_self')
    
    // Log the call
    const success = await logAction(recordId, 'call', { result: 'no_answer' })
    if (success) {
      setSessionStats(prev => ({ ...prev, callsMade: prev.callsMade + 1 }))
      setWorkedThisSession(prev => prev + 1)
      toast.success('Call logged')
    }
  }

  const handleSkip = async (recordId: string) => {
    const success = await logAction(recordId, 'skip')
    if (success) {
      setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
      setWorkedThisSession(prev => prev + 1)
      toast.success('Skipped to next lead')
    }
  }

  const handleSnooze = async (recordId: string) => {
    const success = await logAction(recordId, 'snooze', { snoozeDuration: 60 })
    if (success) {
      setSessionStats(prev => ({ ...prev, snoozed: prev.snoozed + 1 }))
      setWorkedThisSession(prev => prev + 1)
      toast.success('Snoozed for 1 hour')
    }
  }

  const handleComplete = async (recordId: string, taskId: string) => {
    const success = await logAction(recordId, 'complete', { taskId })
    if (success) {
      setSessionStats(prev => ({ ...prev, completed: prev.completed + 1 }))
      toast.success('Task completed')
    }
  }

  const handleTemperatureChange = async (recordId: string, temperature: 'HOT' | 'WARM' | 'COLD') => {
    const success = await logAction(recordId, 'temperature', { newTemperature: temperature })
    if (success) {
      toast.success(`Temperature changed to ${temperature}`)
      // Refresh drawer data if open
      if (selectedRecordId === recordId && drawerData) {
        setDrawerData({
          ...drawerData,
          record: drawerData.record ? { ...drawerData.record, temperature } : null,
        })
      }
    }
  }

  const handleRecordClick = async (recordId: string) => {
    setSelectedRecordId(recordId)
    setDrawerLoading(true)
    
    // If it's the next-up record, use that data
    if (nextUpData?.record?.id === recordId) {
      setDrawerData(nextUpData)
      setDrawerLoading(false)
      return
    }
    
    // Otherwise, fetch full record details from API
    const token = getToken()
    if (!token) {
      setDrawerLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/dockinsight/record/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      
      if (res.ok) {
        const data = await res.json()
        setDrawerData({
          ...data,
          queuePosition: queueData?.records.find(r => r.id === recordId)?.queuePosition || 1,
          totalInQueue: queueData?.total || 0,
        })
      } else {
        // Fallback to queue data if API fails
        const queueRecord = queueData?.records.find(r => r.id === recordId)
        if (queueRecord) {
          setDrawerData({
            record: {
              id: queueRecord.id,
              ownerFullName: queueRecord.ownerFullName,
              ownerFirstName: null,
              ownerLastName: null,
              propertyStreet: queueRecord.propertyStreet,
              propertyCity: queueRecord.propertyCity,
              propertyState: queueRecord.propertyState,
              propertyZip: null,
              temperature: queueRecord.temperature,
              callAttempts: 0,
              lastContactedAt: null,
              hasEngaged: false,
            },
            score: queueRecord.score,
            nextAction: queueRecord.nextAction,
            confidence: 'Medium',
            reasons: [{ label: queueRecord.topReason, delta: 0, category: 'data' }],
            topReason: queueRecord.topReason,
            flags: {
              hasValidPhone: queueRecord.phoneCount > 0,
              hasMobilePhone: queueRecord.hasMobile,
              hasCallablePhone: queueRecord.phoneCount > 0,
              hasTask: false,
              hasOverdueTask: queueRecord.hasOverdueTask,
              isDnc: false,
              isClosed: false,
              isSnoozed: false,
              neverContacted: false,
            },
            phones: [],
            motivations: queueRecord.topMotivation ? [{ id: '1', name: queueRecord.topMotivation }] : [],
            tags: [],
            pendingTask: null,
            queuePosition: queueRecord.queuePosition,
            totalInQueue: queueData?.total || 0,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching record details:', error)
    } finally {
      setDrawerLoading(false)
    }
  }

  const handleDrawerClose = () => {
    setSelectedRecordId(null)
    setDrawerData(null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // If drawer is open, Escape closes it
      if (selectedRecordId && e.key === 'Escape') {
        handleDrawerClose()
        return
      }

      // Shortcuts only work when we have a next-up record
      if (!nextUpData?.record) return

      const recordId = nextUpData.record.id
      const primaryPhone = nextUpData.phones.find(p => p.type?.toUpperCase() === 'MOBILE') || nextUpData.phones[0]

      switch (e.key.toLowerCase()) {
        case 'c':
          // Call
          if (primaryPhone) {
            e.preventDefault()
            handleCall(recordId, primaryPhone.number)
          }
          break
        case 'n':
        case 'arrowright':
          // Skip to next
          e.preventDefault()
          handleSkip(recordId)
          break
        case 's':
          // Snooze
          e.preventDefault()
          handleSnooze(recordId)
          break
        case 't':
          // Complete task
          if (nextUpData.pendingTask) {
            e.preventDefault()
            handleComplete(recordId, nextUpData.pendingTask.id)
          }
          break
        case '1':
          // Mark as Hot
          e.preventDefault()
          handleTemperatureChange(recordId, 'HOT')
          break
        case '2':
          // Mark as Warm
          e.preventDefault()
          handleTemperatureChange(recordId, 'WARM')
          break
        case '3':
          // Mark as Cold
          e.preventDefault()
          handleTemperatureChange(recordId, 'COLD')
          break
        case 'enter':
          // Open record drawer
          e.preventDefault()
          handleRecordClick(recordId)
          break
        case 'r':
          // Refresh
          e.preventDefault()
          fetchAll()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextUpData, selectedRecordId, fetchAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Normalize bucket counts from different sources
  const getBucketCounts = () => {
    if (overviewData?.buckets) {
      return overviewData.buckets
    }
    if (queueData?.bucketCounts) {
      return {
        callNow: queueData.bucketCounts['call-now'] || 0,
        followUp: queueData.bucketCounts['follow-up'] || 0,
        getNumbers: queueData.bucketCounts['get-numbers'] || 0,
        nurture: queueData.bucketCounts['nurture'] || 0,
        notWorkable: queueData.bucketCounts['not-workable'] || 0,
      }
    }
    return {
      callNow: 0,
      followUp: 0,
      getNumbers: 0,
      nurture: 0,
      notWorkable: 0,
    }
  }

  const bucketCounts = getBucketCounts()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">DockInsight</h1>
            <p className="text-sm text-muted-foreground">Your command center</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAll}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Next Up Card */}
      <NextUpCard
        data={nextUpData}
        isLoading={isRefreshing && !nextUpData}
        onCall={handleCall}
        onSkip={handleSkip}
        onSnooze={handleSnooze}
        onComplete={handleComplete}
        onRecordClick={handleRecordClick}
        activeBucket={activeBucket}
        workedThisSession={workedThisSession}
      />

      {/* Today's Plan Buckets */}
      <TodaysPlan
        buckets={{
          callNow: bucketCounts.callNow,
          followUpToday: bucketCounts.followUp || 0,
          callQueue: 0,
          verifyFirst: 0,
          getNumbers: bucketCounts.getNumbers,
          nurture: bucketCounts.nurture,
        }}
        activeBucket={activeBucket}
        onBucketClick={handleBucketClick}
      />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue */}
        <div className="lg:col-span-2">
          <ActionQueue
            records={queueData?.records || []}
            total={queueData?.total || 0}
            isLoading={isRefreshing && !queueData}
            onRecordClick={handleRecordClick}
            onCall={(recordId) => {
              const record = queueData?.records.find(r => r.id === recordId)
              if (record && record.phoneCount > 0) {
                handleRecordClick(recordId)
              }
            }}
          />
        </div>

        {/* Stats */}
        <div className="space-y-4">
          {/* Session Stats */}
          {workedThisSession > 0 && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">This Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Calls Made</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{sessionStats.callsMade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Skipped</span>
                  <span className="font-medium text-green-700 dark:text-green-300">{sessionStats.skipped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Snoozed</span>
                  <span className="font-medium text-green-700 dark:text-green-300">{sessionStats.snoozed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Tasks Done</span>
                  <span className="font-medium text-green-700 dark:text-green-300">{sessionStats.completed}</span>
                </div>
                <div className="pt-2 border-t border-green-200 dark:border-green-800">
                  <div className="flex justify-between">
                    <span className="font-medium text-green-700 dark:text-green-300">Total Worked</span>
                    <span className="font-bold text-green-800 dark:text-green-200">{workedThisSession}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calls Made</span>
                <span className="font-medium text-foreground">{(overviewData?.today.callsMade || 0) + sessionStats.callsMade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contacts</span>
                <span className="font-medium text-foreground">{overviewData?.today.contacts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks Completed</span>
                <span className="font-medium text-foreground">{(overviewData?.today.tasksCompleted || 0) + sessionStats.completed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-l-full h-4" style={{ width: `${(overviewData?.temperature.hot || 0) / (overviewData?.kpis.totalRecords || 1) * 100}%` }} />
                <div className="flex-1 bg-orange-100 dark:bg-orange-900/30 h-4" style={{ width: `${(overviewData?.temperature.warm || 0) / (overviewData?.kpis.totalRecords || 1) * 100}%` }} />
                <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-r-full h-4" style={{ width: `${(overviewData?.temperature.cold || 0) / (overviewData?.kpis.totalRecords || 1) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>🔥 {overviewData?.temperature.hot || 0}</span>
                <span>🌡️ {overviewData?.temperature.warm || 0}</span>
                <span>❄️ {overviewData?.temperature.cold || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Records</span>
                <span className="font-medium text-foreground">{overviewData?.kpis.totalRecords || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hot Leads</span>
                <span className="font-medium text-red-600">{overviewData?.kpis.hotLeads || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks Due Today</span>
                <span className="font-medium text-orange-600">{overviewData?.kpis.tasksDue || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unassigned Hot</span>
                <span className="font-medium text-purple-600">{overviewData?.kpis.unassignedHot || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Drawer */}
      <RecordDrawer
        isOpen={selectedRecordId !== null}
        onClose={handleDrawerClose}
        record={drawerData?.record ? {
          ...drawerData.record,
          mailingStreet: null,
          mailingCity: null,
          mailingState: null,
          mailingZip: null,
          lastContactType: null,
          lastContactResult: null,
          skiptraceDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } : null}
        score={drawerData?.score || 0}
        nextAction={drawerData?.nextAction || ''}
        confidence={drawerData?.confidence || 'Low'}
        reasons={drawerData?.reasons || []}
        phones={drawerData?.phones || []}
        motivations={drawerData?.motivations || []}
        tags={drawerData?.tags || []}
        tasks={drawerData?.pendingTask ? [drawerData.pendingTask] : []}
        onCall={handleCall}
        onTemperatureChange={handleTemperatureChange}
        onTaskComplete={handleComplete}
        isLoading={drawerLoading}
      />
    </div>
  )
}
