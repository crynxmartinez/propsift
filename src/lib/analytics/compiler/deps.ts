/**
 * DockInsight 2.2.2 Query Dependencies Compiler
 * 
 * Computes cache dependencies for dependency-version invalidation.
 * 
 * v2.2.2 Contract:
 * - Include entity being queried
 * - Include join entity for via_join tenant scope
 * - Include 'records' if any global filter applies via record join
 * - Include junction entities for tag/motivation filters
 */

import type { WidgetQueryInput, EntityDefinition, CompileCtx } from '../registry/types'
import { getEntity } from '../registry/entities'
import { isPresent } from './utils'

/**
 * Compute query dependencies for cache invalidation.
 * 
 * v2.2.2 FIX:
 * - Check presence (not truthiness) for boolean filters like callReady
 * - Include all entities that could affect query results
 */
export function computeQueryDeps(
  input: WidgetQueryInput,
  entity: EntityDefinition,
  ctx: CompileCtx
): string[] {
  const deps = new Set<string>()
  
  // 1. Always include the entity being queried
  deps.add(input.entityKey)
  
  // 2. Include join entity for via_join tenant scope
  if (entity.tenantScope.mode === 'via_join' && entity.tenantScope.joinEntity) {
    deps.add(entity.tenantScope.joinEntity)
  }
  
  // 3. Check if any global filter applies via record join
  const gf = input.globalFilters
  
  // v2.2.2 FIX: Check presence, not truthiness (callReady: false should still trigger)
  const hasAssignees = Array.isArray(gf.assignees) && gf.assignees.length > 0
  const hasStatus = Array.isArray(gf.status) && gf.status.length > 0
  const hasTemperature = Array.isArray(gf.temperature) && gf.temperature.length > 0
  const hasMarket = !!(gf.market && (
    (gf.market.states?.length ?? 0) > 0 || 
    (gf.market.cities?.length ?? 0) > 0
  ))
  const hasBoard = !!(gf.board && (gf.board.boardId || gf.board.columnId))
  const hasCallReady = isPresent(gf.callReady)  // v2.2.2 FIX: Use isPresent, not Boolean
  
  const filtersApplyViaRecord = hasAssignees || hasStatus || hasTemperature || 
                                 hasMarket || hasBoard || hasCallReady
  
  // If any filter applies via record and we're not querying records, add records as dep
  if (filtersApplyViaRecord && input.entityKey !== 'records') {
    deps.add('records')
  }
  
  // 4. Include junction entities for tag/motivation filters
  if (gf.tags && ((gf.tags.include?.length ?? 0) > 0 || (gf.tags.exclude?.length ?? 0) > 0)) {
    deps.add('record_tags')
    deps.add('tags')
  }
  
  if (gf.motivations && ((gf.motivations.include?.length ?? 0) > 0 || (gf.motivations.exclude?.length ?? 0) > 0)) {
    deps.add('record_motivations')
    deps.add('motivations')
  }
  
  // 5. Include permission-related entities
  // If user has row-level filters, those entities affect results
  const permission = ctx.permissions.entities[input.entityKey]
  if (permission?.rowFilter) {
    for (const filter of permission.rowFilter) {
      // Check if filter references a relation
      if (filter.field.includes('.')) {
        const [relation] = filter.field.split('.')
        // Try to find entity for this relation
        const relatedEntity = getEntity(relation)
        if (relatedEntity) {
          deps.add(relatedEntity.key)
        }
      }
    }
  }
  
  // Return sorted for deterministic ordering
  return Array.from(deps).sort()
}
