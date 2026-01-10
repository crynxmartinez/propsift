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
