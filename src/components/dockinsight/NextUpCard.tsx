'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  SkipForward, 
  Clock, 
  CheckCircle,
  Flame,
  Thermometer,
  Snowflake,
  MapPin,
  User,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NextUpRecord {
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
}

interface Phone {
  id: string
  number: string
  type: string
  statuses: string[]
}

interface Motivation {
  id: string
  name: string
}

interface PendingTask {
  id: string
  title: string
  dueDate: string | null
  status: string
  priority: string
}

interface ScoreReason {
  label: string
  delta: number
  category: string
}

interface NextUpData {
  record: NextUpRecord | null
  score: number
  nextAction: string
  confidence: string
  reasons: ScoreReason[]
  topReason: string
  flags: {
    hasValidPhone: boolean
    hasMobilePhone: boolean
    hasTask: boolean
    hasOverdueTask: boolean
    isDnc: boolean
    isClosed: boolean
    isSnoozed: boolean
    neverContacted: boolean
  }
  phones: Phone[]
  motivations: Motivation[]
  pendingTask: PendingTask | null
  queuePosition: number
  totalInQueue: number
  message?: string
}

interface NextUpCardProps {
  data: NextUpData | null
  isLoading: boolean
  onCall: (recordId: string, phoneNumber: string) => void
  onSkip: (recordId: string) => void
  onSnooze: (recordId: string) => void
  onComplete: (recordId: string, taskId: string) => void
  onRecordClick: (recordId: string) => void
  activeBucket?: string
  workedThisSession?: number
}

export function NextUpCard({ 
  data, 
  isLoading, 
  onCall, 
  onSkip, 
  onSnooze, 
  onComplete,
  onRecordClick,
  activeBucket,
  workedThisSession = 0,
}: NextUpCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reasonsExpanded, setReasonsExpanded] = useState(false)

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-card">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.record) {
    return (
      <Card className="border-2 border-dashed border-muted bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
          <p className="text-muted-foreground mt-1">
            {data?.message || 'No leads in your queue right now.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { record, score, nextAction, reasons, topReason, flags, phones, motivations, pendingTask, totalInQueue } = data

  const temperatureIcon = {
    'HOT': <Flame className="w-4 h-4 text-red-500" />,
    'WARM': <Thermometer className="w-4 h-4 text-orange-500" />,
    'COLD': <Snowflake className="w-4 h-4 text-blue-500" />,
  }[record.temperature?.toUpperCase() || 'COLD'] || <Snowflake className="w-4 h-4 text-blue-500" />

  const temperatureColor = {
    'HOT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'WARM': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'COLD': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }[record.temperature?.toUpperCase() || 'COLD'] || 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

  const primaryPhone = phones.find(p => p.type?.toUpperCase() === 'MOBILE') || phones[0]

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const handleAction = async (action: string, callback: () => void) => {
    setActionLoading(action)
    try {
      await callback()
    } finally {
      setActionLoading(null)
    }
  }

  const address = [record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip]
    .filter(Boolean)
    .join(', ')

  const bucketLabel = {
    'call-now': 'Call Now',
    'follow-up': 'Follow Up',
    'get-numbers': 'Get Numbers',
    'nurture': 'Nurture',
    'not-workable': 'Not Workable',
  }[activeBucket || 'call-now'] || 'Queue'

  return (
    <Card className="border-2 border-primary/30 bg-card shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold">
              🔥 NEXT UP
            </Badge>
            <span className="text-sm text-muted-foreground">
              {bucketLabel} • {totalInQueue} remaining
            </span>
            {workedThisSession > 0 && (
              <Badge variant="secondary" className="text-xs">
                {workedThisSession} worked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Progress indicator */}
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">
                #{data.queuePosition} of {totalInQueue + workedThisSession}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Property & Owner Info */}
        <div 
          className="cursor-pointer hover:bg-muted/50 rounded-lg p-3 -mx-3 transition-colors"
          onClick={() => onRecordClick(record.id)}
        >
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {address || 'No address'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{record.ownerFullName}</span>
              </div>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className={cn('gap-1', temperatureColor)}>
              {temperatureIcon}
              {record.temperature || 'Cold'}
            </Badge>
            {motivations.slice(0, 2).map(m => (
              <Badge key={m.id} variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {m.name}
              </Badge>
            ))}
            {flags.hasOverdueTask && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Task Overdue
              </Badge>
            )}
            {flags.neverContacted && (
              <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✨ New Lead
              </Badge>
            )}
          </div>
        </div>

        {/* Phone Number */}
        {primaryPhone && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">
                  {formatPhoneNumber(primaryPhone.number)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {primaryPhone.type || 'Phone'}
                  {phones.length > 1 && ` • +${phones.length - 1} more`}
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction('call', () => onCall(record.id, primaryPhone.number))}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'call' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'CALL'
              )}
            </Button>
          </div>
        )}

        {/* Why this lead - Expandable */}
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setReasonsExpanded(!reasonsExpanded)}
          >
            <div className="text-sm">
              <span className="font-medium text-foreground">Why: </span>
              <span className="text-muted-foreground">{topReason}</span>
              {reasons.length > 1 && !reasonsExpanded && (
                <span className="text-muted-foreground">
                  {' '}+ {reasons.length - 1} more
                </span>
              )}
            </div>
            {reasons.length > 1 && (
              reasonsExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )
            )}
          </button>
          {reasonsExpanded && reasons.length > 0 && (
            <div className="px-3 pb-3 pt-0 space-y-1.5">
              {reasons.map((reason, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm pl-2 border-l-2 border-primary/30"
                >
                  <span className="text-muted-foreground">{reason.label}</span>
                  <span className={cn(
                    'font-medium text-xs',
                    reason.delta > 0 ? 'text-green-600 dark:text-green-400' : 
                    reason.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  )}>
                    {reason.delta > 0 ? '+' : ''}{reason.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Task */}
        {pendingTask && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">{pendingTask.title}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              onClick={() => handleAction('complete', () => onComplete(record.id, pendingTask.id))}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'complete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Done
                </>
              )}
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className={cn(
              "flex-1",
              score >= 90 && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleAction('skip', () => onSkip(record.id))}
            disabled={actionLoading !== null || score >= 90}
            title={score >= 90 ? "Can't skip high priority leads (90+)" : undefined}
          >
            {actionLoading === 'skip' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            className={cn(
              "flex-1",
              score >= 90 && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleAction('snooze', () => onSnooze(record.id))}
            disabled={actionLoading !== null || score >= 90}
            title={score >= 90 ? "Can't snooze high priority leads (90+)" : undefined}
          >
            {actionLoading === 'snooze' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Snooze
              </>
            )}
          </Button>
          {primaryPhone && (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction('call', () => onCall(record.id, primaryPhone.number))}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'call' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
