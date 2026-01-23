/**
 * LCE v4.0 - Lead Cadence Engine (Unified)
 * Main export file
 * 
 * Combines the best of:
 * - v2.3.1 Temperature Cadences
 * - v3.0 First-to-Market Blitz Phases
 * - v2.4 Result Type Handler
 */

// Types
export * from './types'

// Constants
export {
  CADENCE_TEMPLATES,
  RESULT_TYPE_MAP,
  CALL_RESULT_TO_OUTCOME,
  OUTCOME_CONFIG,
  PHONE_TYPE_PRIORITY,
  PHONE_STATUS_PRIORITY,
  TIER_TO_BUCKET,
  SNOOZE_OPTIONS,
  PHASE_CONFIG,
} from './constants'

// Phase Manager
export {
  enrollNewLead,
  calculatePhaseTransition,
  handleNewPhoneAdded,
  reEnrollIntoTemperature,
  getTotalSteps,
  getCadenceProgress,
  isPhaseCallable,
  type EnrollmentResult,
} from './phase-manager'

// Queue Manager
export {
  assignQueueTier,
  assignQueueBucket,
  buildQueue,
  filterQueueByBucket,
  filterQueueByTier,
  getQueueCounts,
  getTierBreakdown,
  getBucketTierBreakdown,
  getNextUp,
  getNextUpInBucket,
  sortByPriority,
  type QueueRecord,
  type QueueCounts,
  type TierBreakdown,
} from './queue-manager'

// Phone Manager
export {
  sortPhonesByPriority,
  getNextPhoneToCall,
  getPhoneStatusUpdate,
  updatePhoneAfterCall,
  isPhoneCallable,
  hasCallablePhone,
  countCallablePhones,
  areAllPhonesExhausted,
  getPhoneSummary,
  shouldMarkPhoneExhausted,
  type NextPhoneResult,
  type PhoneStatusUpdate,
  type PhoneUpdateResult,
  type PhoneSummary,
} from './phone-manager'

// Result Handler
export {
  mapCallResultToResultType,
  mapCallResultToOutcome,
  processCallResult,
  calculateNewEngagementScore,
  calculateNewNoResponseStreak,
  shouldPromptForStatus,
  getFollowUpDays,
  type ProcessCallResultInput,
  type ProcessCallResultOutput,
} from './result-handler'

// Main Engine
export {
  processAction,
  enrollRecord,
  reEnrollRecord,
  handlePhoneAdded,
  getRecordLCEStatus,
  calculateReEnrollmentDate,
  isStaleEngaged,
  LCE_VERSION,
  type ActionType_Input,
  type ProcessActionInput,
  type ProcessActionOutput,
} from './engine'
