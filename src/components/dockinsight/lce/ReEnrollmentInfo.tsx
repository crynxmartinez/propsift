'use client'

import { cn } from '@/lib/utils'
import { Calendar, RefreshCw } from 'lucide-react'

interface ReEnrollmentInfoProps {
  enrollmentCount: number
  maxEnrollments?: number
  reEnrollmentDate?: Date | string | null
  daysUntilReEnrollment?: number | null
  className?: string
}

export function ReEnrollmentInfo({
  enrollmentCount,
  maxEnrollments = 6,
  reEnrollmentDate,
  daysUntilReEnrollment,
  className,
}: ReEnrollmentInfoProps) {
  const parsedDate = reEnrollmentDate
    ? typeof reEnrollmentDate === 'string'
      ? new Date(reEnrollmentDate)
      : reEnrollmentDate
    : null

  const isMaxed = enrollmentCount >= maxEnrollments

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <div className="flex items-center gap-1.5 text-white/60">
        <RefreshCw className="w-4 h-4" />
        <span>
          Cycle {enrollmentCount}/{maxEnrollments}
        </span>
      </div>

      {isMaxed ? (
        <span className="text-amber-400 text-xs">Max cycles reached</span>
      ) : parsedDate ? (
        <div className="flex items-center gap-1.5 text-white/60">
          <Calendar className="w-4 h-4" />
          <span>
            Re-enroll {daysUntilReEnrollment !== null && daysUntilReEnrollment !== undefined
              ? daysUntilReEnrollment <= 0
                ? 'today'
                : `in ${daysUntilReEnrollment} days`
              : `on ${parsedDate.toLocaleDateString()}`}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default ReEnrollmentInfo
