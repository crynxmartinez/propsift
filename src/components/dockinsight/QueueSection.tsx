'use client'

import { ChevronDown, ChevronUp, Phone, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

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

interface QueueSectionProps {
  title: string
  color: string
  records: QueueRecord[]
  total: number
  hasMore: boolean
  isExpanded?: boolean
  onRecordClick: (recordId: string) => void
  onLoadMore?: () => void
}

const TEMP_COLORS = {
  HOT: 'bg-red-500',
  WARM: 'bg-orange-500',
  COLD: 'bg-blue-500',
  ICE: 'bg-slate-400',
}

const SECTION_COLORS: Record<string, string> = {
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
  yellow: 'border-l-yellow-500',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  gray: 'border-l-gray-400',
}

export function QueueSection({
  title,
  color,
  records,
  total,
  hasMore,
  isExpanded: initialExpanded = true,
  onRecordClick,
  onLoadMore,
}: QueueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  if (total === 0) {
    return null
  }

  return (
    <Card className={`border-l-4 ${SECTION_COLORS[color] || 'border-l-gray-400'}`}>
      <CardHeader 
        className="py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {total}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onRecordClick(record.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full ${TEMP_COLORS[record.temperatureBand]}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{record.ownerFullName}</div>
                  {record.propertyStreet && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {record.propertyStreet}
                        {record.propertyCity && `, ${record.propertyCity}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-bold">{record.priorityScore}</div>
                  <div className="text-xs text-muted-foreground">{record.queueReason}</div>
                </div>
                {record.phones.length > 0 && (
                  <Phone className="w-4 h-4 text-green-600" />
                )}
              </div>
            </div>
          ))}
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                onLoadMore?.()
              }}
            >
              Show more ({total - records.length} remaining)
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
