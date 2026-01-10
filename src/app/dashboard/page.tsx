'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Loader2, RefreshCw, Phone, Clock, Calendar, CheckSquare, 
  Inbox, AlertCircle, Flame, TrendingUp, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadCard, QueueList, CallResultModal } from '@/components/dockinsight'
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

interface QueueRecord {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  priorityScore: number
  temperatureBand: 'HOT' | 'WARM' | 'COLD' | 'ICE'
  queueReason: string
  phones: Array<{ id: string; number: string; type: string }>
}

interface QueueData {
  sections: Record<string, {
    records: QueueRecord[]
    total: number
    hasMore: boolean
  }>
  sectionInfo: Record<string, { label: string; color: string; order: number }>
  totalRecords: number
}

const QUEUE_TABS = [
  { key: 'OVERDUE', label: 'Now', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500' },
  { key: 'DUE_TODAY', label: 'Today', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500' },
  { key: 'CALLBACKS', label: 'Callbacks', icon: Phone, color: 'text-green-500', bg: 'bg-green-500' },
  { key: 'SCHEDULED', label: 'Scheduled', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500' },
  { key: 'TASKS_DUE', label: 'Tasks', icon: CheckSquare, color: 'text-purple-500', bg: 'bg-purple-500' },
  { key: 'FRESH_LEADS', label: 'New', icon: Inbox, color: 'text-cyan-500', bg: 'bg-cyan-500' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nextUpData, setNextUpData] = useState<NextUpData | null>(null)
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callingPhone, setCallingPhone] = useState<{ id: string; number: string } | null>(null)
  const [sessionStats, setSessionStats] = useState({ calls: 0, skipped: 0, snoozed: 0 })
  const [activeTab, setActiveTab] = useState('OVERDUE')

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

  // Get records for active tab
  const activeRecords = useMemo(() => {
    if (!queueData?.sections) return []
    const section = queueData.sections[activeTab]
    return section?.records || []
  }, [queueData, activeTab])

  // Find first tab with records
  useEffect(() => {
    if (queueData?.sections) {
      const firstWithRecords = QUEUE_TABS.find(tab => 
        (queueData.sections[tab.key]?.total || 0) > 0
      )
      if (firstWithRecords && (queueData.sections[activeTab]?.total || 0) === 0) {
        setActiveTab(firstWithRecords.key)
      }
    }
  }, [queueData, activeTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Loading Command Center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
                <p className="text-sm text-muted-foreground">DockInsight v3.0 • LCE Powered</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Session Stats Mini */}
              {sessionStats.calls > 0 && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">{sessionStats.calls} calls</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAll}
                disabled={isRefreshing}
                className="rounded-xl"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
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
            <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Queue Empty</h3>
              <p className="text-muted-foreground mb-4">No leads ready to call right now</p>
              <Button variant="outline" onClick={() => router.push('/dashboard/records')}>
                View All Records
              </Button>
            </div>
          )}

          {/* Queue Tabs */}
          <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
            {/* Tab Bar */}
            <div className="flex overflow-x-auto border-b bg-muted/30">
              {QUEUE_TABS.map((tab) => {
                const count = queueData?.sections[tab.key]?.total || 0
                const isActive = activeTab === tab.key
                const Icon = tab.icon
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                      isActive 
                        ? `${tab.color} border-current bg-background` 
                        : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isActive ? `${tab.bg} text-white` : 'bg-muted text-muted-foreground'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              <QueueList
                records={activeRecords}
                onRecordClick={handleRecordClick}
                emptyMessage={`No ${QUEUE_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} leads`}
              />
            </div>
          </div>

          {/* Stats Row */}
          {(sessionStats.calls > 0 || sessionStats.skipped > 0) && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{sessionStats.calls}</div>
                <div className="text-sm text-green-600/80">Calls Made</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{sessionStats.skipped}</div>
                <div className="text-sm text-orange-600/80">Skipped</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{sessionStats.snoozed}</div>
                <div className="text-sm text-blue-600/80">Snoozed</div>
              </div>
            </div>
          )}
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
