'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  ClipboardCheck, 
  PhoneCall,
  Search, 
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BucketCounts {
  callNow: number
  followUpToday: number
  callQueue: number
  verifyFirst: number
  getNumbers: number
  nurture: number
}

interface BucketSelectorProps {
  buckets: BucketCounts
  activeBucket: string
  onBucketClick: (bucket: string) => void
}

const bucketConfig = [
  {
    key: 'call-now',
    label: 'Call Now',
    description: 'High priority, ready to call',
    icon: Phone,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    activeColor: 'ring-red-500',
    countKey: 'callNow' as keyof BucketCounts,
  },
  {
    key: 'follow-up-today',
    label: 'Follow Up',
    description: 'Tasks due today',
    icon: ClipboardCheck,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    activeColor: 'ring-orange-500',
    countKey: 'followUpToday' as keyof BucketCounts,
  },
  {
    key: 'call-queue',
    label: 'Call Queue',
    description: 'Medium priority',
    icon: PhoneCall,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    activeColor: 'ring-green-500',
    countKey: 'callQueue' as keyof BucketCounts,
  },
  {
    key: 'verify-first',
    label: 'Verify First',
    description: 'Needs data verification',
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    activeColor: 'ring-yellow-500',
    countKey: 'verifyFirst' as keyof BucketCounts,
  },
  {
    key: 'get-numbers',
    label: 'Get Numbers',
    description: 'Missing phone data',
    icon: Search,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    activeColor: 'ring-purple-500',
    countKey: 'getNumbers' as keyof BucketCounts,
  },
  {
    key: 'nurture',
    label: 'Nurture',
    description: 'Low priority',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    activeColor: 'ring-blue-500',
    countKey: 'nurture' as keyof BucketCounts,
  },
]

export function BucketSelector({ buckets, activeBucket, onBucketClick }: BucketSelectorProps) {
  const totalWorkable = Object.values(buckets).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Action Buckets</h3>
        <Badge variant="secondary" className="text-xs">
          {totalWorkable} workable
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {bucketConfig.map((bucket) => {
          const Icon = bucket.icon
          const isActive = activeBucket === bucket.key
          const count = buckets[bucket.countKey]
          
          return (
            <Card
              key={bucket.key}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md border',
                bucket.bgColor,
                bucket.borderColor,
                isActive && `ring-2 ${bucket.activeColor}`,
                count === 0 && 'opacity-50'
              )}
              onClick={() => onBucketClick(bucket.key)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Icon className={cn('w-4 h-4', bucket.color)} />
                  <span className={cn('text-xl font-bold', bucket.color)}>
                    {count}
                  </span>
                </div>
                <div className={cn('text-xs font-medium', bucket.color)}>
                  {bucket.label}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
