/**
 * LCE v3.0 - Lead Cadence Engine (First-to-Market)
 * Main export file
 */

// Types
export * from './types'

// First-to-Market Engine (v3.0)
export {
  PHASE_CONFIG,
  OUTCOME_CONFIG,
  calculatePhaseTransition,
  enrollNewLead,
  handleNewPhoneAdded,
  calculateQueuePriority,
  type LCEPhase,
  type CallOutcome,
  type PhaseTransitionResult,
  type EnrollmentResult,
  type QueuePriority,
} from './first-to-market'

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

// Auto-Enrollment (v3.0)
export {
  autoEnrollRecord,
  handlePhoneAdded,
  bulkAutoEnroll,
} from './auto-enroll'

// Call Outcome Handler (v3.0)
export {
  processCallOutcome,
  mapCallResultToOutcome,
  type CallOutcomeResult,
} from './call-outcome-handler'
