'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BucketSelector, 
  NextUpCard, 
  QueueList, 
  RecordDrawer,
  type BucketCounts,
  type NextUpData,
  type QueueRecord
} from '@/components/dockinsight'
import { toast } from 'sonner'

interface QueueData {
  bucket: string
  total: number
  records: QueueRecord[]
  bucketCounts: {
    'call-now': number
    'follow-up-today': number
    'call-queue': number
    'verify-first': number
    'get-numbers': number
    'nurture': number
    'not-workable': number
  }
}

interface OverviewData {
  buckets: BucketCounts & { notWorkable: number }
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

interface DrawerData {
  record: {
    id: string
    ownerFullName: string
    ownerFirstName: string | null
    ownerLastName: string | null
    propertyStreet: string | null
    propertyCity: string | null
    propertyState: string | null
    propertyZip: string | null
    mailingStreet: string | null
    mailingCity: string | null
    mailingState: string | null
    mailingZip: string | null
    temperature: string | null
    callAttempts: number
    lastContactedAt: string | null
    lastContactType: string | null
    lastContactResult: string | null
    hasEngaged: boolean
    skiptraceDate: string | null
    createdAt: string
    updatedAt: string
  }
  score: number
  nextAction: string
  confidence: 'High' | 'Medium' | 'Low'
  reasons: Array<{ label: string; delta: number; category: string }>
  topReason: string
  reasonString: string
  suggestions: Array<{ action: string; delta: number }>
  flags: {
    hasValidPhone: boolean
    hasMobilePhone: boolean
    hasCallablePhone: boolean
    hasEmail: boolean
    hasTask: boolean
    hasOverdueTask: boolean
    isDnc: boolean
    isClosed: boolean
    isSnoozed: boolean
    neverContacted: boolean
    smartRescue: boolean
  }
  phones: Array<{ id: string; number: string; type: string; statuses: string[] }>
  motivations: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string }>
  pendingTask: { id: string; title: string; dueDate: string | null; status: string; priority: string } | null
}

interface SessionStats {
  callsMade: number
  skipped: number
  snoozed: number
  completed: number
}

interface CallResultOption {
  id: string
  name: string
  color: string
}

interface StatusOption {
  id: string
  name: string
  color: string
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
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    callsMade: 0,
    skipped: 0,
    snoozed: 0,
    completed: 0,
  })
  const [workedThisSession, setWorkedThisSession] = useState(0)
  
  // Post-call state: tracks when we just made a call and should show NEXT button
  const [calledRecordId, setCalledRecordId] = useState<string | null>(null)
  const [callResultId, setCallResultId] = useState<string | null>(null)
  const [callResultOptions, setCallResultOptions] = useState<CallResultOption[]>([])
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])

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

  const fetchCallResults = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/call-results', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCallResultOptions(data.filter((cr: CallResultOption & { isActive: boolean }) => cr.isActive))
      }
    } catch (error) {
      console.error('Error fetching call results:', error)
    }
  }, [getToken])

  const fetchStatuses = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/statuses', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStatusOptions(data.filter((s: StatusOption & { isActive: boolean }) => s.isActive))
      }
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }, [getToken])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    setLoading(true)
    Promise.all([fetchAll(), fetchCallResults(), fetchStatuses()]).finally(() => setLoading(false))
  }, [router, fetchAll, fetchCallResults, fetchStatuses])

  useEffect(() => {
    fetchQueue(activeBucket)
    fetchNextUp(activeBucket)
  }, [activeBucket, fetchQueue, fetchNextUp])

  const handleBucketClick = (bucket: string) => {
    setActiveBucket(bucket)
  }

  const logAction = async (recordId: string, action: string, data: Record<string, unknown> = {}) => {
    const token = getToken()
    if (!token) return false

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

  const handleCall = async (recordId: string, phoneNumber: string, phoneId?: string) => {
    // Show modern toast with countdown before opening dialer
    const formattedPhone = phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    let countdown = 5
    
    const toastId = toast.loading(
      <div className="flex flex-col gap-1">
        <div className="font-medium">📞 Opening dialer...</div>
        <div className="text-sm text-muted-foreground">Calling {formattedPhone}</div>
        <div className="text-xs text-muted-foreground">Auto-dialing in {countdown}s • Click to dial now</div>
      </div>,
      { duration: 6000 }
    )

    const openDialer = () => {
      clearInterval(countdownInterval)
      toast.dismiss(toastId)
      window.open(`tel:${phoneNumber}`, '_self')
    }

    // Auto-dial after 5 seconds
    const countdownInterval = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        openDialer()
      } else {
        toast.loading(
          <div className="flex flex-col gap-1 cursor-pointer" onClick={openDialer}>
            <div className="font-medium">📞 Opening dialer...</div>
            <div className="text-sm text-muted-foreground">Calling {formattedPhone}</div>
            <div className="text-xs text-muted-foreground">Auto-dialing in {countdown}s • Click to dial now</div>
          </div>,
          { id: toastId, duration: 6000 }
        )
      }
    }, 1000)
    
    // Log the call but DON'T fetch next record - stay on current record
    const token = getToken()
    if (!token) return
    
    try {
      const res = await fetch('/api/dockinsight/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, action: 'call', result: 'no_answer', phoneId }),
      })
      
      if (res.ok) {
        setSessionStats(prev => ({ ...prev, callsMade: prev.callsMade + 1 }))
        setWorkedThisSession(prev => prev + 1)
        // Set called state to show post-call panel with NEXT button
        setCalledRecordId(recordId)
        setCallResultId(null)
        toast.success('Call logged - update result and click NEXT when ready')
      }
    } catch (error) {
      console.error('Error logging call:', error)
    }
  }
  
  // Handle moving to next record after post-call actions
  const handleNext = async () => {
    if (calledRecordId && callResultId) {
      // Update the record's callResultId
      const token = getToken()
      if (token) {
        try {
          await fetch(`/api/records/${calledRecordId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ callResultId }),
          })
        } catch (error) {
          console.error('Error updating call result:', error)
        }
      }
    }
    
    // Clear called state and fetch next record
    setCalledRecordId(null)
    setCallResultId(null)
    await fetchAll()
    toast.success('Moving to next lead')
  }
  
  // Handle updating call result (for post-call panel)
  const handleCallResultChange = (resultId: string) => {
    setCallResultId(resultId)
  }

  // Handle status change from dropdown
  const handleStatusChange = async (recordId: string, statusId: string) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statusId }),
      })
      
      if (res.ok) {
        toast.success('Status updated')
        await fetchNextUp(activeBucket)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  // Handle logging call result from dropdown
  const handleLogCallResult = async (recordId: string, resultId: string) => {
    const token = getToken()
    if (!token) return

    try {
      // Log the call result
      const res = await fetch('/api/dockinsight/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, action: 'call', callResultId: resultId }),
      })
      
      if (res.ok) {
        toast.success('Call result logged')
        await fetchNextUp(activeBucket)
      }
    } catch (error) {
      console.error('Error logging call result:', error)
      toast.error('Failed to log call result')
    }
  }

  const handlePhoneStatus = async (recordId: string, phoneId: string, status: string) => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/records/${recordId}/phones/${phoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }), // Send single status to toggle
      })
      
      if (res.ok) {
        toast.success(`Phone status updated`)
        // Refresh to get updated phone statuses
        await fetchNextUp()
      }
    } catch (error) {
      console.error('Error updating phone status:', error)
      toast.error('Failed to update phone status')
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

  const handleSnooze = async (recordId: string, duration: string) => {
    // Convert duration to minutes
    const durationMap: Record<string, number> = {
      '1h': 60,
      'tomorrow': 1440, // 24 hours
      '3d': 4320, // 3 days
      '1w': 10080, // 7 days
    }
    const snoozeDuration = durationMap[duration] || 60
    const success = await logAction(recordId, 'snooze', { snoozeDuration })
    if (success) {
      setSessionStats(prev => ({ ...prev, snoozed: prev.snoozed + 1 }))
      setWorkedThisSession(prev => prev + 1)
      const durationLabel = duration === '1h' ? '1 hour' : duration === 'tomorrow' ? 'tomorrow' : duration === '3d' ? '3 days' : '1 week'
      toast.success(`Snoozed for ${durationLabel}`)
    }
  }

  const handlePause = async (recordId: string) => {
    const success = await logAction(recordId, 'pause', { reason: 'Manual pause' })
    if (success) {
      toast.success('Cadence paused')
      await fetchAll()
    }
  }

  const handleResume = async (recordId: string) => {
    const success = await logAction(recordId, 'resume')
    if (success) {
      toast.success('Cadence resumed')
      await fetchAll()
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
      if (selectedRecordId === recordId && drawerData) {
        setDrawerData({
          ...drawerData,
          record: { ...drawerData.record, temperature },
        })
      }
    }
  }

  const handleRecordClick = async (recordId: string) => {
    setSelectedRecordId(recordId)
    setDrawerLoading(true)
    
    if (nextUpData?.record?.id === recordId) {
      setDrawerData({
        record: {
          ...nextUpData.record,
          mailingStreet: null,
          mailingCity: null,
          mailingState: null,
          mailingZip: null,
          lastContactType: null,
          lastContactResult: null,
          skiptraceDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        score: nextUpData.score,
        nextAction: nextUpData.nextAction,
        confidence: nextUpData.confidence,
        reasons: nextUpData.reasons,
        topReason: nextUpData.topReason,
        reasonString: nextUpData.reasonString,
        suggestions: nextUpData.suggestions,
        flags: nextUpData.flags,
        phones: nextUpData.phones,
        motivations: nextUpData.motivations,
        tags: [],
        pendingTask: nextUpData.pendingTask,
      })
      setDrawerLoading(false)
      return
    }
    
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
        setDrawerData(data)
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

  const handleQueueCall = (recordId: string) => {
    handleRecordClick(recordId)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (selectedRecordId && e.key === 'Escape') {
        handleDrawerClose()
        return
      }

      if (!nextUpData?.record) return

      const recordId = nextUpData.record.id
      const primaryPhone = nextUpData.phones.find(p => {
        const type = p.type?.toUpperCase() || ''
        return type === 'MOBILE' || type === 'CELL'
      }) || nextUpData.phones[0]

      switch (e.key.toLowerCase()) {
        case 'c':
          if (primaryPhone) {
            e.preventDefault()
            handleCall(recordId, primaryPhone.number)
          }
          break
        case 'n':
        case 'arrowright':
          e.preventDefault()
          handleSkip(recordId)
          break
        case 's':
          e.preventDefault()
          handleSnooze(recordId, '1h') // Default to 1 hour for keyboard shortcut
          break
        case 't':
          if (nextUpData.pendingTask) {
            e.preventDefault()
            handleComplete(recordId, nextUpData.pendingTask.id)
          }
          break
        case '1':
          e.preventDefault()
          handleTemperatureChange(recordId, 'HOT')
          break
        case '2':
          e.preventDefault()
          handleTemperatureChange(recordId, 'WARM')
          break
        case '3':
          e.preventDefault()
          handleTemperatureChange(recordId, 'COLD')
          break
        case 'enter':
          e.preventDefault()
          handleRecordClick(recordId)
          break
        case 'r':
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

  const getBucketCounts = (): BucketCounts => {
    if (overviewData?.buckets) {
      return {
        callNow: overviewData.buckets.callNow,
        followUpToday: overviewData.buckets.followUpToday,
        callQueue: overviewData.buckets.callQueue,
        verifyFirst: overviewData.buckets.verifyFirst,
        getNumbers: overviewData.buckets.getNumbers,
        nurture: overviewData.buckets.nurture,
        notWorkable: overviewData.buckets.notWorkable,
      }
    }
    if (queueData?.bucketCounts) {
      return {
        callNow: queueData.bucketCounts['call-now'] || 0,
        followUpToday: queueData.bucketCounts['follow-up-today'] || 0,
        callQueue: queueData.bucketCounts['call-queue'] || 0,
        verifyFirst: queueData.bucketCounts['verify-first'] || 0,
        getNumbers: queueData.bucketCounts['get-numbers'] || 0,
        nurture: queueData.bucketCounts['nurture'] || 0,
        notWorkable: queueData.bucketCounts['not-workable'] || 0,
      }
    }
    return {
      callNow: 0,
      followUpToday: 0,
      callQueue: 0,
      verifyFirst: 0,
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
            <p className="text-sm text-muted-foreground">v4.0 • Your command center</p>
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
        onPause={handlePause}
        onResume={handleResume}
        onComplete={handleComplete}
        onRecordClick={handleRecordClick}
        onPhoneStatus={handlePhoneStatus}
        activeBucket={activeBucket}
        workedThisSession={workedThisSession}
        calledRecordId={calledRecordId}
        callResultId={callResultId}
        callResultOptions={callResultOptions}
        onCallResultChange={handleCallResultChange}
        onNext={handleNext}
        statusOptions={statusOptions}
        onStatusChange={handleStatusChange}
        onLogCallResult={handleLogCallResult}
      />

      {/* Bucket Selector */}
      <BucketSelector
        buckets={bucketCounts}
        activeBucket={activeBucket}
        onBucketClick={handleBucketClick}
      />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue */}
        <div className="lg:col-span-2">
          <QueueList
            records={queueData?.records || []}
            total={queueData?.total || 0}
            isLoading={isRefreshing && !queueData}
            onRecordClick={handleRecordClick}
            onCall={handleQueueCall}
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
              <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-red-400 dark:bg-red-600 h-full transition-all" 
                  style={{ flex: overviewData?.temperature.hot || 1 }} 
                />
                <div 
                  className="bg-orange-400 dark:bg-orange-600 h-full transition-all" 
                  style={{ flex: overviewData?.temperature.warm || 1 }} 
                />
                <div 
                  className="bg-blue-400 dark:bg-blue-600 h-full transition-all" 
                  style={{ flex: overviewData?.temperature.cold || 1 }} 
                />
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
                <span className="text-muted-foreground">Call Ready</span>
                <span className="font-medium text-green-600">{overviewData?.kpis.callReady || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks Due Today</span>
                <span className="font-medium text-orange-600">{overviewData?.kpis.tasksDue || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Drawer */}
      <RecordDrawer
        isOpen={selectedRecordId !== null}
        onClose={handleDrawerClose}
        record={drawerData?.record || null}
        score={drawerData?.score || 0}
        nextAction={drawerData?.nextAction || ''}
        confidence={drawerData?.confidence || 'Low'}
        reasons={drawerData?.reasons || []}
        reasonString={drawerData?.reasonString || ''}
        suggestions={drawerData?.suggestions || []}
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
