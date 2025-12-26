/**
 * DockInsight 2.2.2 Dimension Registry
 * 
 * Defines groupable dimensions for analytics charts.
 * 
 * Key concepts:
 * - `groupByMode`: 'direct' for scalar fields, 'junction_required' for many-to-many
 * - `junctionEntity`: Required for junction_required mode - the entity to query
 * - `entities`: Which entities support this dimension
 */

import type { DimensionDefinition } from './types'

export const DIMENSION_REGISTRY: Record<string, DimensionDefinition> = {
  // ==========================================================================
  // RECORD DIMENSIONS (direct groupBy)
  // ==========================================================================

  status: {
    key: 'status',
    label: 'Status',
    field: 'statusId',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    relationConfig: {
      targetTable: 'status',
      labelField: 'name',
      colorField: 'color'
    }
  },

  temperature: {
    key: 'temperature',
    label: 'Temperature',
    field: 'temperature',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    enumValues: [
      { value: 'hot', label: 'Hot', color: '#ef4444' },
      { value: 'warm', label: 'Warm', color: '#f97316' },
      { value: 'cold', label: 'Cold', color: '#3b82f6' }
    ]
  },

  assignedTo: {
    key: 'assignedTo',
    label: 'Assigned To',
    field: 'assignedToId',
    entities: ['records', 'tasks'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    relationConfig: {
      targetTable: 'user',
      labelField: 'name'
    }
  },

  isComplete: {
    key: 'isComplete',
    label: 'Completion Status',
    field: 'isComplete',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq'],
    enumValues: [
      { value: 'true', label: 'Complete', color: '#22c55e' },
      { value: 'false', label: 'Incomplete', color: '#6b7280' }
    ]
  },

  isContact: {
    key: 'isContact',
    label: 'Contact Status',
    field: 'isContact',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq'],
    enumValues: [
      { value: 'true', label: 'Contact', color: '#22c55e' },
      { value: 'false', label: 'Not Contact', color: '#6b7280' }
    ]
  },

  state: {
    key: 'state',
    label: 'State',
    field: 'propertyState',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in', 'is_empty', 'is_not_empty']
  },

  city: {
    key: 'city',
    label: 'City',
    field: 'propertyCity',
    entities: ['records'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in', 'is_empty', 'is_not_empty']
  },

  // ==========================================================================
  // JUNCTION DIMENSIONS (junction_required groupBy)
  // v2.2.2 FIX: These MUST use junction entities for Prisma compatibility
  // ==========================================================================

  tag: {
    key: 'tag',
    label: 'Tag',
    field: 'tagId',
    entities: ['record_tags'],  // MUST query record_tags, not records
    groupByMode: 'junction_required',
    junctionEntity: 'record_tags',
    supportedOperators: ['eq', 'neq', 'in', 'not_in'],
    relationConfig: {
      targetTable: 'tag',
      labelField: 'name'
    }
  },

  motivation: {
    key: 'motivation',
    label: 'Motivation',
    field: 'motivationId',
    entities: ['record_motivations'],  // MUST query record_motivations, not records
    groupByMode: 'junction_required',
    junctionEntity: 'record_motivations',
    supportedOperators: ['eq', 'neq', 'in', 'not_in'],
    relationConfig: {
      targetTable: 'motivation',
      labelField: 'name'
    }
  },

  // ==========================================================================
  // TASK DIMENSIONS
  // ==========================================================================

  taskStatus: {
    key: 'taskStatus',
    label: 'Task Status',
    field: 'status',
    entities: ['tasks'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in'],
    enumValues: [
      { value: 'PENDING', label: 'Pending', color: '#6b7280' },
      { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
      { value: 'COMPLETED', label: 'Completed', color: '#22c55e' },
      { value: 'CANCELLED', label: 'Cancelled', color: '#ef4444' }
    ]
  },

  priority: {
    key: 'priority',
    label: 'Priority',
    field: 'priority',
    entities: ['tasks'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in'],
    enumValues: [
      { value: 'LOW', label: 'Low', color: '#6b7280' },
      { value: 'MEDIUM', label: 'Medium', color: '#f97316' },
      { value: 'HIGH', label: 'High', color: '#ef4444' }
    ]
  },

  // ==========================================================================
  // PHONE DIMENSIONS
  // ==========================================================================

  phoneType: {
    key: 'phoneType',
    label: 'Phone Type',
    field: 'type',
    entities: ['phones'],
    groupByMode: 'direct',
    supportedOperators: ['eq', 'neq', 'in', 'not_in'],
    enumValues: [
      { value: 'MOBILE', label: 'Mobile', color: '#22c55e' },
      { value: 'LANDLINE', label: 'Landline', color: '#3b82f6' },
      { value: 'VOIP', label: 'VoIP', color: '#8b5cf6' }
    ]
  },

  // ==========================================================================
  // DATE DIMENSIONS (available on all entities with createdAt)
  // ==========================================================================

  day: {
    key: 'day',
    label: 'Day',
    field: 'createdAt',
    entities: ['*'],
    groupByMode: 'direct',
    supportedOperators: ['between'],
    dateBuckets: ['day']
  },

  week: {
    key: 'week',
    label: 'Week',
    field: 'createdAt',
    entities: ['*'],
    groupByMode: 'direct',
    supportedOperators: ['between'],
    dateBuckets: ['week']
  },

  month: {
    key: 'month',
    label: 'Month',
    field: 'createdAt',
    entities: ['*'],
    groupByMode: 'direct',
    supportedOperators: ['between'],
    dateBuckets: ['month']
  },

  quarter: {
    key: 'quarter',
    label: 'Quarter',
    field: 'createdAt',
    entities: ['*'],
    groupByMode: 'direct',
    supportedOperators: ['between'],
    dateBuckets: ['quarter']
  },

  year: {
    key: 'year',
    label: 'Year',
    field: 'createdAt',
    entities: ['*'],
    groupByMode: 'direct',
    supportedOperators: ['between'],
    dateBuckets: ['year']
  }
}

/**
 * Get dimension definition by key
 */
export function getDimension(key: string): DimensionDefinition | undefined {
  return DIMENSION_REGISTRY[key]
}

/**
 * Get dimensions available for a specific entity
 */
export function getDimensionsForEntity(entityKey: string): DimensionDefinition[] {
  return Object.values(DIMENSION_REGISTRY).filter(d => 
    (d.entities as string[]).includes('*') || (d.entities as string[]).includes(entityKey)
  )
}

/**
 * Get all dimension keys
 */
export function getDimensionKeys(): string[] {
  return Object.keys(DIMENSION_REGISTRY)
}

/**
 * Check if dimension requires junction entity
 */
export function requiresJunctionEntity(dimensionKey: string): boolean {
  const dim = getDimension(dimensionKey)
  return dim?.groupByMode === 'junction_required'
}
