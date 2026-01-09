'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Phone, 
  Mail,
  MapPin,
  User,
  Calendar,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  X,
  ExternalLink,
  Copy,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RecordDetails {
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

interface Tag {
  id: string
  name: string
}

interface Task {
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

interface ImprovementSuggestion {
  action: string
  delta: number
}

interface RecordDrawerProps {
  isOpen: boolean
  onClose: () => void
  record: RecordDetails | null
  score: number
  nextAction: string
  confidence: 'High' | 'Medium' | 'Low'
  reasons: ScoreReason[]
  reasonString: string
  suggestions: ImprovementSuggestion[]
  phones: PhoneNumber[]
  motivations: Motivation[]
  tags: Tag[]
  tasks: Task[]
  onCall: (recordId: string, phoneNumber: string) => void
  onTemperatureChange: (recordId: string, temperature: 'HOT' | 'WARM' | 'COLD') => void
  onTaskComplete: (recordId: string, taskId: string) => void
  isLoading?: boolean
}

export function RecordDrawer({
  isOpen,
  onClose,
  record,
  score,
  nextAction,
  confidence,
  reasons,
  reasonString,
  suggestions,
  phones,
  motivations,
  tags,
  tasks,
  onCall,
  onTemperatureChange,
  onTaskComplete,
  isLoading = false,
}: RecordDrawerProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (!record) return null

  const temperatureIcon = {
    'HOT': <Flame className="w-4 h-4 text-red-500" />,
    'WARM': <Thermometer className="w-4 h-4 text-orange-500" />,
    'COLD': <Snowflake className="w-4 h-4 text-blue-500" />,
  }[record.temperature?.toUpperCase() || 'COLD'] || <Snowflake className="w-4 h-4 text-blue-500" />

  const getScoreColor = (s: number) => {
    if (s >= 110) return 'text-amber-500'
    if (s >= 90) return 'text-orange-500'
    if (s >= 70) return 'text-green-600'
    if (s >= 50) return 'text-yellow-600'
    return 'text-muted-foreground'
  }

  const getConfidenceColor = (c: string) => {
    switch (c) {
      case 'High': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleAction = async (action: string, callback: () => void) => {
    setActionLoading(action)
    try {
      await callback()
    } finally {
      setActionLoading(null)
    }
  }

  const propertyAddress = [record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip]
    .filter(Boolean)
    .join(', ')

  const mailingAddress = [record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip]
    .filter(Boolean)
    .join(', ')

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-xl">{record.ownerFullName}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">{propertyAddress || 'No address'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Score & Status */}
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center">
                  <div className={cn('text-3xl font-bold', getScoreColor(score))}>{score}</div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge className={cn('text-xs', getConfidenceColor(confidence))}>
                    {confidence} Confidence
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {nextAction}
                  </Badge>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Temperature */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Temperature</h4>
                  <div className="flex gap-2">
                    {(['HOT', 'WARM', 'COLD'] as const).map((temp) => (
                      <Button
                        key={temp}
                        variant={record.temperature?.toUpperCase() === temp ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          record.temperature?.toUpperCase() === temp && {
                            'HOT': 'bg-red-600 hover:bg-red-700',
                            'WARM': 'bg-orange-500 hover:bg-orange-600',
                            'COLD': 'bg-blue-500 hover:bg-blue-600',
                          }[temp]
                        )}
                        onClick={() => handleAction(`temp-${temp}`, () => onTemperatureChange(record.id, temp))}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === `temp-${temp}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          temp
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Phone Numbers */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Phone Numbers</h4>
                  {phones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No phone numbers</p>
                  ) : (
                    <div className="space-y-2">
                      {phones.map((phone) => (
                        <div key={phone.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{formatPhoneNumber(phone.number)}</div>
                              <div className="text-xs text-muted-foreground">
                                {phone.type || 'Unknown'}
                                {phone.statuses.length > 0 && ` • ${phone.statuses.join(', ')}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(phone.number)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleAction(`call-${phone.id}`, () => onCall(record.id, phone.number))}
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

                <Separator />

                {/* Score Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Score Breakdown
                  </h4>
                  <div className="space-y-1.5">
                    {reasons.slice(0, 8).map((reason, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {reason.delta > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : reason.delta < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          ) : null}
                          <span className="text-muted-foreground">{reason.label}</span>
                        </div>
                        <span className={cn(
                          'font-medium text-xs',
                          reason.delta > 0 ? 'text-green-600' : 
                          reason.delta < 0 ? 'text-red-600' : 'text-muted-foreground'
                        )}>
                          {reason.delta > 0 ? '+' : ''}{reason.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvement Suggestions */}
                {suggestions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Boost This Score
                      </h4>
                      <div className="space-y-1.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                        {suggestions.map((suggestion, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-amber-700 dark:text-amber-300">{suggestion.action}</span>
                            <span className="font-medium text-xs text-green-600">
                              +{suggestion.delta}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Motivations & Tags */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Motivations</h4>
                  {motivations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No motivations</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {motivations.map((m) => (
                        <Badge key={m.id} variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <Badge key={t.id} variant="outline">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Tasks */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Tasks</h4>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending tasks</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{task.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(`task-${task.id}`, () => onTaskComplete(record.id, task.id))}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === `task-${task.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Done
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact History */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact History</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Last Contact</div>
                      <div className="font-medium">{formatDate(record.lastContactedAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Call Attempts</div>
                      <div className="font-medium">{record.callAttempts}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Has Engaged</div>
                      <div className="font-medium">{record.hasEngaged ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Skiptrace Date</div>
                      <div className="font-medium">{formatDate(record.skiptraceDate)}</div>
                    </div>
                  </div>
                </div>

                {/* View Full Record */}
                <div className="pt-4">
                  <a 
                    href={`/dashboard/records/${record.id}`}
                    className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Record
                  </a>
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
