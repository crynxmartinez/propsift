'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BucketSelector, 
  NextUpCard, 
  QueueList, 
  CallResultModal,
  type BucketCounts,
  type NextUpData,
  type QueueRecord
} from '@/components/dockinsight'
import { toast } from 'sonner'

interface CallResultOption {
  id: string
  name: string
  color: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nextUpData, setNextUpData] = useState<NextUpData | null>(null)
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [queueHasMore, setQueueHasMore] = useState(false)
  const [bucketCounts, setBucketCounts] = useState<BucketCounts>({
    callNow: 0,
    followUpToday: 0,
    callQueue: 0,
    verifyFirst: 0,
    getNumbers: 0,
    nurture: 0,
  })
  const [activeBucket, setActiveBucket] = useState('call-now')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callingPhone, setCallingPhone] = useState<{ id: string; number: string } | null>(null)
  const [calledRecordId, setCalledRecordId] = useState<string | null>(null)
  const [callResultId, setCallResultId] = useState<string | null>(null)
  const [callResultOptions, setCallResultOptions] = useState<CallResultOption[]>([])
  const [sessionStats, setSessionStats] = useState({ calls: 0, skipped: 0, snoozed: 0 })

  const getToken = useCallback(() => localStorage.getItem('token'), [])

  const fetchNextUp = useCallback(async (bucket?: string) => {
    const token = getToken()
    if (!token) return

    try {
      const url = bucket ? `/api/dockinsight/next-up?bucket=${bucket}` : '/api/dockinsight/next-up'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNextUpData(data.record ? data : null)
        if (data.bucketCounts) {
          setBucketCounts(data.bucketCounts)
        }
      }
    } catch (error) {
      console.error('Error fetching next-up:', error)
    }
  }, [getToken])

  const fetchQueue = useCallback(async (bucket?: string) => {
    const token = getToken()
    if (!token) return

    try {
      const url = bucket ? `/api/dockinsight/queue?bucket=${bucket}` : '/api/dockinsight/queue'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setQueueRecords(data.records || [])
        setQueueTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }, [getToken])

  const fetchCallResults = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/call-results', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCallResultOptions(data.map((r: { id: string; name: string; color: string }) => ({
          id: r.id,
          name: r.name,
          color: r.color || '#6b7280',
        })))
      }
    } catch (error) {
      console.error('Error fetching call results:', error)
    }
  }, [getToken])

  const fetchAll = useCallback(async (bucket?: string) => {
    setIsRefreshing(true)
    await Promise.all([fetchNextUp(bucket), fetchQueue(bucket), fetchCallResults()])
    setIsRefreshing(false)
  }, [fetchNextUp, fetchQueue, fetchCallResults])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    setLoading(true)
    fetchAll(activeBucket).finally(() => setLoading(false))
  }, [router, fetchAll, activeBucket])

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
        await fetchAll(activeBucket)
        return true
      }
    } catch (error) {
      console.error('Error logging action:', error)
    }
    return false
  }

  const handleBucketClick = (bucket: string) => {
    setActiveBucket(bucket)
    fetchAll(bucket)
  }

  const handleCall = (recordId: string, phoneNumber: string, phoneId: string) => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`, '_self')
    
    // Track the called record for post-call panel
    setCalledRecordId(recordId)
    setCallingPhone({ id: phoneId, number: phoneNumber })
    setCallResultId(null)
    setSessionStats(prev => ({ ...prev, calls: prev.calls + 1 }))
  }

  const handleCallResultChange = (resultId: string) => {
    setCallResultId(resultId)
    if (nextUpData?.record && callingPhone) {
      // Log the call with the selected result
      logAction(nextUpData.record.id, 'call', {
        callResultId: resultId,
        phoneId: callingPhone.id,
      })
    }
  }

  const handleNext = async () => {
    setCalledRecordId(null)
    setCallingPhone(null)
    setCallResultId(null)
    await fetchAll(activeBucket)
  }

  const handleSkip = async (recordId: string) => {
    const success = await logAction(recordId, 'skip')
    if (success) {
      setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
      toast.success('Skipped to next lead')
    }
  }

  const handleSnooze = async (recordId: string) => {
    const success = await logAction(recordId, 'snooze', { days: 1 })
    if (success) {
      setSessionStats(prev => ({ ...prev, snoozed: prev.snoozed + 1 }))
      toast.success('Snoozed for 1 day')
    }
  }

  const handleComplete = async (recordId: string, taskId: string) => {
    const success = await logAction(recordId, 'complete-task', { taskId })
    if (success) {
      toast.success('Task completed')
    }
  }

  const handlePhoneStatus = async (recordId: string, phoneId: string, status: string) => {
    const success = await logAction(recordId, 'phone-status', { phoneId, status })
    if (success) {
      toast.success(`Phone marked as ${status}`)
    }
  }

  const handleRecordClick = (recordId: string) => {
    router.push(`/dashboard/records/${recordId}`)
  }

  const handleQueueCall = (recordId: string) => {
    // Find the record and call the first phone
    const record = queueRecords.find(r => r.id === recordId)
    if (record && record.phoneCount > 0) {
      // We need to fetch the phone details - for now just navigate to record
      router.push(`/dashboard/records/${recordId}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DockInsight</h1>
          <p className="text-sm text-muted-foreground">v3.0 • Powered by LCE</p>
        </div>
        <div className="flex items-center gap-3">
          {sessionStats.calls > 0 && (
            <Badge variant="secondary" className="text-sm">
              {sessionStats.calls} worked this session
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(activeBucket)}
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
      </div>

      {/* Bucket Selector */}
      <BucketSelector
        buckets={bucketCounts}
        activeBucket={activeBucket}
        onBucketClick={handleBucketClick}
      />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Next Up Card - Takes 2 columns */}
        <div className="lg:col-span-2">
          <NextUpCard
            data={nextUpData}
            isLoading={isRefreshing}
            onCall={handleCall}
            onSkip={handleSkip}
            onSnooze={handleSnooze}
            onComplete={handleComplete}
            onRecordClick={handleRecordClick}
            onPhoneStatus={handlePhoneStatus}
            activeBucket={activeBucket}
            workedThisSession={sessionStats.calls}
            calledRecordId={calledRecordId}
            callResultId={callResultId}
            callResultOptions={callResultOptions}
            onCallResultChange={handleCallResultChange}
            onNext={handleNext}
          />
        </div>

        {/* Queue List - Takes 1 column */}
        <div className="lg:col-span-1">
          <QueueList
            records={queueRecords}
            total={queueTotal}
            isLoading={isRefreshing}
            onRecordClick={handleRecordClick}
            onCall={handleQueueCall}
            hasMore={queueHasMore}
          />
        </div>
      </div>

      {/* Call Result Modal - for fallback */}
      <CallResultModal
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false)
          setCallingPhone(null)
        }}
        onSubmit={async (outcome: string, notes?: string, callbackTime?: Date) => {
          if (nextUpData?.record && callingPhone) {
            await logAction(nextUpData.record.id, 'call', {
              outcome,
              phoneId: callingPhone.id,
              notes,
              callbackTime: callbackTime?.toISOString(),
            })
          }
          setShowCallModal(false)
          setCallingPhone(null)
        }}
        phoneNumber={callingPhone?.number || ''}
      />
    </div>
  )
}
