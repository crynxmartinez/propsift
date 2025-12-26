/**
 * DockInsight 2.2.2 Segment Registry
 * 
 * Defines pre-built filter combinations for common use cases.
 * Segments are filter-only (no sort/limit) and apply to specific entities.
 */

import type { SegmentDefinition } from './types'

export const SEGMENT_REGISTRY: Record<string, SegmentDefinition> = {
  // ==========================================================================
  // RECORD SEGMENTS
  // ==========================================================================
  
  'records:all': {
    key: 'records:all',
    label: 'All Records',
    entityKey: 'records',
    category: 'status',
    predicate: []
  },

  'records:complete': {
    key: 'records:complete',
    label: 'Complete Records',
    entityKey: 'records',
    category: 'status',
    predicate: [
      { field: 'isComplete', operator: 'eq', value: true }
    ]
  },

  'records:incomplete': {
    key: 'records:incomplete',
    label: 'Incomplete Records',
    entityKey: 'records',
    category: 'status',
    predicate: [
      { field: 'isComplete', operator: 'eq', value: false }
    ]
  },

  'records:contacts': {
    key: 'records:contacts',
    label: 'Contacts',
    entityKey: 'records',
    category: 'status',
    predicate: [
      { field: 'isContact', operator: 'eq', value: true }
    ]
  },

  'records:hot': {
    key: 'records:hot',
    label: 'Hot Leads',
    entityKey: 'records',
    category: 'temperature',
    predicate: [
      { field: 'temperature', operator: 'eq', value: 'hot' }
    ]
  },

  'records:warm': {
    key: 'records:warm',
    label: 'Warm Leads',
    entityKey: 'records',
    category: 'temperature',
    predicate: [
      { field: 'temperature', operator: 'eq', value: 'warm' }
    ]
  },

  'records:cold': {
    key: 'records:cold',
    label: 'Cold Leads',
    entityKey: 'records',
    category: 'temperature',
    predicate: [
      { field: 'temperature', operator: 'eq', value: 'cold' }
    ]
  },

  'records:unassigned': {
    key: 'records:unassigned',
    label: 'Unassigned Records',
    entityKey: 'records',
    category: 'activity',
    predicate: [
      { field: 'assignedToId', operator: 'is_empty', value: null }
    ]
  },

  'records:with_phone': {
    key: 'records:with_phone',
    label: 'Records with Phone',
    entityKey: 'records',
    category: 'activity',
    predicate: [
      { field: 'phoneCount', operator: 'gt', value: 0 }
    ]
  },

  'records:with_email': {
    key: 'records:with_email',
    label: 'Records with Email',
    entityKey: 'records',
    category: 'activity',
    predicate: [
      { field: 'emailCount', operator: 'gt', value: 0 }
    ]
  },

  'records:with_tags': {
    key: 'records:with_tags',
    label: 'Tagged Records',
    entityKey: 'records',
    category: 'activity',
    predicate: [
      { field: 'tagCount', operator: 'gt', value: 0 }
    ]
  },

  // ==========================================================================
  // TASK SEGMENTS
  // ==========================================================================

  'tasks:all': {
    key: 'tasks:all',
    label: 'All Tasks',
    entityKey: 'tasks',
    category: 'status',
    predicate: []
  },

  'tasks:pending': {
    key: 'tasks:pending',
    label: 'Pending Tasks',
    entityKey: 'tasks',
    category: 'status',
    predicate: [
      { field: 'status', operator: 'eq', value: 'PENDING' }
    ]
  },

  'tasks:in_progress': {
    key: 'tasks:in_progress',
    label: 'In Progress Tasks',
    entityKey: 'tasks',
    category: 'status',
    predicate: [
      { field: 'status', operator: 'eq', value: 'IN_PROGRESS' }
    ]
  },

  'tasks:completed': {
    key: 'tasks:completed',
    label: 'Completed Tasks',
    entityKey: 'tasks',
    category: 'status',
    predicate: [
      { field: 'status', operator: 'eq', value: 'COMPLETED' }
    ]
  },

  'tasks:high_priority': {
    key: 'tasks:high_priority',
    label: 'High Priority Tasks',
    entityKey: 'tasks',
    category: 'status',
    predicate: [
      { field: 'priority', operator: 'eq', value: 'HIGH' }
    ]
  },

  'tasks:overdue': {
    key: 'tasks:overdue',
    label: 'Overdue Tasks',
    entityKey: 'tasks',
    category: 'activity',
    predicate: [
      { field: 'status', operator: 'in', value: ['PENDING', 'IN_PROGRESS'] },
      { field: 'dueDate', operator: 'lt', value: '$now' }  // Special value resolved at compile time
    ]
  }
}

/**
 * Get segment definition by key
 */
export function getSegment(key: string): SegmentDefinition | undefined {
  return SEGMENT_REGISTRY[key]
}

/**
 * Get segments for a specific entity
 */
export function getSegmentsForEntity(entityKey: string): SegmentDefinition[] {
  return Object.values(SEGMENT_REGISTRY).filter(s => s.entityKey === entityKey)
}

/**
 * Get all segment keys
 */
export function getSegmentKeys(): string[] {
  return Object.keys(SEGMENT_REGISTRY)
}
