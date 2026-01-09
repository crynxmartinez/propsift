'use client'

import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreReason {
  label: string
  delta: number
  category: string
}

interface ScoreExplainerProps {
  score: number
  reasons: ScoreReason[]
  confidence: string
  compact?: boolean
}

export function ScoreExplainer({ score, reasons, confidence, compact = false }: ScoreExplainerProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">High Confidence</Badge>
      case 'Medium':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium Confidence</Badge>
      default:
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Low Confidence</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'temperature': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'motivation': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
      case 'task': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'contact': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'engagement': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'fatigue': return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  // Sort reasons by absolute delta value
  const sortedReasons = [...reasons].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn('text-2xl font-bold', getScoreColor(score))}>{score}</span>
        {getConfidenceBadge(confidence)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className={cn('text-4xl font-bold', getScoreColor(score))}>{score}</div>
          <div className="text-sm text-muted-foreground">Priority Score</div>
        </div>
        {getConfidenceBadge(confidence)}
      </div>

      {/* Score Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Score Breakdown</h4>
        <div className="space-y-1.5">
          {sortedReasons.map((reason, index) => (
            <div 
              key={index}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border',
                getCategoryColor(reason.category)
              )}
            >
              <div className="flex items-center gap-2">
                {reason.delta > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : reason.delta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-foreground">{reason.label}</span>
              </div>
              <span className={cn(
                'text-sm font-medium',
                reason.delta > 0 ? 'text-green-600' : reason.delta < 0 ? 'text-red-600' : 'text-gray-500'
              )}>
                {reason.delta > 0 ? '+' : ''}{reason.delta}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Score ranges: 80+ (High Priority) • 60-79 (Medium) • 40-59 (Low) • &lt;40 (Nurture)
        </div>
      </div>
    </div>
  )
}
