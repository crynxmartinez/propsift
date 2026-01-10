'use client'

import { Phone, MapPin, Flame } from 'lucide-react'

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

interface QueueListProps {
  records: QueueRecord[]
  onRecordClick: (recordId: string) => void
  emptyMessage?: string
}

const TEMP_CONFIG = {
  HOT: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
  WARM: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  COLD: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  ICE: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', dot: 'bg-slate-400' },
}

export function QueueList({ records, onRecordClick, emptyMessage = 'No records' }: QueueListProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record, index) => {
        const config = TEMP_CONFIG[record.temperatureBand]
        return (
          <div
            key={record.id}
            onClick={() => onRecordClick(record.id)}
            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${config.bg} border ${config.border} hover:border-primary/50`}
          >
            {/* Rank */}
            <div className="w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-xs font-bold text-muted-foreground">
              {index + 1}
            </div>

            {/* Temperature Dot */}
            <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">
                {record.ownerFullName}
              </div>
              {record.propertyStreet && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {record.propertyStreet}
                    {record.propertyCity && `, ${record.propertyCity}`}
                  </span>
                </div>
              )}
            </div>

            {/* Score & Phone */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-foreground">{record.priorityScore}</div>
              </div>
              {record.phones.length > 0 ? (
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-500" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Keep old export name for compatibility
export { QueueList as QueueSection }
