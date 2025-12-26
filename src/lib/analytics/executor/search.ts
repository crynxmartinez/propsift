/**
 * DockInsight 2.2.2 Search Compiler
 * 
 * Compiles drilldown search queries using entity searchFields.
 * 
 * v2.2.2 Contract:
 * - Use searchFields from entity registry
 * - Sanitize input (trim, limit length, remove control chars)
 * - NO SQL wildcard escaping (Prisma handles it)
 */

import { getEntity } from '../registry'
import type { SearchFieldDef } from '../registry/types'

/**
 * Sanitize search input
 * - Trim whitespace
 * - Limit to 100 chars
 * - Remove control characters
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return ''
  
  return input
    .trim()
    .slice(0, 100)
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control chars
}

/**
 * Compile search query for drilldown
 */
export function compileSearch(
  entityKey: string,
  searchTerm: string
): Record<string, unknown> | null {
  const sanitized = sanitizeSearchInput(searchTerm)
  if (!sanitized) return null
  
  const entity = getEntity(entityKey)
  if (!entity || entity.searchFields.length === 0) return null
  
  const conditions = entity.searchFields.map(field => 
    compileSearchField(field, sanitized)
  )
  
  return { OR: conditions }
}

/**
 * Compile a single search field condition
 */
function compileSearchField(
  field: SearchFieldDef,
  term: string
): Record<string, unknown> {
  if (field.kind === 'scalar') {
    return {
      [field.field]: {
        contains: term,
        mode: 'insensitive'
      }
    }
  }
  
  if (field.kind === 'relation_some') {
    return {
      [field.field]: {
        some: {
          [field.targetField!]: {
            contains: term,
            mode: 'insensitive'
          }
        }
      }
    }
  }
  
  return {}
}
