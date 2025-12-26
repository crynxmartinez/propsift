/**
 * DockInsight 2.2.2 Counter Types
 * 
 * Type definitions for the counter system.
 */

/**
 * Counter fields on Record model
 */
export interface RecordCounters {
  phoneCount: number
  emailCount: number
  tagCount: number
  motivationCount: number
}

/**
 * Counter update operation
 */
export type CounterOperation = 'increment' | 'decrement' | 'set'

/**
 * Counter update request
 */
export interface CounterUpdate {
  recordId: string
  field: keyof RecordCounters
  operation: CounterOperation
  value?: number
}

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  recordId: string
  field: keyof RecordCounters
  expected: number
  actual: number
  fixed: boolean
}
