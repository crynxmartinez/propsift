'use client'

import { useState } from 'react'
import { Phone, MapPin, Clock, Zap, ChevronRight, Pause, SkipForward, Flame, PhoneCall, Calendar } from 'lucide-react'
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

const TEMP_CONFIG = {
  HOT: { bg: 'from-red-500/20 to-orange-500/10', border: 'border-red-500/50', text: 'text-red-500', label: 'HOT' },
  WARM: { bg: 'from-orange-500/20 to-yellow-500/10', border: 'border-orange-500/50', text: 'text-orange-500', label: 'WARM' },
  COLD: { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/50', text: 'text-blue-500', label: 'COLD' },
  ICE: { bg: 'from-slate-500/20 to-slate-400/10', border: 'border-slate-500/50', text: 'text-slate-500', label: 'ICE' },
}

export function LeadCard({
  record,
  score,
  temperatureBand,
  confidenceLevel,
  cadenceStep,
  totalSteps,
  nextActionType,
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
  const tempConfig = TEMP_CONFIG[temperatureBand]

  const handleCall = () => {
    if (primaryPhone) {
      onCall(primaryPhone.id, primaryPhone.number)
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tempConfig.bg} border-2 ${tempConfig.border} backdrop-blur-sm`}>
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-2xl" />
      
      <div className="relative p-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border ${tempConfig.border}`}>
              <Flame className={`w-4 h-4 ${tempConfig.text}`} />
              <span className={`text-sm font-bold ${tempConfig.text}`}>{tempConfig.label}</span>
            </div>
            {hasCallback && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50">
                <Calendar className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Callback</span>
              </div>
            )}
          </div>
          
          {/* Score Circle */}
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm border-2 ${tempConfig.border} flex items-center justify-center`}>
              <span className="text-2xl font-black text-foreground">{score}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Priority</span>
          </div>
        </div>

        {/* Main Info */}
        <div className="mb-4 cursor-pointer" onClick={onRecordClick}>
          <h2 className="text-2xl font-bold text-foreground mb-1">{record.ownerFullName}</h2>
          {record.propertyStreet && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {record.propertyStreet}
                {record.propertyCity && `, ${record.propertyCity}`}
                {record.propertyState && ` ${record.propertyState}`}
              </span>
            </div>
          )}
        </div>

        {/* Why Card */}
        <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Why This Lead</p>
              <p className="text-sm font-medium text-foreground">{reasonString || queueReason}</p>
            </div>
          </div>
          
          {totalSteps > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Step {cadenceStep}/{totalSteps}
                {nextActionType && <span className="ml-2 text-foreground font-medium">• {nextActionType}</span>}
              </span>
            </div>
          )}
        </div>

        {/* Motivations */}
        {motivations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {motivations.slice(0, 5).map((m, i) => (
              <Badge key={i} variant="secondary" className="bg-background/60 backdrop-blur-sm border border-white/10 text-xs">
                {m}
              </Badge>
            ))}
            {motivations.length > 5 && (
              <Badge variant="outline" className="text-xs bg-background/40">
                +{motivations.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Phone Selector */}
        {phones.length > 0 && (
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-green-500" />
              </div>
              <select
                value={selectedPhoneIndex}
                onChange={(e) => setSelectedPhoneIndex(parseInt(e.target.value))}
                className="flex-1 bg-transparent border-0 text-foreground font-medium focus:outline-none focus:ring-0"
              >
                {phones.map((phone, i) => (
                  <option key={phone.id} value={i} className="bg-background">
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
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold h-14 text-lg rounded-xl shadow-lg shadow-green-600/25"
          >
            <Phone className="w-5 h-5 mr-2" />
            Call Now
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onSkip}
            disabled={isLoading}
            className="h-14 w-14 rounded-xl bg-background/60 backdrop-blur-sm border-white/20 hover:bg-background/80"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onSnooze}
            disabled={isLoading}
            className="h-14 w-14 rounded-xl bg-background/60 backdrop-blur-sm border-white/20 hover:bg-background/80"
          >
            <Clock className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onPause}
            disabled={isLoading}
            className="h-14 w-14 rounded-xl bg-background/60 backdrop-blur-sm border-white/20 hover:bg-background/80"
          >
            <Pause className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onRecordClick}
            className="h-14 w-14 rounded-xl bg-background/60 backdrop-blur-sm border-white/20 hover:bg-background/80"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
