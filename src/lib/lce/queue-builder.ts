/**
 * LCE v2.3.1 Queue Builder
 * Lead Cadence Engine - DockInsight Queue Construction
 * 
 * This module builds the prioritized queue for DockInsight
 * as defined in the LCE v2.3.1 specification.
 */

import {
  CadenceState,
  TemperatureBand,
  ConfidenceLevel,
} from './types'

import {
  QueueSection,
  QueueAssignment,
  assignToQueueSection,
  QUEUE_SECTION_INFO,
} from './workability'

// ==========================================
// QUEUE RECORD INTERFACE
// ==========================================

export interface QueueRecord {
  id: string
  ownerFullName: string
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  
  // Scoring
  priorityScore: number
  temperatureBand: TemperatureBand
  confidenceLevel: ConfidenceLevel
  
  // Cadence
  cadenceState: CadenceState
  cadenceType: string | null
  cadenceStep: number
  nextActionType: string | null
  nextActionDue: Date | null
  
  // Queue assignment
  queueSection: QueueSection
  queuePriority: number
  queueReason: string
  
  // Display info
  reasonString: string
  nextAction: string
  tip: string | null
  
  // Flags
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  hasCallback: boolean
  isVerifyFirst: boolean
  isGetNumbers: boolean
}

// ==========================================
// QUEUE BUILDER
// ==========================================

export interface QueueBuildResult {
  sections: Record<QueueSection, QueueRecord[]>
  counts: Record<QueueSection, number>
  totalWorkable: number
  totalNotWorkable: number
}

export function buildQueue(records: QueueRecord[]): QueueBuildResult {
  // Initialize sections
  const sections: Record<QueueSection, QueueRecord[]> = {
    OVERDUE: [],
    DUE_TODAY: [],
    TASKS_DUE: [],
    VERIFY_FIRST: [],
    GET_NUMBERS: [],
    UPCOMING: [],
    NOT_WORKABLE: [],
  }

  // Assign records to sections
  for (const record of records) {
    sections[record.queueSection].push(record)
  }

  // Sort each section by priority (descending) then by score (descending)
  for (const section of Object.keys(sections) as QueueSection[]) {
    sections[section].sort((a, b) => {
      // First by queue priority
      if (a.queuePriority !== b.queuePriority) {
        return b.queuePriority - a.queuePriority
      }
      // Then by priority score
      return b.priorityScore - a.priorityScore
    })
  }

  // Calculate counts
  const counts: Record<QueueSection, number> = {
    OVERDUE: sections.OVERDUE.length,
    DUE_TODAY: sections.DUE_TODAY.length,
    TASKS_DUE: sections.TASKS_DUE.length,
    VERIFY_FIRST: sections.VERIFY_FIRST.length,
    GET_NUMBERS: sections.GET_NUMBERS.length,
    UPCOMING: sections.UPCOMING.length,
    NOT_WORKABLE: sections.NOT_WORKABLE.length,
  }

  const totalWorkable = 
    counts.OVERDUE + 
    counts.DUE_TODAY + 
    counts.TASKS_DUE + 
    counts.VERIFY_FIRST + 
    counts.GET_NUMBERS + 
    counts.UPCOMING

  return {
    sections,
    counts,
    totalWorkable,
    totalNotWorkable: counts.NOT_WORKABLE,
  }
}

// ==========================================
// GET NEXT UP RECORD
// ==========================================

export interface NextUpResult {
  record: QueueRecord | null
  section: QueueSection | null
  position: number
  totalInSection: number
  reason: string
}

export function getNextUp(queue: QueueBuildResult): NextUpResult {
  // Priority order of sections
  const sectionOrder: QueueSection[] = [
    'OVERDUE',
    'DUE_TODAY',
    'TASKS_DUE',
    'VERIFY_FIRST',
    'GET_NUMBERS',
    'UPCOMING',
  ]

  for (const section of sectionOrder) {
    const records = queue.sections[section]
    if (records.length > 0) {
      return {
        record: records[0],
        section,
        position: 1,
        totalInSection: records.length,
        reason: QUEUE_SECTION_INFO[section].label,
      }
    }
  }

  return {
    record: null,
    section: null,
    position: 0,
    totalInSection: 0,
    reason: 'Queue is empty',
  }
}

// ==========================================
// CAPACITY THROTTLING
// ==========================================

export interface ThrottledSection {
  records: QueueRecord[]
  total: number
  showing: number
  hasMore: boolean
}

export function throttleSection(
  records: QueueRecord[],
  limit: number = 50
): ThrottledSection {
  return {
    records: records.slice(0, limit),
    total: records.length,
    showing: Math.min(records.length, limit),
    hasMore: records.length > limit,
  }
}

export function throttleQueue(
  queue: QueueBuildResult,
  limitPerSection: number = 50
): Record<QueueSection, ThrottledSection> {
  const result: Record<QueueSection, ThrottledSection> = {} as Record<QueueSection, ThrottledSection>

  for (const section of Object.keys(queue.sections) as QueueSection[]) {
    result[section] = throttleSection(queue.sections[section], limitPerSection)
  }

  return result
}

// ==========================================
// REASON STRING GENERATION
// ==========================================

export function generateReasonString(record: {
  temperatureBand: TemperatureBand
  hasCallback: boolean
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  cadenceStep: number
  totalSteps: number
  daysOverdue: number
  topMotivation: string | null
}): string {
  const parts: string[] = []

  // WHY component
  if (record.hasCallback) {
    parts.push('Callback requested')
  } else if (record.hasOverdueTask) {
    parts.push(`Task overdue by ${record.daysOverdue}d`)
  } else if (record.hasDueTodayTask) {
    parts.push('Task due today')
  } else if (record.topMotivation) {
    parts.push(record.topMotivation)
  }

  // NEXT component
  if (record.totalSteps > 0) {
    parts.push(`Step ${record.cadenceStep}/${record.totalSteps}`)
  }

  // Temperature
  parts.push(record.temperatureBand)

  return parts.join(' • ')
}

// ==========================================
// QUEUE SUMMARY
// ==========================================

export interface QueueSummary {
  totalRecords: number
  workableRecords: number
  overdueCount: number
  dueTodayCount: number
  tasksDueCount: number
  verifyFirstCount: number
  getNumbersCount: number
  upcomingCount: number
  notWorkableCount: number
  temperatureBreakdown: {
    hot: number
    warm: number
    cold: number
    ice: number
  }
}

export function getQueueSummary(
  queue: QueueBuildResult,
  allRecords: QueueRecord[]
): QueueSummary {
  const temperatureBreakdown = {
    hot: 0,
    warm: 0,
    cold: 0,
    ice: 0,
  }

  for (const record of allRecords) {
    switch (record.temperatureBand) {
      case 'HOT':
        temperatureBreakdown.hot++
        break
      case 'WARM':
        temperatureBreakdown.warm++
        break
      case 'COLD':
        temperatureBreakdown.cold++
        break
      case 'ICE':
        temperatureBreakdown.ice++
        break
    }
  }

  return {
    totalRecords: allRecords.length,
    workableRecords: queue.totalWorkable,
    overdueCount: queue.counts.OVERDUE,
    dueTodayCount: queue.counts.DUE_TODAY,
    tasksDueCount: queue.counts.TASKS_DUE,
    verifyFirstCount: queue.counts.VERIFY_FIRST,
    getNumbersCount: queue.counts.GET_NUMBERS,
    upcomingCount: queue.counts.UPCOMING,
    notWorkableCount: queue.counts.NOT_WORKABLE,
    temperatureBreakdown,
  }
}

// ==========================================
// FILTER QUEUE BY SECTION
// ==========================================

export function getRecordsBySection(
  queue: QueueBuildResult,
  section: QueueSection,
  offset: number = 0,
  limit: number = 50
): {
  records: QueueRecord[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
} {
  const sectionRecords = queue.sections[section]
  const records = sectionRecords.slice(offset, offset + limit)

  return {
    records,
    total: sectionRecords.length,
    offset,
    limit,
    hasMore: offset + limit < sectionRecords.length,
  }
}

// ==========================================
// SKIP RECORD IN QUEUE
// ==========================================

export function skipToNextRecord(
  queue: QueueBuildResult,
  currentRecordId: string
): NextUpResult {
  // Find current record and get next one
  const sectionOrder: QueueSection[] = [
    'OVERDUE',
    'DUE_TODAY',
    'TASKS_DUE',
    'VERIFY_FIRST',
    'GET_NUMBERS',
    'UPCOMING',
  ]

  let foundCurrent = false

  for (const section of sectionOrder) {
    const records = queue.sections[section]
    
    for (let i = 0; i < records.length; i++) {
      if (foundCurrent) {
        // Return this record as next
        return {
          record: records[i],
          section,
          position: i + 1,
          totalInSection: records.length,
          reason: QUEUE_SECTION_INFO[section].label,
        }
      }
      
      if (records[i].id === currentRecordId) {
        foundCurrent = true
        // Check if there's a next record in this section
        if (i + 1 < records.length) {
          return {
            record: records[i + 1],
            section,
            position: i + 2,
            totalInSection: records.length,
            reason: QUEUE_SECTION_INFO[section].label,
          }
        }
      }
    }
  }

  // No more records
  return {
    record: null,
    section: null,
    position: 0,
    totalInSection: 0,
    reason: 'No more records in queue',
  }
}
