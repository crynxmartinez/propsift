/**
 * LCE v4.0 - Lead Cadence Engine
 * Main export file (cleaned up - legacy modules removed)
 */

// First-to-Market Engine (still used by phone-added, records API)
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

// LCE v4.0 Engine (new unified system - use this for all new code)
export * from './v4'
