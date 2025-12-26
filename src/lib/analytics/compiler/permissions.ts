/**
 * DockInsight 2.2.2 Permission Compiler
 * 
 * Compiles permission-based where clauses and computes permission hashes.
 */

import type { CompileCtx, FilterPredicate, EntityPermission } from '../registry/types'
import { stableStringify, sortFilters } from './utils'
import { PermissionDeniedError } from './errors'

type PrismaWhere = Record<string, unknown>

/**
 * Compile permission-based where clause for an entity.
 * 
 * v2.2.2 Contract:
 * - Check canRead permission
 * - Apply row-level filters if defined
 * - Handle member role: only see assigned records
 */
export function compilePermissionWhere(
  entityKey: string,
  ctx: CompileCtx
): PrismaWhere {
  const permission = ctx.permissions.entities[entityKey]
  
  // Default: no permission defined = allow read
  if (!permission) {
    return {}
  }
  
  // Check read permission
  if (!permission.canRead) {
    throw new PermissionDeniedError(entityKey)
  }
  
  // Apply row-level filters
  if (permission.rowFilter && permission.rowFilter.length > 0) {
    return compileRowFilters(permission.rowFilter)
  }
  
  // Member role: only see records assigned to them
  if (ctx.role === 'member' && entityKey === 'records') {
    return { assignedToId: ctx.userId }
  }
  
  return {}
}

/**
 * Compile row-level filter predicates to Prisma where clause
 */
function compileRowFilters(filters: FilterPredicate[]): PrismaWhere {
  if (filters.length === 0) return {}
  
  const conditions = filters.map(f => compileFilterPredicate(f))
  
  if (conditions.length === 1) {
    return conditions[0]
  }
  
  return { AND: conditions }
}

/**
 * Compile a single filter predicate to Prisma where clause
 */
function compileFilterPredicate(filter: FilterPredicate): PrismaWhere {
  const { field, operator, value } = filter
  
  switch (operator) {
    case 'eq':
      return { [field]: value }
    case 'neq':
      return { [field]: { not: value } }
    case 'gt':
      return { [field]: { gt: value } }
    case 'gte':
      return { [field]: { gte: value } }
    case 'lt':
      return { [field]: { lt: value } }
    case 'lte':
      return { [field]: { lte: value } }
    case 'in':
      return { [field]: { in: value as unknown[] } }
    case 'not_in':
      return { [field]: { notIn: value as unknown[] } }
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } }
    case 'not_contains':
      return { NOT: { [field]: { contains: value, mode: 'insensitive' } } }
    case 'starts_with':
      return { [field]: { startsWith: value, mode: 'insensitive' } }
    case 'ends_with':
      return { [field]: { endsWith: value, mode: 'insensitive' } }
    case 'is_empty':
      return { [field]: null }
    case 'is_not_empty':
      return { [field]: { not: null } }
    case 'between':
      const [min, max] = value as [unknown, unknown]
      return { [field]: { gte: min, lte: max } }
    default:
      throw new Error(`Unknown filter operator: ${operator}`)
  }
}

/**
 * Compute permission hash for cache key.
 * 
 * v2.2.2 FIX:
 * - Include scopeKey if present
 * - Sort rowFilters by field:operator:stableStringify(value)
 */
export function computePermissionHash(ctx: CompileCtx): string {
  const { role, permissions, scopeKey } = ctx
  
  // Build permission signature
  const sig: Record<string, unknown> = {
    role,
    scopeKey: scopeKey ?? null
  }
  
  // Sort entity permissions by key
  const entityKeys = Object.keys(permissions.entities).sort()
  const entitySigs: Record<string, unknown> = {}
  
  for (const key of entityKeys) {
    const perm = permissions.entities[key]
    entitySigs[key] = {
      canRead: perm.canRead,
      canWrite: perm.canWrite,
      // v2.2.2 FIX: Sort rowFilters by field:operator:value
      rowFilter: perm.rowFilter 
        ? sortFilters(perm.rowFilter).map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value
          }))
        : undefined
    }
  }
  
  sig.entities = entitySigs
  
  return stableStringify(sig)
}

/**
 * Build default permissions based on user role
 */
export function buildDefaultPermissions(role: string): Record<string, EntityPermission> {
  const canManage = ['owner', 'super_admin', 'admin'].includes(role)
  const canView = canManage || role === 'member'
  
  return {
    records: {
      canRead: canView,
      canWrite: canManage,
      rowFilter: role === 'member' ? [{ field: 'assignedToId', operator: 'eq', value: '$userId' }] : undefined
    },
    tasks: {
      canRead: canView,
      canWrite: canManage
    },
    phones: {
      canRead: canView,
      canWrite: canManage
    },
    emails: {
      canRead: canView,
      canWrite: canManage
    },
    record_tags: {
      canRead: canView,
      canWrite: canManage
    },
    record_motivations: {
      canRead: canView,
      canWrite: canManage
    },
    tags: {
      canRead: canView,
      canWrite: canManage
    },
    motivations: {
      canRead: canView,
      canWrite: canManage
    },
    activity: {
      canRead: canView,
      canWrite: false
    }
  }
}
