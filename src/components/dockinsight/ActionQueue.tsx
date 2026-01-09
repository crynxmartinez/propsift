'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Phone, 
  Flame,
  Thermometer,
  Snowflake,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueueRecord {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  temperature: string | null
  score: number
  nextAction: string
  topReason: string
  phoneCount: number
  hasMobile: boolean
  motivationCount: number
  topMotivation: string | null
  hasOverdueTask: boolean
  queuePosition: number
}

interface ActionQueueProps {
  records: QueueRecord[]
  total: number
  isLoading: boolean
  onRecordClick: (recordId: string) => void
  onCall: (recordId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
}

export function ActionQueue({ 
  records, 
  total, 
  isLoading, 
  onRecordClick, 
  onCall,
  onLoadMore,
  hasMore 
}: ActionQueueProps) {
  const temperatureIcon = (temp: string | null) => {
    switch (temp?.toUpperCase()) {
      case 'HOT': return <Flame className="w-3 h-3 text-red-500" />
      case 'WARM': return <Thermometer className="w-3 h-3 text-orange-500" />
      default: return <Snowflake className="w-3 h-3 text-blue-500" />
    }
  }

  const temperatureColor = (temp: string | null) => {
    switch (temp?.toUpperCase()) {
      case 'HOT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'WARM': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 110) return 'text-amber-500 dark:text-amber-400'
    if (score >= 90) return 'text-orange-500 dark:text-orange-400'
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-muted-foreground'
  }

  if (isLoading && records.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Queue</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Queue</CardTitle>
          <span className="text-sm text-muted-foreground">{total} leads</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-border">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onRecordClick(record.id)}
              >
                {/* Score */}
                <div className={cn('text-xl font-bold w-10 text-center', getScoreColor(record.score))}>
                  {record.score}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {record.propertyStreet || 'No address'}
                    </span>
                    <Badge className={cn('text-xs px-1.5 py-0', temperatureColor(record.temperature))}>
                      {temperatureIcon(record.temperature)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {record.ownerFullName}
                    {record.topMotivation && (
                      <span className="text-purple-600 dark:text-purple-400"> • {record.topMotivation}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {record.phoneCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCall(record.id)
                      }}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Load More
              </Button>
            </div>
          )}

          {records.length === 0 && !isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              No records in this queue
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
