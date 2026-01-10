/**
 * LCE v2.3.1 Daily Reconciliation
 * Lead Cadence Engine - Data Integrity & Self-Healing
 * 
 * This module handles daily reconciliation checks, auto-fixes,
 * and health metrics as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  TemperatureBand,
} from './types'

import {
  validateState,
} from './state-machine'

// ==========================================
// RECONCILIATION ISSUE TYPES
// ==========================================

export type IssueType =
  | 'ORPHAN_ACTIVE'
  | 'STALE_SNOOZE'
  | 'STALE_PAUSE'
  | 'MISSING_NEXT_ACTION'
  | 'INVALID_STATE_DATA'
  | 'STUCK_ENGAGED'
  | 'OVERDUE_RE_ENROLLMENT'
  | 'SCORE_STALE'
  | 'BAND_MISMATCH'
  | 'PHONE_STATUS_INCONSISTENT'

export interface ReconciliationIssue {
  type: IssueType
  recordId: string
  description: string
  severity: 'low' | 'medium' | 'high'
  autoFixable: boolean
  suggestedFix: string | null
}

// ==========================================
// RECONCILIATION FIX
// ==========================================

export interface ReconciliationFix {
  type: IssueType
  recordId: string
  description: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  appliedAt: Date
}

// ==========================================
// RECORD FOR RECONCILIATION
// ==========================================

export interface RecordForReconciliation {
  id: string
  cadenceState: CadenceState
  cadenceType: string | null
  cadenceStep: number
  nextActionDue: Date | null
  nextActionType: string | null
  snoozedUntil: Date | null
  pausedUntil: Date | null
  pausedReason: string | null
  reEnrollmentDate: Date | null
  enrollmentCount: number
  priorityScore: number | null
  scoreComputedAt: Date | null
  temperatureBand: TemperatureBand | null
  hasEngaged: boolean
  lastContactedAt: Date | null
  hasValidPhone: boolean
  phoneCount: number
}

// ==========================================
// CHECK FUNCTIONS
// ==========================================

export function checkOrphanActive(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.cadenceState === 'ACTIVE' && !record.nextActionDue) {
    return {
      type: 'ORPHAN_ACTIVE',
      recordId: record.id,
      description: 'ACTIVE state but no nextActionDue set',
      severity: 'high',
      autoFixable: true,
      suggestedFix: 'Set nextActionDue to today',
    }
  }
  return null
}

export function checkStaleSnooze(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.cadenceState === 'SNOOZED' && record.snoozedUntil) {
    const now = new Date()
    if (record.snoozedUntil < now) {
      return {
        type: 'STALE_SNOOZE',
        recordId: record.id,
        description: 'Snooze expired but state not updated',
        severity: 'medium',
        autoFixable: true,
        suggestedFix: 'Transition to ACTIVE state',
      }
    }
  }
  return null
}

export function checkStalePause(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.cadenceState === 'PAUSED' && record.pausedUntil) {
    const now = new Date()
    if (record.pausedUntil < now) {
      return {
        type: 'STALE_PAUSE',
        recordId: record.id,
        description: 'Pause expired but state not updated',
        severity: 'medium',
        autoFixable: true,
        suggestedFix: 'Transition to ACTIVE state',
      }
    }
  }
  return null
}

export function checkMissingNextAction(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.cadenceState === 'ACTIVE') {
    if (!record.nextActionType) {
      return {
        type: 'MISSING_NEXT_ACTION',
        recordId: record.id,
        description: 'ACTIVE state but no nextActionType set',
        severity: 'medium',
        autoFixable: true,
        suggestedFix: 'Set nextActionType to CALL',
      }
    }
  }
  return null
}

export function checkInvalidStateData(record: RecordForReconciliation): ReconciliationIssue | null {
  const validation = validateState({
    cadenceState: record.cadenceState,
    cadenceType: record.cadenceType,
    nextActionDue: record.nextActionDue,
    snoozedUntil: record.snoozedUntil,
    pausedReason: record.pausedReason,
  })

  if (!validation.isValid) {
    return {
      type: 'INVALID_STATE_DATA',
      recordId: record.id,
      description: validation.issues.join('; '),
      severity: 'high',
      autoFixable: validation.fixes.length > 0,
      suggestedFix: validation.fixes.length > 0 
        ? `Apply ${validation.fixes.length} fix(es)` 
        : null,
    }
  }
  return null
}

export function checkStuckEngaged(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.cadenceState === 'EXITED_ENGAGED' && record.lastContactedAt) {
    const now = new Date()
    const daysSinceContact = (now.getTime() - record.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceContact >= 21) {
      return {
        type: 'STUCK_ENGAGED',
        recordId: record.id,
        description: `Engaged lead stale for ${Math.floor(daysSinceContact)} days`,
        severity: 'medium',
        autoFixable: true,
        suggestedFix: 'Transition to STALE_ENGAGED state',
      }
    }
  }
  return null
}

export function checkOverdueReEnrollment(record: RecordForReconciliation): ReconciliationIssue | null {
  if (
    record.cadenceState === 'COMPLETED_NO_CONTACT' &&
    record.reEnrollmentDate &&
    record.hasValidPhone &&
    record.enrollmentCount < 6
  ) {
    const now = new Date()
    const daysOverdue = (now.getTime() - record.reEnrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysOverdue >= 7) {
      return {
        type: 'OVERDUE_RE_ENROLLMENT',
        recordId: record.id,
        description: `Re-enrollment overdue by ${Math.floor(daysOverdue)} days`,
        severity: 'low',
        autoFixable: true,
        suggestedFix: 'Re-enroll in cadence',
      }
    }
  }
  return null
}

export function checkScoreStale(record: RecordForReconciliation): ReconciliationIssue | null {
  if (record.scoreComputedAt) {
    const now = new Date()
    const daysSinceScore = (now.getTime() - record.scoreComputedAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceScore >= 7) {
      return {
        type: 'SCORE_STALE',
        recordId: record.id,
        description: `Score not updated in ${Math.floor(daysSinceScore)} days`,
        severity: 'low',
        autoFixable: true,
        suggestedFix: 'Recalculate priority score',
      }
    }
  } else if (record.cadenceState === 'ACTIVE') {
    return {
      type: 'SCORE_STALE',
      recordId: record.id,
      description: 'Active record has no score',
      severity: 'medium',
      autoFixable: true,
      suggestedFix: 'Calculate priority score',
    }
  }
  return null
}

// ==========================================
// RUN ALL CHECKS
// ==========================================

export function runReconciliationChecks(record: RecordForReconciliation): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  const checks = [
    checkOrphanActive,
    checkStaleSnooze,
    checkStalePause,
    checkMissingNextAction,
    checkInvalidStateData,
    checkStuckEngaged,
    checkOverdueReEnrollment,
    checkScoreStale,
  ]

  for (const check of checks) {
    const issue = check(record)
    if (issue) {
      issues.push(issue)
    }
  }

  return issues
}

// ==========================================
// RECONCILIATION RESULT
// ==========================================

export interface ReconciliationResult {
  runId: string
  runDate: Date
  runType: 'DAILY' | 'MANUAL' | 'STARTUP'
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  
  // Statistics
  recordsScanned: number
  issuesFound: number
  issuesFixed: number
  manualReview: number
  
  // Details
  issues: ReconciliationIssue[]
  fixes: ReconciliationFix[]
  
  // Health metrics
  healthMetrics: HealthMetrics
  
  // Timing
  startedAt: Date
  completedAt: Date | null
  durationMs: number | null
  
  // Error
  errorMessage: string | null
}

// ==========================================
// HEALTH METRICS
// ==========================================

export interface HealthMetrics {
  activeInCadence: number
  awaitingReEnroll: number
  longTermNurture: number
  notWorkable: number
  getNumbersQueue: number
  verifyFirstQueue: number
  overdueActions: number
  staleEngaged: number
  
  // Temperature distribution
  hotLeads: number
  warmLeads: number
  coldLeads: number
  iceLeads: number
  
  // Data quality
  recordsWithScore: number
  recordsWithoutScore: number
  avgScore: number
}

export function calculateHealthMetrics(records: RecordForReconciliation[]): HealthMetrics {
  const metrics: HealthMetrics = {
    activeInCadence: 0,
    awaitingReEnroll: 0,
    longTermNurture: 0,
    notWorkable: 0,
    getNumbersQueue: 0,
    verifyFirstQueue: 0,
    overdueActions: 0,
    staleEngaged: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    iceLeads: 0,
    recordsWithScore: 0,
    recordsWithoutScore: 0,
    avgScore: 0,
  }

  let totalScore = 0
  const now = new Date()

  for (const record of records) {
    // State counts
    switch (record.cadenceState) {
      case 'ACTIVE':
        metrics.activeInCadence++
        break
      case 'COMPLETED_NO_CONTACT':
        metrics.awaitingReEnroll++
        break
      case 'LONG_TERM_NURTURE':
        metrics.longTermNurture++
        break
      case 'EXITED_DNC':
      case 'EXITED_DEAD':
      case 'EXITED_CLOSED':
        metrics.notWorkable++
        break
      case 'STALE_ENGAGED':
        metrics.staleEngaged++
        break
    }

    // Queue counts
    if (record.phoneCount === 0) {
      metrics.getNumbersQueue++
    } else if (!record.hasValidPhone) {
      metrics.verifyFirstQueue++
    }

    // Overdue actions
    if (record.cadenceState === 'ACTIVE' && record.nextActionDue && record.nextActionDue < now) {
      metrics.overdueActions++
    }

    // Temperature distribution
    switch (record.temperatureBand) {
      case 'HOT':
        metrics.hotLeads++
        break
      case 'WARM':
        metrics.warmLeads++
        break
      case 'COLD':
        metrics.coldLeads++
        break
      case 'ICE':
        metrics.iceLeads++
        break
    }

    // Score tracking
    if (record.priorityScore !== null) {
      metrics.recordsWithScore++
      totalScore += record.priorityScore
    } else {
      metrics.recordsWithoutScore++
    }
  }

  // Calculate average score
  if (metrics.recordsWithScore > 0) {
    metrics.avgScore = Math.round(totalScore / metrics.recordsWithScore)
  }

  return metrics
}

// ==========================================
// CREATE RECONCILIATION RUN
// ==========================================

export function createReconciliationRun(
  runType: 'DAILY' | 'MANUAL' | 'STARTUP' = 'DAILY'
): ReconciliationResult {
  return {
    runId: crypto.randomUUID(),
    runDate: new Date(),
    runType,
    status: 'RUNNING',
    recordsScanned: 0,
    issuesFound: 0,
    issuesFixed: 0,
    manualReview: 0,
    issues: [],
    fixes: [],
    healthMetrics: {
      activeInCadence: 0,
      awaitingReEnroll: 0,
      longTermNurture: 0,
      notWorkable: 0,
      getNumbersQueue: 0,
      verifyFirstQueue: 0,
      overdueActions: 0,
      staleEngaged: 0,
      hotLeads: 0,
      warmLeads: 0,
      coldLeads: 0,
      iceLeads: 0,
      recordsWithScore: 0,
      recordsWithoutScore: 0,
      avgScore: 0,
    },
    startedAt: new Date(),
    completedAt: null,
    durationMs: null,
    errorMessage: null,
  }
}

// ==========================================
// COMPLETE RECONCILIATION RUN
// ==========================================

export function completeReconciliationRun(
  run: ReconciliationResult,
  records: RecordForReconciliation[],
  issues: ReconciliationIssue[],
  fixes: ReconciliationFix[]
): ReconciliationResult {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - run.startedAt.getTime()

  return {
    ...run,
    status: 'COMPLETED',
    recordsScanned: records.length,
    issuesFound: issues.length,
    issuesFixed: fixes.length,
    manualReview: issues.filter(i => !i.autoFixable).length,
    issues,
    fixes,
    healthMetrics: calculateHealthMetrics(records),
    completedAt,
    durationMs,
  }
}

// ==========================================
// FAIL RECONCILIATION RUN
// ==========================================

export function failReconciliationRun(
  run: ReconciliationResult,
  errorMessage: string
): ReconciliationResult {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - run.startedAt.getTime()

  return {
    ...run,
    status: 'FAILED',
    completedAt,
    durationMs,
    errorMessage,
  }
}

// ==========================================
// GET ISSUE PRIORITY
// ==========================================

export function getIssuePriority(issue: ReconciliationIssue): number {
  const severityPriority: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  }
  return severityPriority[issue.severity] || 0
}

export function sortIssuesByPriority(issues: ReconciliationIssue[]): ReconciliationIssue[] {
  return [...issues].sort((a, b) => getIssuePriority(b) - getIssuePriority(a))
}
