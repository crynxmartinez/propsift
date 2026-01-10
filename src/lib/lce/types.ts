/**
 * LCE v2.3.1 Type Definitions
 * Lead Cadence Engine - Core Types
 */

// ==========================================
// SCORE TYPES
// ==========================================

export interface ScoreBreakdown {
  motivationScore: number
  contactRecency: number
  engagementScore: number
  fatiguePenalty: number
  negativePenalty: number
  taskUrgency: number
  leadAgeRescue: number
  dataQuality: number
  statusModifier: number
  confidenceLevel: number
}

export interface ScoreResult {
  priorityScore: number
  scoreBreakdown: ScoreBreakdown
  scoreVersion: string
  temperatureBand: TemperatureBand
  confidenceLevel: ConfidenceLevel
  reasons: ScoreReason[]
}

export interface ScoreReason {
  component: string
  points: number
  description: string
}

// ==========================================
// ENUMS
// ==========================================

export type TemperatureBand = 'HOT' | 'WARM' | 'COLD' | 'ICE'

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export type CadenceState = 
  | 'NOT_ENROLLED'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'PAUSED'
  | 'COMPLETED_NO_CONTACT'
  | 'EXITED_ENGAGED'
  | 'EXITED_DNC'
  | 'EXITED_DEAD'
  | 'EXITED_CLOSED'
  | 'STALE_ENGAGED'
  | 'LONG_TERM_NURTURE'

export type CadenceType = 'HOT' | 'WARM' | 'COLD' | 'ICE' | 'GENTLE' | 'ANNUAL'

export type ActionType = 'CALL' | 'SMS' | 'RVM' | 'EMAIL'

export type PhoneStatus = 'VALID' | 'UNVERIFIED' | 'WRONG' | 'DISCONNECTED' | 'DNC'

export type CallOutcome = 
  | 'ANSWERED_INTERESTED'
  | 'ANSWERED_CALLBACK'
  | 'ANSWERED_NEUTRAL'
  | 'ANSWERED_NOT_NOW'
  | 'ANSWERED_NOT_INTERESTED'
  | 'ANSWERED_DNC'
  | 'VOICEMAIL'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'WRONG_NUMBER'
  | 'DISCONNECTED'
  | 'DNC'

// ==========================================
// MOTIVATION TYPES
// ==========================================

export type MotivationTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface MotivationConfig {
  name: string
  tier: MotivationTier
  basePoints: number
}

// Default motivation configurations
export const MOTIVATION_TIERS: Record<MotivationTier, number> = {
  CRITICAL: 12,
  HIGH: 10,
  MEDIUM: 7,
  LOW: 4,
}

// Motivation name to tier mapping (can be customized per account)
export const DEFAULT_MOTIVATION_TIERS: Record<string, MotivationTier> = {
  // Critical
  'Foreclosure': 'CRITICAL',
  'Tax Lien': 'CRITICAL',
  'Code Violation': 'CRITICAL',
  'Bankruptcy': 'CRITICAL',
  // High
  'Probate': 'HIGH',
  'Divorce': 'HIGH',
  'Pre-Foreclosure': 'HIGH',
  'Liens': 'HIGH',
  'Judgment': 'HIGH',
  // Medium
  'Vacant': 'MEDIUM',
  'Tired Landlord': 'MEDIUM',
  'Out of State Owner': 'MEDIUM',
  'High Equity': 'MEDIUM',
  'Failed Listing': 'MEDIUM',
  // Low
  'Free & Clear': 'LOW',
  'Long Ownership': 'LOW',
  'Absentee': 'LOW',
  'Senior Owner': 'LOW',
}

// Synergy bonus combinations
export const SYNERGY_BONUSES: Array<{ motivations: [string, string]; bonus: number }> = [
  { motivations: ['Foreclosure', 'Vacant'], bonus: 5 },
  { motivations: ['Probate', 'Out of State Owner'], bonus: 4 },
  { motivations: ['Tax Lien', 'High Equity'], bonus: 4 },
  { motivations: ['Divorce', 'Tired Landlord'], bonus: 3 },
  { motivations: ['Code Violation', 'Vacant'], bonus: 3 },
]

// ==========================================
// STATUS CATEGORY MAPPING
// ==========================================

export type StatusCategory = 
  | 'NEGOTIATING'
  | 'HOT_LEAD'
  | 'INTERESTED'
  | 'NEW'
  | 'NEUTRAL'
  | 'NURTURE'
  | 'LONG_TERM'
  | 'NOT_WORKABLE'

export const STATUS_CATEGORY_POINTS: Record<StatusCategory, number> = {
  NEGOTIATING: 10,
  HOT_LEAD: 8,
  INTERESTED: 5,
  NEW: 0,
  NEUTRAL: -2,
  NURTURE: -5,
  LONG_TERM: -8,
  NOT_WORKABLE: 0, // Handled by workability gate
}

// Default status name to category mapping
export const DEFAULT_STATUS_CATEGORIES: Record<string, StatusCategory> = {
  'Negotiating': 'NEGOTIATING',
  'In Negotiation': 'NEGOTIATING',
  'Contract Pending': 'NEGOTIATING',
  'Hot Lead': 'HOT_LEAD',
  'Very Interested': 'HOT_LEAD',
  'Contacted - Interested': 'INTERESTED',
  'Interested': 'INTERESTED',
  'New': 'NEW',
  'Fresh': 'NEW',
  'Uncontacted': 'NEW',
  'Contacted': 'NEUTRAL',
  'Left Message': 'NEUTRAL',
  'Contacted - Neutral': 'NEUTRAL',
  'Nurture': 'NURTURE',
  'Not Ready Yet': 'NURTURE',
  'Long-term Follow-up': 'LONG_TERM',
  'Long-term': 'LONG_TERM',
  'Check Back Later': 'LONG_TERM',
  'DNC': 'NOT_WORKABLE',
  'Dead': 'NOT_WORKABLE',
  'Not Interested': 'NOT_WORKABLE',
  'Sold': 'NOT_WORKABLE',
  'Closed': 'NOT_WORKABLE',
}

// ==========================================
// SCORE CONSTANTS
// ==========================================

export const LCE_VERSION = 'LCE_2_3_1'

export const SCORE_THRESHOLDS = {
  HOT: 80,
  WARM: 50,
  COLD: 25,
  ICE: 0,
}

export const LOW_URGENCY_CAP = 9

export const DIMINISHING_RETURNS = [1.0, 1.0, 0.75, 0.5, 0.5, 0.25] // 6th+ = 0.25

// ==========================================
// RE-ENROLLMENT CONSTANTS
// ==========================================

export const RE_ENROLLMENT_BASE_WAIT: Record<TemperatureBand, number> = {
  HOT: 15,
  WARM: 30,
  COLD: 45,
  ICE: 90,
}

export const RE_ENROLLMENT_SCORE_MULTIPLIERS: Array<{ min: number; max: number; multiplier: number }> = [
  { min: 80, max: 100, multiplier: 0.75 },
  { min: 60, max: 79, multiplier: 1.0 },
  { min: 40, max: 59, multiplier: 1.25 },
  { min: 20, max: 39, multiplier: 1.5 },
  { min: 0, max: 19, multiplier: 2.0 },
]

// ==========================================
// RECORD INPUT TYPE (for scoring)
// ==========================================

export interface RecordForScoring {
  id: string
  createdAt: Date
  
  // Contact tracking
  lastContactedAt: Date | null
  hasEngaged: boolean
  callAttempts: number
  
  // Engagement
  engagementScore: number
  noResponseStreak: number
  
  // Data
  temperature: string | null
  statusId: string | null
  statusName?: string | null
  skiptraceDate: Date | null
  
  // Counts
  phoneCount: number
  emailCount: number
  motivationCount: number
  
  // Motivations (names)
  motivations: string[]
  
  // Phone data
  hasValidPhone: boolean
  hasVerifiedPhone: boolean
  hasMultiplePhones: boolean
  hasEmail: boolean
  
  // Tasks
  hasOverdueTask: boolean
  hasDueTodayTask: boolean
  hasDueTomorrowTask: boolean
  hasCallbackTask: boolean
  hasFollowUpTask: boolean
  
  // Callback
  callbackRequestedAt: Date | null
}
