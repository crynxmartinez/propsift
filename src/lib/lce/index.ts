/**
 * LCE v2.3.1 - Lead Cadence Engine
 * Main export file
 */

// Types
export * from './types'

// Scoring
export {
  calculatePriorityScore,
  getReasonString,
  getNextActionSuggestion,
  getImprovementTip,
} from './scoring'

// State Machine
export {
  VALID_TRANSITIONS,
  STATE_PROPERTIES,
  isValidTransition,
  getValidTransitionsFrom,
  getStateFromOutcome,
  getCadenceTypeFromTemperature,
  getExitReasonFromState,
  validateState,
  canReEnroll,
  NEVER_RE_ENROLL_STATES,
} from './state-machine'

// Cadence Tracker
export {
  CADENCE_TEMPLATES,
  enrollInCadence,
  advanceCadence,
  exitCadence,
  snoozeRecord,
  unsnoozeRecord,
  pauseRecord,
  resumeRecord,
  applyCallbackOverride,
  getCurrentStepInfo,
  getTotalSteps,
  getCadenceTotalDays,
} from './cadence'

// Call Handler
export {
  createCallAttempt,
  logOutcome,
  shouldAutoLogOutcome,
  createAutoLoggedOutcome,
  isPositiveOutcome,
  isNegativeOutcome,
  requiresComplianceLog,
  calculateNewEngagementScore,
  calculateNewNoResponseStreak,
  OUTCOME_DISPLAY_NAMES,
  getOutcomeDisplayName,
} from './call-handler'

// Phone Rotation
export {
  sortPhonesByPriority,
  getNextPhoneToCall,
  getPhoneStatusUpdate,
  isPhoneCallable,
  hasCallablePhone,
  countCallablePhones,
  areAllPhonesExhausted,
  getPhoneSummary,
  updatePhoneAfterCall,
  markPhoneAsPrimary,
} from './phone-rotation'

// Re-Enrollment Engine
export {
  checkReEnrollmentEligibility,
  calculateReEnrollmentDate,
  executeReEnrollment,
  isStaleEngaged,
  checkWakeUpEligibility,
  getReEnrollmentSummary,
  getRecordsReadyForReEnrollment,
} from './reenrollment'

// Workability Gate
export {
  checkWorkability,
  checkCommsAvailability,
  getActionFallback,
  assignToQueueSection,
  QUEUE_SECTION_INFO,
} from './workability'

// Queue Builder
export {
  buildQueue,
  getNextUp,
  throttleSection,
  throttleQueue,
  generateReasonString,
  getQueueSummary,
  getRecordsBySection,
  skipToNextRecord,
} from './queue-builder'

// Daily Reconciliation
export {
  runReconciliationChecks,
  calculateHealthMetrics,
  createReconciliationRun,
  completeReconciliationRun,
  failReconciliationRun,
  sortIssuesByPriority,
  checkOrphanActive,
  checkStaleSnooze,
  checkStalePause,
  checkMissingNextAction,
  checkInvalidStateData,
  checkStuckEngaged,
  checkOverdueReEnrollment,
  checkScoreStale,
} from './reconciliation'

// Service (Database Integration)
export {
  scoreRecord,
  enrollRecordInCadence,
  logCall,
  snoozeRecord as snoozeRecordService,
  pauseRecord as pauseRecordService,
  resumeRecord as resumeRecordService,
  getQueue,
  getNextUp as getNextUpService,
} from './service'
