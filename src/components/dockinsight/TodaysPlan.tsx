'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  Phone, 
  ClipboardCheck, 
  Search, 
  Clock,
  Ban
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BucketCounts {
  callNow: number
  followUpToday: number
  callQueue: number
  verifyFirst: number
  getNumbers: number
  nurture: number
}

interface TodaysPlanProps {
  buckets: BucketCounts
  activeBucket: string
  onBucketClick: (bucket: string) => void
}

export function TodaysPlan({ buckets, activeBucket, onBucketClick }: TodaysPlanProps) {
  const bucketConfig = [
    {
      key: 'call-now',
      label: 'Call Now',
      count: buckets.callNow,
      icon: Phone,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      activeColor: 'ring-red-500',
    },
    {
      key: 'follow-up-today',
      label: 'Follow Up Today',
      count: buckets.followUpToday,
      icon: ClipboardCheck,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      activeColor: 'ring-orange-500',
    },
    {
      key: 'call-queue',
      label: 'Call Queue',
      count: buckets.callQueue,
      icon: Phone,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      activeColor: 'ring-green-500',
    },
    {
      key: 'verify-first',
      label: 'Verify First',
      count: buckets.verifyFirst,
      icon: Search,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      activeColor: 'ring-yellow-500',
    },
    {
      key: 'get-numbers',
      label: 'Get Numbers',
      count: buckets.getNumbers,
      icon: Search,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      activeColor: 'ring-purple-500',
    },
    {
      key: 'nurture',
      label: 'Nurture',
      count: buckets.nurture,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      activeColor: 'ring-blue-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {bucketConfig.map((bucket) => {
        const Icon = bucket.icon
        const isActive = activeBucket === bucket.key
        
        return (
          <Card
            key={bucket.key}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              bucket.bgColor,
              bucket.borderColor,
              isActive && `ring-2 ${bucket.activeColor}`
            )}
            onClick={() => onBucketClick(bucket.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Icon className={cn('w-5 h-5', bucket.color)} />
                <span className={cn('text-2xl font-bold', bucket.color)}>
                  {bucket.count}
                </span>
              </div>
              <div className={cn('text-sm font-medium mt-1', bucket.color)}>
                {bucket.label}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
