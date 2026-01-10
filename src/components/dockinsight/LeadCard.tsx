'use client'

import { useState } from 'react'
import { Phone, MapPin, Clock, Zap, ChevronRight, Pause, SkipForward } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LeadCardProps {
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
  onCall: (phoneId: string, phoneNumber: string) => void
  onSkip: () => void
  onSnooze: () => void
  onPause: () => void
  onRecordClick: () => void
  isLoading?: boolean
}

const TEMP_COLORS = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-blue-500',
  ICE: 'bg-slate-400',
}

const TEMP_BG = {
  HOT: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  WARM: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  COLD: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  ICE: 'bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800',
}

export function LeadCard({
  record,
  score,
  temperatureBand,
  confidenceLevel,
  cadenceStep,
  totalSteps,
  nextActionType,
  queueSection,
  queueReason,
  reasonString,
  phones,
  motivations,
  hasCallback,
  onCall,
  onSkip,
  onSnooze,
  onPause,
  onRecordClick,
  isLoading,
}: LeadCardProps) {
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState(0)
  const primaryPhone = phones[selectedPhoneIndex] || phones[0]

  const handleCall = () => {
    if (primaryPhone) {
      onCall(primaryPhone.id, primaryPhone.number)
    }
  }

  return (
    <Card className={`${TEMP_BG[temperatureBand]} border-2`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 cursor-pointer" onClick={onRecordClick}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${TEMP_COLORS[temperatureBand]}`} />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {temperatureBand} Lead
              </span>
              {hasCallback && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Callback
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{record.ownerFullName}</h2>
            {record.propertyStreet && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {record.propertyStreet}
                  {record.propertyCity && `, ${record.propertyCity}`}
                  {record.propertyState && `, ${record.propertyState}`}
                </span>
              </div>
            )}
          </div>
          
          {/* Score Badge */}
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{score}</div>
            <div className="text-xs text-muted-foreground">Priority Score</div>
            <Badge variant="outline" className="mt-1 text-xs">
              {confidenceLevel}
            </Badge>
          </div>
        </div>

        {/* Reason String */}
        <div className="bg-background/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{reasonString}</span>
          </div>
          {totalSteps > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Cadence Step {cadenceStep} of {totalSteps}
                {nextActionType && ` • Next: ${nextActionType}`}
              </span>
            </div>
          )}
        </div>

        {/* Motivations */}
        {motivations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {motivations.slice(0, 4).map((m, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {m}
              </Badge>
            ))}
            {motivations.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{motivations.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Phone Selector */}
        {phones.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedPhoneIndex}
                onChange={(e) => setSelectedPhoneIndex(parseInt(e.target.value))}
                className="flex-1 bg-background border rounded-md px-3 py-2 text-sm"
              >
                {phones.map((phone, i) => (
                  <option key={phone.id} value={i}>
                    {phone.number} ({phone.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCall}
            disabled={!primaryPhone || isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onSnooze}
            disabled={isLoading}
          >
            <Clock className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onPause}
            disabled={isLoading}
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={onRecordClick}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
