'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LeadCard, QueueSection, CallResultModal } from '@/components/dockinsight'
import { toast } from 'sonner'

interface NextUpData {
  record: {
    id: string
    ownerFullName: string
    propertyStreet: string | null
    propertyCity: string | null
    propertyState: string | null
  }
  score: number
  temperatureBand: 'HOT' | 'WARM' | 'COLD' | 'ICE'
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  cadenceStep: number
  totalSteps: number
  nextActionType: string | null
  queueSection: string
  queueReason: string
  reasonString: string
  phones: Array<{ id: string; number: string; type: string }>
  motivations: string[]
  hasCallback: boolean
  totalInQueue: number
}

interface QueueData {
  sections: Record<string, {
    records: Array<{
      id: string
      ownerFullName: string
      propertyStreet: string | null
      propertyCity: string | null
      priorityScore: number
      temperatureBand: 'HOT' | 'WARM' | 'COLD' | 'ICE'
      queueReason: string
      phones: Array<{ id: string; number: string; type: string }>
    }>
    total: number
    hasMore: boolean
  }>
  sectionInfo: Record<string, { label: string; color: string; order: number }>
  totalRecords: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nextUpData, setNextUpData] = useState<NextUpData | null>(null)
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callingPhone, setCallingPhone] = useState<{ id: string; number: string } | null>(null)
  const [sessionStats, setSessionStats] = useState({ calls: 0, skipped: 0, snoozed: 0 })

  const getToken = useCallback(() => localStorage.getItem('token'), [])

  const fetchNextUp = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/lce/next-up', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNextUpData(data.record ? data : null)
      }
    } catch (error) {
      console.error('Error fetching next-up:', error)
    }
  }, [getToken])

  const fetchQueue = useCallback(async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch('/api/lce/queue', {
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

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([fetchNextUp(), fetchQueue()])
    setIsRefreshing(false)
  }, [fetchNextUp, fetchQueue])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    setLoading(true)
    fetchAll().finally(() => setLoading(false))
  }, [router, fetchAll])

  const logAction = async (recordId: string, action: string, data: Record<string, unknown> = {}) => {
    const token = getToken()
    if (!token) return false

    try {
      const res = await fetch('/api/lce/log-action', {
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

  const handleCall = (phoneId: string, phoneNumber: string) => {
    // Open phone dialer
    window.open(`tel:${phoneNumber}`, '_self')
    
    // Show call result modal
    setCallingPhone({ id: phoneId, number: phoneNumber })
    setShowCallModal(true)
  }

  const handleCallResult = async (outcome: string, notes?: string, callbackTime?: Date) => {
    if (!nextUpData?.record || !callingPhone) return

    const success = await logAction(nextUpData.record.id, 'call', {
      outcome,
      phoneId: callingPhone.id,
      notes,
      callbackTime: callbackTime?.toISOString(),
    })

    if (success) {
      setSessionStats(prev => ({ ...prev, calls: prev.calls + 1 }))
      toast.success('Call logged successfully')
    }

    setShowCallModal(false)
    setCallingPhone(null)
  }

  const handleSkip = async () => {
    if (!nextUpData?.record) return
    
    const success = await logAction(nextUpData.record.id, 'skip')
    if (success) {
      setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }))
      toast.success('Skipped to next lead')
    }
  }

  const handleSnooze = async () => {
    if (!nextUpData?.record) return
    
    const success = await logAction(nextUpData.record.id, 'snooze', { days: 1 })
    if (success) {
      setSessionStats(prev => ({ ...prev, snoozed: prev.snoozed + 1 }))
      toast.success('Snoozed for 1 day')
    }
  }

  const handlePause = async () => {
    if (!nextUpData?.record) return
    
    const success = await logAction(nextUpData.record.id, 'pause', { reason: 'Manual pause' })
    if (success) {
      toast.success('Record paused')
    }
  }

  const handleRecordClick = (recordId?: string) => {
    const id = recordId || nextUpData?.record?.id
    if (id) {
      router.push(`/dashboard/records/${id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const sortedSections = queueData?.sectionInfo 
    ? Object.entries(queueData.sectionInfo).sort((a, b) => a[1].order - b[1].order)
    : []

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
            <p className="text-sm text-muted-foreground">v3.0 • Powered by LCE</p>
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
      {nextUpData?.record ? (
        <LeadCard
          record={nextUpData.record}
          score={nextUpData.score}
          temperatureBand={nextUpData.temperatureBand}
          confidenceLevel={nextUpData.confidenceLevel}
          cadenceStep={nextUpData.cadenceStep}
          totalSteps={nextUpData.totalSteps}
          nextActionType={nextUpData.nextActionType}
          queueSection={nextUpData.queueSection}
          queueReason={nextUpData.queueReason}
          reasonString={nextUpData.reasonString}
          phones={nextUpData.phones}
          motivations={nextUpData.motivations}
          hasCallback={nextUpData.hasCallback}
          onCall={handleCall}
          onSkip={handleSkip}
          onSnooze={handleSnooze}
          onPause={handlePause}
          onRecordClick={() => handleRecordClick()}
          isLoading={isRefreshing}
        />
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No leads in queue</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/dashboard/records')}
            >
              View All Records
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue Sections */}
        <div className="lg:col-span-2 space-y-4">
          {sortedSections.map(([key, info]) => {
            const sectionData = queueData?.sections[key]
            if (!sectionData || sectionData.total === 0) return null
            
            return (
              <QueueSection
                key={key}
                title={info.label}
                color={info.color}
                records={sectionData.records}
                total={sectionData.total}
                hasMore={sectionData.hasMore}
                isExpanded={key === 'OVERDUE' || key === 'DUE_TODAY'}
                onRecordClick={handleRecordClick}
              />
            )
          })}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          {/* Session Stats */}
          {(sessionStats.calls > 0 || sessionStats.skipped > 0 || sessionStats.snoozed > 0) && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                  This Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Calls Made</span>
                  <span className="font-bold text-green-700 dark:text-green-300">{sessionStats.calls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Skipped</span>
                  <span className="font-medium text-green-700 dark:text-green-300">{sessionStats.skipped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">Snoozed</span>
                  <span className="font-medium text-green-700 dark:text-green-300">{sessionStats.snoozed}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Queue Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedSections.map(([key, info]) => {
                const count = queueData?.sections[key]?.total || 0
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{info.label}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                )
              })}
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">{queueData?.totalRecords || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Result Modal */}
      <CallResultModal
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false)
          setCallingPhone(null)
        }}
        onSubmit={handleCallResult}
        phoneNumber={callingPhone?.number || ''}
      />
    </div>
  )
}
