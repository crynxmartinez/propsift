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
  ChevronUp,
  Zap,
  PhoneOff,
  History,
  ExternalLink,
  Check,
  X,
  Ban,
  Skull,
  Pause,
  Play
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ScoreComponent {
  name: string
  value: number
  maxValue: number
}

interface PhoneNumber {
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
  priority: string
}

interface ContactLog {
  id: string
  type: string
  result: string
  notes?: string
  createdAt: string
}

export interface NextUpData {
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
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  scoreComponents: ScoreComponent[]
  reasonString: string
  temperatureBand: 'HOT' | 'WARM' | 'COLD' | 'ICE'
  cadenceStep: number
  totalSteps: number
  cadenceName: string
  nextActionType: string | null
  queueSection: string
  queueReason: string
  phones: PhoneNumber[]
  motivations: Motivation[]
  pendingTask: PendingTask | null
  totalInQueue: number
  contactLogs: ContactLog[]
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
    hasCallback: boolean
    isPaused: boolean
  }
}

interface CallResultOption {
  id: string
  name: string
  color: string
}

interface NextUpCardProps {
  data: NextUpData | null
  isLoading: boolean
  onCall: (recordId: string, phoneNumber: string, phoneId: string) => void
  onSkip: (recordId: string) => void
  onSnooze: (recordId: string, duration: string) => void
  onPause: (recordId: string) => void
  onResume: (recordId: string) => void
  onComplete: (recordId: string, taskId: string) => void
  onRecordClick: (recordId: string) => void
  onPhoneStatus: (recordId: string, phoneId: string, status: string) => void
  activeBucket?: string
  workedThisSession?: number
  calledRecordId?: string | null
  callResultId?: string | null
  callResultOptions?: CallResultOption[]
  onCallResultChange?: (resultId: string) => void
  onNext?: () => void
}

export function NextUpCard({ 
  data, 
  isLoading, 
  onCall, 
  onSkip, 
  onSnooze, 
  onPause,
  onResume,
  onComplete,
  onRecordClick,
  onPhoneStatus,
  activeBucket,
  workedThisSession = 0,
  calledRecordId,
  callResultId,
  callResultOptions = [],
  onCallResultChange,
  onNext,
}: NextUpCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reasonsExpanded, setReasonsExpanded] = useState(false)
  const [phonesExpanded, setPhonesExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

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
            No leads in your queue right now.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { record, score, confidenceLevel, scoreComponents, reasonString, temperatureBand, cadenceStep, totalSteps, cadenceName, nextActionType, queueSection, phones, motivations, pendingTask, totalInQueue, contactLogs, flags } = data

  const temperatureIcon = {
    'HOT': <Flame className="w-4 h-4 text-red-500" />,
    'WARM': <Thermometer className="w-4 h-4 text-orange-500" />,
    'COLD': <Snowflake className="w-4 h-4 text-blue-500" />,
    'ICE': <Snowflake className="w-4 h-4 text-slate-400" />,
  }[temperatureBand] || <Snowflake className="w-4 h-4 text-blue-500" />

  const temperatureColor = {
    'HOT': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'WARM': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'COLD': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'ICE': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  }[temperatureBand] || 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

  const confidenceBadge = {
    'HIGH': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'MEDIUM': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'LOW': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[confidenceLevel] || 'bg-gray-100 text-gray-700'

  const getScoreColor = (s: number) => {
    if (s >= 110) return 'text-amber-500 dark:text-amber-400'
    if (s >= 90) return 'text-orange-500 dark:text-orange-400'
    if (s >= 70) return 'text-green-600 dark:text-green-400'
    if (s >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-muted-foreground'
  }

  const primaryPhone = phones.find(p => {
    const type = p.type?.toUpperCase() || ''
    return type === 'MOBILE' || type === 'CELL'
  }) || phones[0]

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const handleAction = async (action: string, callback: () => void | Promise<void>) => {
    setActionLoading(action)
    try {
      await callback()
    } finally {
      setActionLoading(null)
    }
  }

  const address = [record.propertyStreet, record.propertyCity, record.propertyState]
    .filter(Boolean)
    .join(', ')

  const bucketLabel = queueSection || activeBucket || 'Queue'
  const canSkip = score < 110
  const canSnooze = score < 90
  const cadenceProgress = totalSteps > 0 ? Math.round((cadenceStep / totalSteps) * 100) : 0

  return (
    <Card className="border-2 border-primary/30 bg-card shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
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
            {flags.hasCallback && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                📞 Callback
              </Badge>
            )}
            {flags.isPaused && (
              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 text-xs">
                ⏸ Paused
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs', confidenceBadge)}>
              {confidenceLevel}
            </Badge>
            <div className="text-right">
              <div className={cn('text-3xl font-bold', getScoreColor(score))}>{score}</div>
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
              {temperatureBand}
            </Badge>
            {motivations.slice(0, 3).map(m => (
              <Badge key={m.id} variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {m.name}
              </Badge>
            ))}
            {motivations.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{motivations.length - 3} more
              </Badge>
            )}
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

        {/* LCE Cadence Progress - NEW */}
        {cadenceName && totalSteps > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Cadence: {cadenceName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Step {cadenceStep} of {totalSteps}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${cadenceProgress}%` }}
              />
            </div>
            {nextActionType && (
              <div className="text-xs text-muted-foreground mt-2">
                Next action: <span className="font-medium text-foreground">{nextActionType}</span>
              </div>
            )}
          </div>
        )}

        {/* Phone Numbers */}
        {phones.length > 0 && (
          <div className="bg-muted/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <button
                className="flex items-center gap-3 flex-1 text-left"
                onClick={() => setPhonesExpanded(!phonesExpanded)}
              >
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">
                    {formatPhoneNumber(primaryPhone?.number || phones[0].number)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {primaryPhone?.type || phones[0].type || 'Phone'}
                    {phones.length > 1 && (
                      <span className="text-primary">
                        • {phones.length} numbers {phonesExpanded ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || []).includes('PRIMARY') ? "bg-green-100 text-green-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'PRIMARY')}
                  title="Primary"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || []).includes('WRONG') ? "bg-red-100 text-red-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'WRONG')}
                  title="Wrong Number"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || []).includes('NO_ANSWER') ? "bg-yellow-100 text-yellow-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'NO_ANSWER')}
                  title="No Answer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || []).includes('DNC') ? "bg-orange-100 text-orange-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'DNC')}
                  title="DNC"
                >
                  <Ban className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || []).includes('DEAD') ? "bg-gray-200 text-gray-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'DEAD')}
                  title="Dead"
                >
                  <Skull className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white ml-2"
                  onClick={() => handleAction('call', () => onCall(record.id, primaryPhone?.number || phones[0].number, primaryPhone?.id || phones[0].id))}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'call' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'CALL'
                  )}
                </Button>
              </div>
            </div>
            
            {/* Expanded Phone List */}
            {phonesExpanded && phones.length > 1 && (
              <div className="border-t border-border/50">
                {phones.slice(1).map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between p-3 border-b border-border/30 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {formatPhoneNumber(phone.number)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {phone.type || 'Phone'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('WRONG') ? "bg-red-100 text-red-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'WRONG')}
                        title="Wrong"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('DNC') ? "bg-orange-100 text-orange-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'DNC')}
                        title="DNC"
                      >
                        <Ban className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 ml-1 h-6 w-6 p-0"
                        onClick={() => handleAction(`call-${phone.id}`, () => onCall(record.id, phone.number, phone.id))}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === `call-${phone.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Phone className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Call Attempts Counter */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-muted-foreground">Call Attempts</span>
          <Badge variant="secondary" className="text-xs">
            {record.callAttempts} attempts
          </Badge>
        </div>

        {/* Why this lead - Expandable */}
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setReasonsExpanded(!reasonsExpanded)}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Why this lead?</span>
            </div>
            {reasonsExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {!reasonsExpanded && (
            <div className="px-3 pb-3 pt-0">
              <p className="text-sm text-muted-foreground">{reasonString}</p>
            </div>
          )}
          {reasonsExpanded && scoreComponents.length > 0 && (
            <div className="px-3 pb-3 pt-0 space-y-1.5">
              {scoreComponents.map((component, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm pl-2 border-l-2 border-primary/30"
                >
                  <span className="text-muted-foreground">{component.name}</span>
                  <span className={cn(
                    'font-medium text-xs',
                    component.value > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  )}>
                    +{component.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Task */}
        {pendingTask && (
          <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800 dark:text-orange-200">{pendingTask.title}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
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

        {/* Contact History - Collapsible */}
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setHistoryExpanded(!historyExpanded)}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Contact History</span>
              {record.lastContactedAt && (
                <span className="text-xs text-muted-foreground">
                  • Last: {new Date(record.lastContactedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {historyExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {historyExpanded && (
            <div className="px-3 pb-3 pt-0 space-y-2">
              {contactLogs && contactLogs.length > 0 ? (
                contactLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-l-2 border-muted pl-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-green-600" />
                      <span className="text-muted-foreground capitalize">{log.type}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {log.result}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  {record.callAttempts > 0 ? (
                    <span>{record.callAttempts} call attempts recorded</span>
                  ) : (
                    <span>No contact history yet</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* View Full Record Link */}
        <a 
          href={`/dashboard/records/${record.id}`}
          className="flex items-center justify-center gap-2 text-sm text-primary hover:underline py-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Record
        </a>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            className={cn(
              "flex-1",
              !canSkip && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleAction('skip', () => onSkip(record.id))}
            disabled={actionLoading !== null || !canSkip}
            title={!canSkip ? "Can't skip high priority leads (110+)" : undefined}
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
          
          {/* Snooze Dropdown - LCE Enhanced */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "flex-1",
                  !canSnooze && "opacity-50 cursor-not-allowed"
                )}
                disabled={actionLoading !== null || !canSnooze}
                title={!canSnooze ? "Can't snooze high priority leads (90+)" : undefined}
              >
                {actionLoading === 'snooze' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Snooze
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '1h'))}>
                1 Hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, 'tomorrow'))}>
                Tomorrow Morning
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '3d'))}>
                3 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '1w'))}>
                1 Week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pause/Resume Button - LCE NEW */}
          {flags.isPaused ? (
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => handleAction('resume', () => onResume(record.id))}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'resume' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => handleAction('pause', () => onPause(record.id))}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'pause' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          )}

          {/* Call / Next Button */}
          {primaryPhone && calledRecordId === record.id ? (
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onNext?.()}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'next' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Next Lead
                </>
              )}
            </Button>
          ) : primaryPhone ? (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction('call', () => onCall(record.id, primaryPhone.number, primaryPhone.id))}
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
          ) : null}
        </div>
        
        {/* Post-Call Result Panel */}
        {calledRecordId === record.id && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Call Made - Select Result:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {callResultOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onCallResultChange?.(option.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                    callResultId === option.id
                      ? "text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  )}
                  style={callResultId === option.id ? { backgroundColor: option.color } : {}}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Update phone statuses above, then click &quot;Next Lead&quot; when ready.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
