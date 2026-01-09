'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScoreExplainer } from './ScoreExplainer'
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
  Loader2
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

interface RecordDrawerProps {
  isOpen: boolean
  onClose: () => void
  record: RecordDetails | null
  score: number
  nextAction: string
  confidence: string
  reasons: ScoreReason[]
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

  const temperatureConfig = {
    'HOT': { icon: Flame, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    'WARM': { icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    'COLD': { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  }

  const currentTemp = record.temperature?.toUpperCase() as keyof typeof temperatureConfig || 'COLD'
  const TempIcon = temperatureConfig[currentTemp]?.icon || Snowflake

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

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const propertyAddress = [record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip]
    .filter(Boolean)
    .join(', ')

  const mailingAddress = [record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip]
    .filter(Boolean)
    .join(', ')

  const handleAction = async (action: string, callback: () => void) => {
    setActionLoading(action)
    try {
      await callback()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Record Details</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Score Section */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <ScoreExplainer 
                    score={score} 
                    reasons={reasons} 
                    confidence={confidence} 
                  />
                </div>

                {/* Next Action Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Next Action:</span>
                  <Badge className="bg-primary/10 text-primary">{nextAction}</Badge>
                </div>

                <Separator />

                {/* Property Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Property
                  </h4>
                  <div 
                    className="text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => copyToClipboard(propertyAddress)}
                  >
                    {propertyAddress || 'No address'}
                  </div>
                  {mailingAddress && mailingAddress !== propertyAddress && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Mailing:</span> {mailingAddress}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Owner Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Owner
                  </h4>
                  <div className="text-foreground">{record.ownerFullName}</div>
                </div>

                <Separator />

                {/* Temperature */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Temperature</h4>
                  <div className="flex gap-2">
                    {(['HOT', 'WARM', 'COLD'] as const).map((temp) => {
                      const config = temperatureConfig[temp]
                      const Icon = config.icon
                      const isActive = currentTemp === temp
                      
                      return (
                        <Button
                          key={temp}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            isActive && config.bg,
                            isActive && config.color
                          )}
                          onClick={() => handleAction(`temp-${temp}`, () => onTemperatureChange(record.id, temp))}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === `temp-${temp}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Icon className="w-4 h-4 mr-1" />
                              {temp}
                            </>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Phone Numbers */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Numbers ({phones.length})
                  </h4>
                  {phones.length > 0 ? (
                    <div className="space-y-2">
                      {phones.map((phone) => (
                        <div 
                          key={phone.id}
                          className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                        >
                          <div>
                            <div className="font-medium text-foreground">
                              {formatPhoneNumber(phone.number)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{phone.type || 'Unknown'}</span>
                              {phone.statuses?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {phone.statuses[0]}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(phone.number)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(`call-${phone.id}`, () => onCall(record.id, phone.number))}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === `call-${phone.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Phone className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No phone numbers</div>
                  )}
                </div>

                <Separator />

                {/* Motivations & Tags */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Motivations & Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {motivations.map((m) => (
                      <Badge key={m.id} className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {m.name}
                      </Badge>
                    ))}
                    {tags.map((t) => (
                      <Badge key={t.id} variant="secondary">
                        {t.name}
                      </Badge>
                    ))}
                    {motivations.length === 0 && tags.length === 0 && (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Tasks */}
                {tasks.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Tasks ({tasks.length})
                      </h4>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div 
                            key={task.id}
                            className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                          >
                            <div>
                              <div className="font-medium text-foreground">{task.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Due: {formatDate(task.dueDate)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
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
                    </div>
                    <Separator />
                  </>
                )}

                {/* Activity Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Activity
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Call Attempts</div>
                      <div className="font-medium text-foreground">{record.callAttempts}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Contact</div>
                      <div className="font-medium text-foreground">{formatDate(record.lastContactedAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Skiptrace Date</div>
                      <div className="font-medium text-foreground">{formatDate(record.skiptraceDate)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Has Engaged</div>
                      <div className="font-medium text-foreground">{record.hasEngaged ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>

                {/* View Full Record Link */}
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/dashboard/records?id=${record.id}`} target="_blank">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Record
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
