/**
 * Completeness Check Utility
 * Determines if a record is complete based on business rules
 * 
 * For PERSON (isCompany = false):
 * - Has first name AND last name
 * - Has property address (street)
 * - Has mailing address (street)
 * 
 * For COMPANY (isCompany = true):
 * - Has ownerFullName (company name)
 * - Has property address (street)
 * - Has mailing address (street)
 */

import { getEffectiveCompanyStatus } from './companyDetection';

interface RecordData {
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
  ownerFullName?: string | null;
  isCompany: boolean;
  isCompanyOverride?: boolean | null;
  propertyStreet?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyZip?: string | null;
  mailingStreet?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
}

/**
 * Checks if a string value is present and not empty
 */
function hasValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Checks if all property address fields are complete
 */
export function isPropertyAddressComplete(record: RecordData): boolean {
  return (
    hasValue(record.propertyStreet) &&
    hasValue(record.propertyCity) &&
    hasValue(record.propertyState) &&
    hasValue(record.propertyZip)
  );
}

/**
 * Checks if all mailing address fields are complete
 */
export function isMailingAddressComplete(record: RecordData): boolean {
  return (
    hasValue(record.mailingStreet) &&
    hasValue(record.mailingCity) &&
    hasValue(record.mailingState) &&
    hasValue(record.mailingZip)
  );
}

/**
 * Checks if owner name is complete (has both first and last name)
 */
export function isOwnerNameComplete(record: RecordData): boolean {
  return hasValue(record.ownerFirstName) && hasValue(record.ownerLastName);
}

/**
 * Determines if a record is complete based on all business rules
 * @param record - The record data to check
 * @returns boolean - true if complete, false if incomplete
 */
export function isRecordComplete(record: RecordData): boolean {
  const isCompany = getEffectiveCompanyStatus(
    record.isCompany,
    record.isCompanyOverride ?? null
  );
  
  if (isCompany) {
    // Company: needs ownerFullName (company name) + property street + mailing street
    if (!hasValue(record.ownerFullName)) {
      return false;
    }
    if (!hasValue(record.propertyStreet)) {
      return false;
    }
    if (!hasValue(record.mailingStreet)) {
      return false;
    }
    return true;
  } else {
    // Person: needs firstName + lastName + property street + mailing street
    if (!hasValue(record.ownerFirstName) || !hasValue(record.ownerLastName)) {
      return false;
    }
    if (!hasValue(record.propertyStreet)) {
      return false;
    }
    if (!hasValue(record.mailingStreet)) {
      return false;
    }
    return true;
  }
}

/**
 * Gets a list of reasons why a record is incomplete
 * Useful for displaying to users
 */
export function getIncompleteReasons(record: RecordData): string[] {
  const reasons: string[] = [];

  const isCompany = getEffectiveCompanyStatus(
    record.isCompany,
    record.isCompanyOverride ?? null
  );

  if (isCompany) {
    // Company requirements
    if (!hasValue(record.ownerFullName)) {
      reasons.push('Missing company name');
    }
  } else {
    // Person requirements
    if (!hasValue(record.ownerFirstName)) {
      reasons.push('Missing owner first name');
    }
    if (!hasValue(record.ownerLastName)) {
      reasons.push('Missing owner last name');
    }
  }

  // Common requirements for both
  if (!hasValue(record.propertyStreet)) {
    reasons.push('Missing property street');
  }

  if (!hasValue(record.mailingStreet)) {
    reasons.push('Missing mailing street');
  }

  return reasons;
}
