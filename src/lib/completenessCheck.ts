/**
 * Completeness Check Utility
 * Determines if a record is complete based on business rules
 * 
 * Complete = ALL of these must be true:
 * - Owner is a person (not a company)
 * - Has first name AND last name
 * - Has full property address (street, city, state, zip)
 * - Has full mailing address (street, city, state, zip)
 * 
 * Incomplete = ANY of these:
 * - Owner is a company name
 * - Missing first name OR last name
 * - Missing any property address field
 * - Missing any mailing address field
 */

import { getEffectiveCompanyStatus } from './companyDetection';

interface RecordData {
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
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
  // Check if owner is a company (companies are always incomplete)
  const isCompany = getEffectiveCompanyStatus(
    record.isCompany,
    record.isCompanyOverride ?? null
  );
  
  if (isCompany) {
    return false;
  }

  // Check if owner has both first and last name
  if (!isOwnerNameComplete(record)) {
    return false;
  }

  // Check if property address is complete
  if (!isPropertyAddressComplete(record)) {
    return false;
  }

  // Check if mailing address is complete
  if (!isMailingAddressComplete(record)) {
    return false;
  }

  return true;
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
    reasons.push('Owner is a company');
  }

  if (!hasValue(record.ownerFirstName)) {
    reasons.push('Missing owner first name');
  }

  if (!hasValue(record.ownerLastName)) {
    reasons.push('Missing owner last name');
  }

  if (!hasValue(record.propertyStreet)) {
    reasons.push('Missing property street');
  }

  if (!hasValue(record.propertyCity)) {
    reasons.push('Missing property city');
  }

  if (!hasValue(record.propertyState)) {
    reasons.push('Missing property state');
  }

  if (!hasValue(record.propertyZip)) {
    reasons.push('Missing property zip');
  }

  if (!hasValue(record.mailingStreet)) {
    reasons.push('Missing mailing street');
  }

  if (!hasValue(record.mailingCity)) {
    reasons.push('Missing mailing city');
  }

  if (!hasValue(record.mailingState)) {
    reasons.push('Missing mailing state');
  }

  if (!hasValue(record.mailingZip)) {
    reasons.push('Missing mailing zip');
  }

  return reasons;
}
