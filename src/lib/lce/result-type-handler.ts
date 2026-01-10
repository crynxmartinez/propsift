/**
 * LCE v2.4 Result Type Handler
 * 
 * This module handles call result processing based on the new resultType field.
 * It maps user-defined CallResult records to cadence behaviors.
 * 
 * Result Types:
 * - NO_CONTACT: Advance cadence step (No Answer, Voicemail, Left Message)
 * - RETRY: Stay on same step, retry tomorrow (Busy)
 * - CONTACT_MADE: Prompt for status selection (Answered)
 * - BAD_DATA: Mark phone bad, move to Get Numbers (Wrong Number, Disconnected)
 * - TERMINAL: Exit permanently (DNC Requested)
 */

import {
  CadenceState,
  CadenceType,
  TemperatureBand,
} from './types'

import {
  advanceCadence,
  exitCadence,
  enrollInCadence,
} from './cadence'

// ==========================================
// RESULT TYPE DEFINITIONS
// ==========================================

export type ResultType = 'NO_CONTACT' | 'RETRY' | 'CONTACT_MADE' | 'BAD_DATA' | 'TERMINAL'

export type Workability = 'WORKABLE' | 'PAUSED' | 'CLOSED_WON' | 'CLOSED_LOST' | 'DNC'

export type TemperatureEffect = 'UPGRADE' | 'DOWNGRADE' | null

// ==========================================
// RESULT TYPE PROCESSING
// ==========================================

export interface ResultTypeProcessingInput {
  recordId: string
  resultType: ResultType
  
  // Current cadence state
  cadenceState: CadenceState | null
  cadenceType: CadenceType | null
  cadenceStep: number | null
  cadenceStartDate: Date | null
  temperature: TemperatureBand
  enrollmentCount: number
  
  // Phone info
  phoneId: string | null
}

export interface ResultTypeProcessingOutput {
  // Cadence changes
  newCadenceState: CadenceState | null
  newCadenceStep: number | null
  newCadenceType: CadenceType | null
  newCadenceStartDate: Date | null
  nextActionDue: Date | null
  nextActionType: string | null
  newEnrollmentCount: number
  
  // Temperature changes
  newTemperature: TemperatureBand | null
  
  // Phone changes
  markPhoneBad: boolean
  moveToGetNumbers: boolean
  
  // Exit info
  cadenceExitDate: Date | null
  cadenceExitReason: string | null
  
  // Flags
  promptForStatus: boolean
  exitPermanently: boolean
}

export function processResultType(input: ResultTypeProcessingInput): ResultTypeProcessingOutput {
  const output: ResultTypeProcessingOutput = {
    newCadenceState: null,
    newCadenceStep: null,
    newCadenceType: null,
    newCadenceStartDate: null,
    nextActionDue: null,
    nextActionType: null,
    newEnrollmentCount: input.enrollmentCount,
    newTemperature: null,
    markPhoneBad: false,
    moveToGetNumbers: false,
    cadenceExitDate: null,
    cadenceExitReason: null,
    promptForStatus: false,
    exitPermanently: false,
  }

  switch (input.resultType) {
    case 'NO_CONTACT':
      // Advance to next cadence step
      if (input.cadenceType && input.cadenceStartDate && input.cadenceStep !== null) {
        const advance = advanceCadence(
          input.cadenceType,
          input.cadenceStep,
          input.cadenceStartDate,
          'NO_ANSWER' // Map to existing outcome for cadence logic
        )
        output.newCadenceState = advance.cadenceState
        output.newCadenceStep = advance.cadenceStep
        output.nextActionDue = advance.nextActionDue
        output.nextActionType = advance.nextActionType
        
        if (advance.isCompleted) {
          output.cadenceExitDate = advance.cadenceExitDate
          output.cadenceExitReason = advance.cadenceExitReason
          
          // Handle re-enrollment or temperature downgrade
          handleCadenceCompletion(input, output)
        }
      }
      break

    case 'RETRY':
      // Stay on same step, retry tomorrow
      if (input.cadenceType && input.cadenceStartDate && input.cadenceStep !== null) {
        const advance = advanceCadence(
          input.cadenceType,
          input.cadenceStep,
          input.cadenceStartDate,
          'BUSY' // Map to existing outcome for cadence logic
        )
        output.newCadenceStep = advance.cadenceStep // Same step
        output.nextActionDue = advance.nextActionDue
        output.nextActionType = advance.nextActionType
      }
      break

    case 'CONTACT_MADE':
      // Prompt for status selection - status will determine next steps
      output.promptForStatus = true
      // Don't advance cadence yet - wait for status selection
      break

    case 'BAD_DATA':
      // Mark phone as bad, check for other phones
      output.markPhoneBad = true
      output.moveToGetNumbers = true
      // Pause cadence until new number is found
      output.newCadenceState = 'PAUSED'
      break

    case 'TERMINAL':
      // Exit permanently (DNC)
      output.exitPermanently = true
      output.newCadenceState = 'EXITED_DNC'
      output.cadenceExitDate = new Date()
      output.cadenceExitReason = 'DNC'
      break
  }

  return output
}

// ==========================================
// STATUS PROCESSING (After CONTACT_MADE)
// ==========================================

export interface StatusProcessingInput {
  recordId: string
  workability: Workability
  temperatureEffect: TemperatureEffect
  
  // Current state
  cadenceState: CadenceState | null
  cadenceType: CadenceType | null
  cadenceStep: number | null
  cadenceStartDate: Date | null
  temperature: TemperatureBand
  enrollmentCount: number
  
  // For PAUSED status
  callbackDate?: Date | null
}

export interface StatusProcessingOutput {
  // Cadence changes
  newCadenceState: CadenceState | null
  newCadenceStep: number | null
  newCadenceType: CadenceType | null
  newCadenceStartDate: Date | null
  nextActionDue: Date | null
  nextActionType: string | null
  newEnrollmentCount: number
  
  // Temperature changes
  newTemperature: TemperatureBand | null
  
  // Exit info
  cadenceExitDate: Date | null
  cadenceExitReason: string | null
  
  // Flags
  moveToLTN: boolean
  exitSuccess: boolean
  exitPermanently: boolean
}

export function processStatus(input: StatusProcessingInput): StatusProcessingOutput {
  const output: StatusProcessingOutput = {
    newCadenceState: null,
    newCadenceStep: null,
    newCadenceType: null,
    newCadenceStartDate: null,
    nextActionDue: null,
    nextActionType: null,
    newEnrollmentCount: input.enrollmentCount,
    newTemperature: null,
    cadenceExitDate: null,
    cadenceExitReason: null,
    moveToLTN: false,
    exitSuccess: false,
    exitPermanently: false,
  }

  // First, handle temperature effect
  if (input.temperatureEffect) {
    output.newTemperature = applyTemperatureEffect(input.temperature, input.temperatureEffect)
  }

  // Then handle workability
  switch (input.workability) {
    case 'WORKABLE':
      // Continue or restart cadence based on temperature effect
      if (input.temperatureEffect === 'UPGRADE') {
        // Restart cadence from step 1 with new temperature
        const newTemp = output.newTemperature || input.temperature
        const enrollment = enrollInCadence(newTemp, 0, false)
        output.newCadenceState = enrollment.cadenceState
        output.newCadenceType = enrollment.cadenceType
        output.newCadenceStep = enrollment.cadenceStep
        output.newCadenceStartDate = enrollment.cadenceStartDate
        output.nextActionDue = enrollment.nextActionDue
        output.nextActionType = enrollment.nextActionType
        output.newEnrollmentCount = 1 // Reset enrollment count for new temp
      } else if (input.temperatureEffect === 'DOWNGRADE') {
        // Continue cadence (don't restart) but with new temperature
        // The temperature change will affect future cadence behavior
        if (input.cadenceType && input.cadenceStartDate && input.cadenceStep !== null) {
          const advance = advanceCadence(
            input.cadenceType,
            input.cadenceStep,
            input.cadenceStartDate,
            'ANSWERED_NEUTRAL' // Advance normally
          )
          output.newCadenceState = advance.cadenceState
          output.newCadenceStep = advance.cadenceStep
          output.nextActionDue = advance.nextActionDue
          output.nextActionType = advance.nextActionType
          
          if (advance.isCompleted) {
            // If cadence completed after downgrade, handle completion
            handleStatusCadenceCompletion(input, output)
          }
        }
      } else {
        // No temperature change - just advance cadence normally
        if (input.cadenceType && input.cadenceStartDate && input.cadenceStep !== null) {
          const advance = advanceCadence(
            input.cadenceType,
            input.cadenceStep,
            input.cadenceStartDate,
            'ANSWERED_NEUTRAL'
          )
          output.newCadenceState = advance.cadenceState
          output.newCadenceStep = advance.cadenceStep
          output.nextActionDue = advance.nextActionDue
          output.nextActionType = advance.nextActionType
          
          if (advance.isCompleted) {
            handleStatusCadenceCompletion(input, output)
          }
        }
      }
      break

    case 'PAUSED':
      // Pause cadence until callback date
      output.newCadenceState = 'PAUSED'
      if (input.callbackDate) {
        output.nextActionDue = input.callbackDate
        output.nextActionType = 'CALL'
      }
      break

    case 'CLOSED_WON':
      // Exit cadence - success!
      output.exitSuccess = true
      output.newCadenceState = 'EXITED_ENGAGED'
      output.cadenceExitDate = new Date()
      output.cadenceExitReason = 'CLOSED_WON'
      break

    case 'CLOSED_LOST':
      // Move to Long Term Nurture
      output.moveToLTN = true
      output.newCadenceState = 'LONG_TERM_NURTURE'
      output.newTemperature = 'ICE' // Set to ICE for LTN
      // Enroll in LTN cadence (6 month check-in)
      const ltnEnrollment = enrollInCadence('ICE', 0, false)
      output.newCadenceType = 'ANNUAL' as CadenceType // Use ANNUAL for 6-month check-ins
      output.newCadenceStep = 1
      output.newCadenceStartDate = new Date()
      // Set next action to 6 months from now
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      output.nextActionDue = sixMonthsFromNow
      output.nextActionType = 'CALL'
      break

    case 'DNC':
      // Exit permanently
      output.exitPermanently = true
      output.newCadenceState = 'EXITED_DNC'
      output.cadenceExitDate = new Date()
      output.cadenceExitReason = 'DNC'
      break
  }

  return output
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function applyTemperatureEffect(
  currentTemp: TemperatureBand,
  effect: TemperatureEffect
): TemperatureBand {
  const tempOrder: TemperatureBand[] = ['ICE', 'COLD', 'WARM', 'HOT']
  const currentIndex = tempOrder.indexOf(currentTemp)

  if (effect === 'UPGRADE') {
    // Move up one level (max HOT)
    const newIndex = Math.min(currentIndex + 1, tempOrder.length - 1)
    return tempOrder[newIndex]
  } else if (effect === 'DOWNGRADE') {
    // Move down one level (min ICE)
    const newIndex = Math.max(currentIndex - 1, 0)
    return tempOrder[newIndex]
  }

  return currentTemp
}

function handleCadenceCompletion(
  input: ResultTypeProcessingInput,
  output: ResultTypeProcessingOutput
): void {
  // Check enrollment count for re-enrollment or downgrade
  if (input.enrollmentCount < 2) {
    // Re-enroll in same temperature cadence
    const enrollment = enrollInCadence(input.temperature, input.enrollmentCount, false)
    output.newCadenceState = enrollment.cadenceState
    output.newCadenceType = enrollment.cadenceType
    output.newCadenceStep = enrollment.cadenceStep
    output.newCadenceStartDate = enrollment.cadenceStartDate
    output.nextActionDue = enrollment.nextActionDue
    output.nextActionType = enrollment.nextActionType
    output.newEnrollmentCount = enrollment.enrollmentCount
  } else {
    // Downgrade temperature and re-enroll
    const newTemp = applyTemperatureEffect(input.temperature, 'DOWNGRADE')
    
    if (newTemp === 'ICE' && input.temperature === 'ICE') {
      // Already at ICE and completed 2 cycles - move to LTN
      output.newCadenceState = 'LONG_TERM_NURTURE'
      output.newTemperature = 'ICE'
      // Set next action to 6 months from now
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      output.nextActionDue = sixMonthsFromNow
      output.nextActionType = 'CALL'
    } else {
      // Enroll in new temperature cadence
      const enrollment = enrollInCadence(newTemp, 0, false)
      output.newCadenceState = enrollment.cadenceState
      output.newCadenceType = enrollment.cadenceType
      output.newCadenceStep = enrollment.cadenceStep
      output.newCadenceStartDate = enrollment.cadenceStartDate
      output.nextActionDue = enrollment.nextActionDue
      output.nextActionType = enrollment.nextActionType
      output.newEnrollmentCount = 1 // Reset for new temperature
      output.newTemperature = newTemp
    }
  }
}

function handleStatusCadenceCompletion(
  input: StatusProcessingInput,
  output: StatusProcessingOutput
): void {
  const effectiveTemp = output.newTemperature || input.temperature
  
  // Check enrollment count for re-enrollment or downgrade
  if (input.enrollmentCount < 2) {
    // Re-enroll in same temperature cadence
    const enrollment = enrollInCadence(effectiveTemp, input.enrollmentCount, false)
    output.newCadenceState = enrollment.cadenceState
    output.newCadenceType = enrollment.cadenceType
    output.newCadenceStep = enrollment.cadenceStep
    output.newCadenceStartDate = enrollment.cadenceStartDate
    output.nextActionDue = enrollment.nextActionDue
    output.nextActionType = enrollment.nextActionType
    output.newEnrollmentCount = enrollment.enrollmentCount
  } else {
    // Downgrade temperature and re-enroll
    const newTemp = applyTemperatureEffect(effectiveTemp, 'DOWNGRADE')
    
    if (newTemp === 'ICE' && effectiveTemp === 'ICE') {
      // Already at ICE and completed 2 cycles - move to LTN
      output.moveToLTN = true
      output.newCadenceState = 'LONG_TERM_NURTURE'
      output.newTemperature = 'ICE'
      // Set next action to 6 months from now
      const sixMonthsFromNow = new Date()
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
      output.nextActionDue = sixMonthsFromNow
      output.nextActionType = 'CALL'
    } else {
      // Enroll in new temperature cadence
      const enrollment = enrollInCadence(newTemp, 0, false)
      output.newCadenceState = enrollment.cadenceState
      output.newCadenceType = enrollment.cadenceType
      output.newCadenceStep = enrollment.cadenceStep
      output.newCadenceStartDate = enrollment.cadenceStartDate
      output.nextActionDue = enrollment.nextActionDue
      output.nextActionType = enrollment.nextActionType
      output.newEnrollmentCount = 1 // Reset for new temperature
      output.newTemperature = newTemp
    }
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function getResultTypeFromCallResult(callResult: { resultType?: string }): ResultType {
  const validTypes: ResultType[] = ['NO_CONTACT', 'RETRY', 'CONTACT_MADE', 'BAD_DATA', 'TERMINAL']
  if (callResult.resultType && validTypes.includes(callResult.resultType as ResultType)) {
    return callResult.resultType as ResultType
  }
  return 'NO_CONTACT' // Default
}

export function getWorkabilityFromStatus(status: { workability?: string }): Workability {
  const validTypes: Workability[] = ['WORKABLE', 'PAUSED', 'CLOSED_WON', 'CLOSED_LOST', 'DNC']
  if (status.workability && validTypes.includes(status.workability as Workability)) {
    return status.workability as Workability
  }
  return 'WORKABLE' // Default
}

export function getTemperatureEffectFromStatus(status: { temperatureEffect?: string | null }): TemperatureEffect {
  if (status.temperatureEffect === 'UPGRADE' || status.temperatureEffect === 'DOWNGRADE') {
    return status.temperatureEffect
  }
  return null
}
