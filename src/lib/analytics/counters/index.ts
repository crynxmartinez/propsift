/**
 * DockInsight 2.2.2 Counter System
 * 
 * Central export for counter management.
 */

// Types
export type { RecordCounters, CounterOperation, CounterUpdate, ReconciliationResult } from './types'

// Service functions
export {
  createRecordTagWithCounter,
  deleteRecordTagWithCounter,
  createRecordMotivationWithCounter,
  deleteRecordMotivationWithCounter,
  createPhoneWithCounter,
  deletePhoneWithCounter,
  createEmailWithCounter,
  deleteEmailWithCounter,
  bulkDeleteRecordTagsWithCounter,
  bulkCreateRecordTagsWithCounter
} from './service'

// Reconciliation
export {
  reconcileRecord,
  reconcileTenant,
  reconcileRecentlyModified
} from './reconciliation'
