/**
 * Company Detection Utility
 * Detects if an owner name is likely a company rather than a person
 */

// Common business entity keywords
const COMPANY_KEYWORDS = [
  'llc',
  'l.l.c',
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'company',
  'co.',
  'ltd',
  'limited',
  'lp',
  'l.p',
  'llp',
  'l.l.p',
  'trust',
  'estate',
  'bank',
  'properties',
  'property',
  'investments',
  'investment',
  'holdings',
  'holding',
  'realty',
  'real estate',
  'development',
  'developers',
  'management',
  'association',
  'assoc',
  'foundation',
  'group',
  'partners',
  'partnership',
  'enterprises',
  'enterprise',
  'services',
  'service',
  'solutions',
  'consulting',
  'capital',
  'ventures',
  'venture',
  'fund',
  'funding',
  'financial',
  'finance',
  'lending',
  'mortgage',
  'rentals',
  'rental',
  'leasing',
  'builders',
  'construction',
  'contracting',
  'contractors',
  'homes',
  'housing',
  'apartments',
  'residential',
  'commercial',
  'industrial',
  'retail',
  'wholesale',
  'trading',
  'international',
  'national',
  'global',
  'worldwide',
  'usa',
  'america',
  'american',
];

// Patterns that indicate a company
const COMPANY_PATTERNS = [
  /\b(llc|inc|corp|ltd|lp|llp)\b/i,           // Common suffixes
  /\b(trust|estate)\b/i,                       // Trust/Estate
  /\d+\s*(llc|inc|corp|ltd)/i,                // Numbers followed by entity type
  /\b\d{2,}\b/,                                // Contains 2+ digit numbers (like "123 Properties LLC")
  /\bthe\s+\w+\s+(company|group|trust)\b/i,   // "The X Company/Group/Trust"
  /\b(revocable|irrevocable|living)\s+trust\b/i, // Trust types
  /\bfamily\s+(trust|lp|llc)\b/i,             // Family entities
  /\b(c\/o|attn:|attention:)/i,               // Care of / Attention
];

/**
 * Detects if the given name is likely a company
 * @param name - The owner name to check
 * @returns boolean - true if likely a company, false if likely a person
 */
export function detectCompany(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const lowerName = name.toLowerCase().trim();

  // Check for company keywords
  for (const keyword of COMPANY_KEYWORDS) {
    // Use word boundary check for most keywords
    const regex = new RegExp(`\\b${keyword.replace(/\./g, '\\.')}\\b`, 'i');
    if (regex.test(lowerName)) {
      return true;
    }
  }

  // Check for company patterns
  for (const pattern of COMPANY_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }

  // Check if name is all uppercase (often indicates company)
  // But only if it's more than 3 words (to avoid "JOHN SMITH")
  const words = name.trim().split(/\s+/);
  if (words.length > 2 && name === name.toUpperCase() && /[A-Z]/.test(name)) {
    // Additional check: if all caps and contains no common first names
    const commonFirstNames = ['john', 'james', 'robert', 'michael', 'william', 'david', 'mary', 'patricia', 'jennifer', 'linda', 'elizabeth'];
    const firstWord = words[0].toLowerCase();
    if (!commonFirstNames.includes(firstWord)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines the effective company status considering manual override
 * @param isCompanyAuto - Auto-detected company status
 * @param isCompanyOverride - Manual override (null = use auto, true/false = override)
 * @returns boolean - Final company status
 */
export function getEffectiveCompanyStatus(
  isCompanyAuto: boolean,
  isCompanyOverride: boolean | null
): boolean {
  if (isCompanyOverride !== null) {
    return isCompanyOverride;
  }
  return isCompanyAuto;
}
