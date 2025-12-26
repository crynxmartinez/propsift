/**
 * DockInsight 2.2.2 Compiler Utilities
 * 
 * Helper functions for query compilation including:
 * - stableStringify: Deterministic JSON serialization (sorted object keys, NO array sorting)
 * - normalizeGlobalFilters: Normalize and sort set-like arrays for cache key stability
 * - sortFilters: Sort filter predicates for deterministic ordering
 */

import type { FilterPredicate, GlobalFilters } from '../registry/types'

/**
 * Stable JSON stringify with sorted object keys.
 * v2.2.2 FIX: Does NOT auto-sort arrays - only sorts known set-like arrays in normalizeGlobalFilters
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value)
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    // v2.2.2 FIX: Do NOT auto-sort arrays - order may be semantically meaningful
    return '[' + value.map(v => stableStringify(v)).join(',') + ']'
  }

  // Sort object keys for deterministic output
  const sortedKeys = Object.keys(value as Record<string, unknown>).sort()
  const pairs = sortedKeys.map(key => {
    const v = (value as Record<string, unknown>)[key]
    return `${JSON.stringify(key)}:${stableStringify(v)}`
  })
  return '{' + pairs.join(',') + '}'
}

/**
 * Normalize global filters for cache key generation.
 * v2.2.2 FIX: Includes ALL keys, sorts set-like arrays for stability
 */
export function normalizeGlobalFilters(
  gf: Omit<GlobalFilters, 'dateRange'>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  // v2.2.2 FIX: Iterate ALL keys, not just known ones
  for (const key of Object.keys(gf).sort()) {
    const value = (gf as Record<string, unknown>)[key]
    
    // Skip undefined/null values
    if (value === undefined || value === null) continue
    
    // Sort known set-like arrays
    if (key === 'assignees' || key === 'status' || key === 'temperature') {
      result[key] = Array.isArray(value) ? [...value].sort() : value
    } else if (key === 'tags' || key === 'motivations') {
      // Nested include/exclude arrays
      const nested = value as { include?: string[]; exclude?: string[] }
      result[key] = {
        include: nested.include ? [...nested.include].sort() : undefined,
        exclude: nested.exclude ? [...nested.exclude].sort() : undefined,
      }
    } else if (key === 'market') {
      // v2.2.2 FIX: Sort market.states and market.cities
      const m = value as { states?: string[]; cities?: string[] }
      result[key] = {
        states: m.states ? [...m.states].sort() : undefined,
        cities: m.cities ? [...m.cities].sort() : undefined,
      }
    } else {
      // Pass through unknown keys unchanged
      result[key] = value
    }
  }
  
  return result
}

/**
 * Sort filter predicates for deterministic ordering.
 * v2.2.2 FIX: Sort by field:operator:stableStringify(value)
 */
export function sortFilters(filters: FilterPredicate[]): FilterPredicate[] {
  return [...filters].sort((a, b) => {
    const keyA = `${a.field}:${a.operator}:${stableStringify(a.value)}`
    const keyB = `${b.field}:${b.operator}:${stableStringify(b.value)}`
    return keyA.localeCompare(keyB)
  })
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if a value is a non-empty array
 */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Check if a value is present (not undefined)
 * v2.2.2 FIX: Use this instead of truthiness checks for boolean filters like callReady
 */
export function isPresent(value: unknown): boolean {
  return value !== undefined
}
