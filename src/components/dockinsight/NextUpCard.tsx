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
  Lightbulb,
  Zap,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  History,
  ExternalLink,
  Check,
  X,
  Ban,
  Skull,
  Pause,
  Play,
  Calendar
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ScoreReason {
  label: string
  delta: number
  category: string
}

interface ImprovementSuggestion {
  action: string
  delta: number
}

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
  lastContactResult: string | null
  hasEngaged: boolean
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
  status: string
  priority: string
}

interface ContactLog {
  id: string
  type: string
  result: string
  notes?: string
  createdAt: string
}

interface RecordStatus {
  id: string
  name: string
  color: string
}

export interface NextUpData {
  record: NextUpRecord | null
  score: number
  nextAction: string
  confidence: 'High' | 'Medium' | 'Low'
  reasons: ScoreReason[]
  topReason: string
  reasonString: string
  suggestions: ImprovementSuggestion[]
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
    isPaused?: boolean
  }
  phones: PhoneNumber[]
  motivations: Motivation[]
  pendingTask: PendingTask | null
  queuePosition: number
  totalInQueue: number
  message?: string
  contactLogs?: ContactLog[]
  status?: RecordStatus | null
  // LCE v2.3.1 fields
  cadenceState?: string
  cadenceType?: string
  cadenceStep?: number
  totalSteps?: number
  nextActionType?: string
  nextActionDue?: string
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
  // Post-call panel props
  calledRecordId?: string | null
  callResultId?: string | null
  callResultOptions?: CallResultOption[]
  onCallResultChange?: (resultId: string) => void
  onNext?: () => void
  // Status and Call Result dropdown props
  statusOptions?: StatusOption[]
  onStatusChange?: (recordId: string, statusId: string) => void
  onLogCallResult?: (recordId: string, resultId: string) => void
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
  statusOptions = [],
  onStatusChange,
  onLogCallResult,
}: NextUpCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reasonsExpanded, setReasonsExpanded] = useState(false)
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false)
  const [phonesExpanded, setPhonesExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null)

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

  const { record, score, nextAction, confidence, reasons, reasonString, suggestions, flags, phones, motivations, pendingTask, totalInQueue } = data

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

  const confidenceBadge = {
    'High': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Low': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[confidence] || 'bg-gray-100 text-gray-700'

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

  const handleAction = async (action: string, callback: () => void) => {
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

  // Show the record's actual nextAction, not the selected bucket
  const bucketLabel = nextAction || 'Queue'

  const canSkip = score < 110
  const canSnooze = score < 90

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
            {flags.smartRescue && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                🆘 Rescued
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs', confidenceBadge)}>
              {confidence}
            </Badge>
            <div className="text-right">
              <div className={cn('text-3xl font-bold', getScoreColor(score))}>{score}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* LCE Cadence Progress Bar - Only show if cadence is active (step > 0) */}
        {data.cadenceStep !== undefined && data.cadenceStep > 0 && data.totalSteps && data.totalSteps > 0 && data.cadenceType && (
          <div className="bg-muted/50 rounded-lg p-3 -mt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {data.cadenceState === 'PAUSED' ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                    <Pause className="w-3 h-3 mr-1" />
                    PAUSED
                  </Badge>
                ) : data.cadenceState === 'SNOOZED' ? (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    SNOOZED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    ACTIVE
                  </Badge>
                )}
                <span className="text-sm font-medium text-foreground">
                  {data.cadenceType} Cadence
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Step {data.cadenceStep} of {data.totalSteps}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all",
                  data.cadenceType === 'HOT' ? 'bg-red-500' :
                  data.cadenceType === 'WARM' ? 'bg-orange-500' :
                  data.cadenceType === 'COLD' ? 'bg-blue-500' :
                  'bg-primary'
                )}
                style={{ width: `${(data.cadenceStep / data.totalSteps) * 100}%` }}
              />
            </div>
            {data.nextActionDue && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Next: {data.nextActionType || 'CALL'} due {new Date(data.nextActionDue).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Property & Owner Info */}
        <div 
          className="cursor-pointer hover:bg-muted/50 rounded-lg p-3 -mx-3 transition-colors"
          onClick={() => onRecordClick(record.id)}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left side - Address and Owner */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
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
            
            {/* Right side - Status and Call Result Dropdowns */}
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 gap-1"
                    style={data.status ? { 
                      backgroundColor: `${data.status.color}20`,
                      borderColor: data.status.color,
                      color: data.status.color
                    } : undefined}
                  >
                    {data.status?.name || 'Status'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {statusOptions.map((status) => (
                    <DropdownMenuItem
                      key={status.id}
                      onClick={() => onStatusChange?.(record.id, status.id)}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                      {data.status?.id === status.id && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Call Result Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 gap-1",
                      record.lastContactResult === 'ANSWERED' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400',
                      record.lastContactResult === 'VOICEMAIL' && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
                      record.lastContactResult === 'NO_ANSWER' && 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
                      record.lastContactResult === 'BUSY' && 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
                      record.lastContactResult === 'WRONG_NUMBER' && 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400',
                      record.lastContactResult === 'DISCONNECTED' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400'
                    )}
                  >
                    <PhoneCall className="w-3 h-3" />
                    {record.lastContactResult ? record.lastContactResult.replace('_', ' ') : 'Call Result'}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {callResultOptions.map((result) => (
                    <DropdownMenuItem
                      key={result.id}
                      onClick={() => onLogCallResult?.(record.id, result.id)}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: result.color }}
                      />
                      {result.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className={cn('gap-1', temperatureColor)}>
              {temperatureIcon}
              {record.temperature || 'Cold'}
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
          </div>
        </div>

        {/* Phone Numbers - Collapsible */}
        {phones.length > 0 && (
          <div className="bg-muted/50 rounded-lg overflow-hidden">
            {/* Primary Phone Header */}
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
                    {(primaryPhone?.statuses || phones[0].statuses)?.length > 0 && (
                      <span className="ml-1">
                        {(primaryPhone?.statuses || phones[0].statuses).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 ml-1">
                            {s}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                {/* Status buttons for primary phone - matches records page */}
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('PRIMARY') ? "bg-green-100 text-green-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'PRIMARY')}
                  title="Primary"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('CORRECT') ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'CORRECT')}
                  title="Correct"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('WRONG') ? "bg-red-100 text-red-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'WRONG')}
                  title="Wrong Number"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('NO_ANSWER') ? "bg-yellow-100 text-yellow-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'NO_ANSWER')}
                  title="No Answer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('DNC') ? "bg-orange-100 text-orange-600" : "text-gray-300 hover:text-gray-500")}
                  onClick={() => onPhoneStatus(record.id, primaryPhone?.id || phones[0].id, 'DNC')}
                  title="DNC"
                >
                  <Ban className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", (primaryPhone?.statuses || phones[0].statuses)?.includes('DEAD') ? "bg-gray-200 text-gray-600" : "text-gray-300 hover:text-gray-500")}
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
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          {phone.type || 'Phone'}
                          {phone.statuses?.length > 0 && (
                            <span className="ml-1">
                              {phone.statuses.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 ml-1">
                                  {s}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('PRIMARY') ? "bg-green-100 text-green-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'PRIMARY')}
                        title="Primary"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('CORRECT') ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'CORRECT')}
                        title="Correct"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
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
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('NO_ANSWER') ? "bg-yellow-100 text-yellow-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'NO_ANSWER')}
                        title="No Answer"
                      >
                        <PhoneOff className="w-3 h-3" />
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
                        variant="ghost"
                        className={cn("h-6 w-6 p-0", phone.statuses?.includes('DEAD') ? "bg-gray-200 text-gray-600" : "text-gray-300 hover:text-gray-500")}
                        onClick={() => onPhoneStatus(record.id, phone.id, 'DEAD')}
                        title="Dead"
                      >
                        <Skull className="w-3 h-3" />
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

        {/* Improvement Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg overflow-hidden border border-amber-200 dark:border-amber-800">
            <button
              className="w-full flex items-center justify-between p-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
              onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Boost this score
                </span>
              </div>
              {suggestionsExpanded ? (
                <ChevronUp className="w-4 h-4 text-amber-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-600" />
              )}
            </button>
            {suggestionsExpanded && (
              <div className="px-3 pb-3 pt-0 space-y-1.5">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-amber-700 dark:text-amber-300">{suggestion.action}</span>
                    <span className="font-medium text-xs text-green-600 dark:text-green-400">
                      +{suggestion.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              {data.contactLogs && data.contactLogs.length > 0 ? (
                data.contactLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm border-l-2 border-muted pl-2">
                    <div className="flex items-center gap-2">
                      {log.type === 'call' && <PhoneCall className="w-3 h-3 text-green-600" />}
                      {log.type === 'sms' && <MessageSquare className="w-3 h-3 text-blue-600" />}
                      {!['call', 'sms'].includes(log.type) && <History className="w-3 h-3 text-muted-foreground" />}
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
          {/* Pause/Resume Button */}
          {data.cadenceState === 'PAUSED' || flags.isPaused ? (
            <Button 
              variant="outline" 
              className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400"
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
              className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400"
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
          {/* Snooze Dropdown */}
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
            <DropdownMenuContent align="center">
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '1h'))}>
                <Clock className="w-4 h-4 mr-2" />
                1 hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, 'tomorrow'))}>
                <Calendar className="w-4 h-4 mr-2" />
                Tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '3d'))}>
                <Calendar className="w-4 h-4 mr-2" />
                3 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('snooze', () => onSnooze(record.id, '1w'))}>
                <Calendar className="w-4 h-4 mr-2" />
                1 week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {primaryPhone && calledRecordId === record.id ? (
            /* Post-Call Panel: Show NEXT button and call result selector */
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
