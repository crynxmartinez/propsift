/**
 * LCE v4.0 Constants
 * Lead Cadence Engine - Configuration Constants
 */

import type { CadenceType, CadenceStepDef, ActionType, ResultType, CallOutcome } from './types'

// ==========================================
// CADENCE TEMPLATES
// ==========================================

export const CADENCE_TEMPLATES: Record<CadenceType, CadenceStepDef[]> = {
  HOT: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 1, actionType: 'CALL', description: 'Quick follow-up' },
    { stepNumber: 3, dayOffset: 2, actionType: 'SMS', description: 'Text message' },
    { stepNumber: 4, dayOffset: 4, actionType: 'CALL', description: 'Persistence call' },
    { stepNumber: 5, dayOffset: 6, actionType: 'RVM', description: 'Ringless voicemail' },
    { stepNumber: 6, dayOffset: 9, actionType: 'CALL', description: 'Re-attempt call' },
    { stepNumber: 7, dayOffset: 14, actionType: 'CALL', description: 'Final attempt' },
  ],
  WARM: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 3, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 7, actionType: 'SMS', description: 'Check-in text' },
    { stepNumber: 4, dayOffset: 14, actionType: 'CALL', description: 'Re-engage call' },
    { stepNumber: 5, dayOffset: 21, actionType: 'CALL', description: 'Final attempt' },
  ],
  COLD: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 14, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 45, actionType: 'CALL', description: 'Final attempt' },
  ],
  ICE: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
    { stepNumber: 2, dayOffset: 90, actionType: 'CALL', description: 'Check back' },
  ],
  GENTLE: [
    { stepNumber: 1, dayOffset: 0, actionType: 'SMS', description: 'Soft check-in' },
    { stepNumber: 2, dayOffset: 7, actionType: 'CALL', description: 'Follow-up call' },
    { stepNumber: 3, dayOffset: 21, actionType: 'CALL', description: 'Re-engagement call' },
    { stepNumber: 4, dayOffset: 45, actionType: 'CALL', description: 'Final re-engagement' },
  ],
  ANNUAL: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Annual check-in' },
  ],
  BLITZ: [
    { stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Day 1 - First call' },
    { stepNumber: 2, dayOffset: 1, actionType: 'CALL', description: 'Day 2 - Follow-up' },
    { stepNumber: 3, dayOffset: 2, actionType: 'CALL', description: 'Day 3 - Final blitz' },
  ],
}

// ==========================================
// RESULT TYPE MAPPING
// ==========================================

export const RESULT_TYPE_MAP: Record<string, ResultType> = {
  // NO_CONTACT - No human interaction
  'No Answer': 'NO_CONTACT',
  'Voicemail': 'NO_CONTACT',
  'Left Message': 'NO_CONTACT',
  'Left Voicemail': 'NO_CONTACT',
  
  // RETRY - Try again soon
  'Busy': 'RETRY',
  'Call Back': 'RETRY',
  'Callback': 'RETRY',
  
  // CONTACT_MADE - Human answered
  'Answered': 'CONTACT_MADE',
  'Answered - Interested': 'CONTACT_MADE',
  'Answered - Callback': 'CONTACT_MADE',
  'Answered - Not Now': 'CONTACT_MADE',
  'Answered - Neutral': 'CONTACT_MADE',
  'Answered - Not Interested': 'CONTACT_MADE',
  'Contacted': 'CONTACT_MADE',
  
  // BAD_DATA - Phone issue
  'Wrong Number': 'BAD_DATA',
  'Disconnected': 'BAD_DATA',
  'Invalid Number': 'BAD_DATA',
  'Not In Service': 'BAD_DATA',
  
  // TERMINAL - Stop calling
  'DNC': 'TERMINAL',
  'Do Not Call': 'TERMINAL',
  'Not Interested': 'TERMINAL',
  'Deceased': 'TERMINAL',
  'Dead': 'TERMINAL',
}

// ==========================================
// CALL OUTCOME MAPPING
// ==========================================

export const CALL_RESULT_TO_OUTCOME: Record<string, CallOutcome> = {
  // Positive outcomes
  'Answered - Interested': 'ANSWERED_INTERESTED',
  'Interested': 'ANSWERED_INTERESTED',
  'Hot Lead': 'ANSWERED_INTERESTED',
  
  'Answered - Callback': 'ANSWERED_CALLBACK',
  'Callback': 'ANSWERED_CALLBACK',
  'Call Back': 'ANSWERED_CALLBACK',
  'Schedule Callback': 'ANSWERED_CALLBACK',
  
  'Answered - Neutral': 'ANSWERED_NEUTRAL',
  'Answered': 'ANSWERED_NEUTRAL',
  'Contacted': 'ANSWERED_NEUTRAL',
  
  'Answered - Not Now': 'ANSWERED_NOT_NOW',
  'Not Now': 'ANSWERED_NOT_NOW',
  'Not Ready': 'ANSWERED_NOT_NOW',
  
  'Answered - Not Interested': 'ANSWERED_NOT_INTERESTED',
  'Not Interested': 'ANSWERED_NOT_INTERESTED',
  
  'DNC': 'ANSWERED_DNC',
  'Do Not Call': 'ANSWERED_DNC',
  'Answered - DNC': 'ANSWERED_DNC',
  
  // No contact outcomes
  'Voicemail': 'VOICEMAIL',
  'Left Voicemail': 'VOICEMAIL',
  'Left Message': 'VOICEMAIL',
  
  'No Answer': 'NO_ANSWER',
  'No Response': 'NO_ANSWER',
  
  'Busy': 'BUSY',
  'Line Busy': 'BUSY',
  
  // Bad data outcomes
  'Wrong Number': 'WRONG_NUMBER',
  'Wrong #': 'WRONG_NUMBER',
  
  'Disconnected': 'DISCONNECTED',
  'Not In Service': 'DISCONNECTED',
  'Invalid Number': 'DISCONNECTED',
}

// ==========================================
// OUTCOME CONFIGURATION
// ==========================================

export const OUTCOME_CONFIG: Record<CallOutcome, {
  isContact: boolean
  scoreChange: number
  nextFollowUpDays: number | null
  resultType: ResultType
}> = {
  ANSWERED_INTERESTED: {
    isContact: true,
    scoreChange: 30,
    nextFollowUpDays: 1,
    resultType: 'CONTACT_MADE',
  },
  ANSWERED_CALLBACK: {
    isContact: true,
    scoreChange: 25,
    nextFollowUpDays: null, // Use callback date
    resultType: 'CONTACT_MADE',
  },
  ANSWERED_NEUTRAL: {
    isContact: true,
    scoreChange: 10,
    nextFollowUpDays: 3,
    resultType: 'CONTACT_MADE',
  },
  ANSWERED_NOT_NOW: {
    isContact: true,
    scoreChange: -5,
    nextFollowUpDays: 14,
    resultType: 'CONTACT_MADE',
  },
  ANSWERED_NOT_INTERESTED: {
    isContact: true,
    scoreChange: -20,
    nextFollowUpDays: 90,
    resultType: 'CONTACT_MADE',
  },
  ANSWERED_DNC: {
    isContact: true,
    scoreChange: -100,
    nextFollowUpDays: null,
    resultType: 'TERMINAL',
  },
  VOICEMAIL: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null,
    resultType: 'NO_CONTACT',
  },
  NO_ANSWER: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null,
    resultType: 'NO_CONTACT',
  },
  BUSY: {
    isContact: false,
    scoreChange: 0,
    nextFollowUpDays: null,
    resultType: 'RETRY',
  },
  WRONG_NUMBER: {
    isContact: false,
    scoreChange: -15,
    nextFollowUpDays: null,
    resultType: 'BAD_DATA',
  },
  DISCONNECTED: {
    isContact: false,
    scoreChange: -20,
    nextFollowUpDays: null,
    resultType: 'BAD_DATA',
  },
  DNC: {
    isContact: false,
    scoreChange: -100,
    nextFollowUpDays: null,
    resultType: 'TERMINAL',
  },
}

// ==========================================
// PHONE PRIORITY
// ==========================================

export const PHONE_TYPE_PRIORITY: Record<string, number> = {
  'MOBILE': 1,
  'CELL': 1,
  'WIRELESS': 1,
  'LANDLINE': 2,
  'HOME': 2,
  'WORK': 3,
  'OFFICE': 3,
  'FAX': 4,
  'OTHER': 5,
}

export const PHONE_STATUS_PRIORITY: Record<string, number> = {
  'VALID': 1,
  'UNVERIFIED': 2,
  'WRONG': 99,
  'DISCONNECTED': 99,
  'DNC': 99,
}

// ==========================================
// BUCKET MAPPING
// ==========================================

export const TIER_TO_BUCKET: Record<number, string> = {
  1: 'call-now',
  2: 'call-now',
  3: 'call-now',
  4: 'follow-up-today',
  5: 'follow-up-today',
  6: 'call-queue',
  7: 'verify-first',
  8: 'get-numbers',
  9: 'nurture',
}

// ==========================================
// SNOOZE OPTIONS (in hours)
// ==========================================

export const SNOOZE_OPTIONS = {
  '1_HOUR': 1,
  'TOMORROW': 24,
  '3_DAYS': 72,
  '1_WEEK': 168,
}

// ==========================================
// PHASE CONFIGURATION
// ==========================================

export const PHASE_CONFIG: Record<string, {
  maxAttempts: number
  nextPhase: string
  description: string
}> = {
  NEW: {
    maxAttempts: 0,
    nextPhase: 'BLITZ_1',
    description: 'New lead, call today',
  },
  BLITZ_1: {
    maxAttempts: 3,
    nextPhase: 'DEEP_PROSPECT',
    description: 'Initial blitz: 3 daily calls',
  },
  DEEP_PROSPECT: {
    maxAttempts: 0,
    nextPhase: 'BLITZ_2',
    description: 'Needs new contact info',
  },
  BLITZ_2: {
    maxAttempts: 2,
    nextPhase: 'TEMPERATURE',
    description: 'Second blitz with new numbers',
  },
  TEMPERATURE: {
    maxAttempts: Infinity,
    nextPhase: 'COMPLETED',
    description: 'Temperature-based cadence',
  },
  COMPLETED: {
    maxAttempts: 0,
    nextPhase: 'TEMPERATURE',
    description: 'Awaiting re-enrollment',
  },
  ENGAGED: {
    maxAttempts: 0,
    nextPhase: 'ENGAGED',
    description: 'Contact made, user-driven',
  },
  NURTURE: {
    maxAttempts: Infinity,
    nextPhase: 'NURTURE',
    description: 'Long-term follow-up',
  },
}
