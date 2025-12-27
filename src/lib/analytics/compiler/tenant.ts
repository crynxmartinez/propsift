/**
 * DockInsight 2.2.2 Tenant Scope Compiler
 * 
 * Compiles tenant scope conditions based on entity definition.
 * Supports both direct field and via_join modes.
 */

import type { EntityDefinition, CompileCtx } from '../registry/types'

type PrismaWhere = Record<string, unknown>

/**
 * Compile tenant scope condition for an entity.
 * 
 * v2.2.2 Contract:
 * - mode: 'direct' → { [field]: tenantId }
 * - mode: 'via_join' → { [joinRelation]: { [joinField]: tenantId } }
 */
export function compileTenantScope(
  entity: EntityDefinition,
  ctx: CompileCtx
): PrismaWhere {
  const { tenantScope } = entity
  
  if (tenantScope.mode === 'direct') {
    // Direct field on entity
    if (!tenantScope.field) {
      throw new Error(`Entity ${entity.key} has direct tenant scope but no field defined`)
    }
    // Include legacy records with null createdById (for records entity)
    if (entity.key === 'records' || entity.key === 'tasks') {
      return {
        OR: [
          { [tenantScope.field]: ctx.tenantId },
          { [tenantScope.field]: null }
        ]
      }
    }
    return { [tenantScope.field]: ctx.tenantId }
  }
  
  if (tenantScope.mode === 'via_join') {
    // Join through related entity
    if (!tenantScope.joinRelation || !tenantScope.joinField) {
      throw new Error(
        `Entity ${entity.key} has via_join tenant scope but missing joinRelation or joinField`
      )
    }
    return {
      [tenantScope.joinRelation]: {
        [tenantScope.joinField]: ctx.tenantId
      }
    }
  }
  
  throw new Error(`Unknown tenant scope mode: ${tenantScope.mode}`)
}
