/**
 * DockInsight 2.2.2 Query Compiler
 * 
 * Main entry point for compiling widget queries to Prisma queries.
 * 
 * v2.2.2 Contract:
 * - Validates all inputs before compilation
 * - Combines tenant, permission, segment, widget, global filters
 * - Uses effective dateRange (widget override or global)
 * - Computes deterministic hash with resolved ISO timestamps
 * - Computes cache dependencies
 */

import type { 
  WidgetQueryInput, 
  CompiledQuery, 
  CompileCtx,
  DateModeKey 
} from '../registry/types'
import { getEntity } from '../registry/entities'
import { getSegment } from '../registry/segments'
import { validateQueryInput } from './validate'
import { compileTenantScope } from './tenant'
import { compilePermissionWhere } from './permissions'
import { compileFilters, compileSegment, compileGlobalFilters } from './filters'
import { compileDateRange } from './dates'
import { computeQueryHash } from './hash'
import { computeQueryDeps } from './deps'
import { UnknownEntityError } from './errors'

type PrismaWhere = Record<string, unknown>
type PrismaOrderBy = Record<string, 'asc' | 'desc'>

/**
 * Compile a widget query input to a Prisma-ready query.
 * 
 * v2.2.2 Contract:
 * - Validates dimension groupBy compatibility
 * - Combines all filter layers in correct order
 * - Uses effective dateRange (widget override or global default)
 * - Returns complete hash with resolved ISO timestamps
 * - Returns cache dependencies for invalidation
 */
export function compileQuery(
  input: WidgetQueryInput,
  ctx: CompileCtx
): CompiledQuery {
  // 1. Validate all inputs
  validateQueryInput(input)
  
  // 2. Get entity definition
  const entity = getEntity(input.entityKey)
  if (!entity) {
    throw new UnknownEntityError(input.entityKey)
  }
  
  // 3. Compile tenant scope (mandatory)
  const tenantWhere = compileTenantScope(entity, ctx)
  
  // 4. Compile permission scope
  const permissionWhere = compilePermissionWhere(input.entityKey, ctx)
  
  // 5. Compile segment predicate
  let segmentWhere: PrismaWhere = {}
  if (input.segmentKey) {
    const segment = getSegment(input.segmentKey)
    if (segment) {
      segmentWhere = compileSegment(segment.predicate, ctx)
    }
  }
  
  // 6. Compile widget filters
  const filterWhere = compileFilters(input.entityKey, input.filters, ctx)
  
  // 7. Compile global filters (MUST exclude dateRange - handled separately)
  const globalWhere = compileGlobalFilters(
    input.entityKey, 
    input.globalFilters, 
    ctx,
    { excludeDateRange: true }
  )
  
  // 8. Compile date range (SINGLE date filter - effective range only)
  // Widget dateRange overrides globalFilters.dateRange (never both)
  const effectiveDateRange = input.dateRange ?? input.globalFilters.dateRange
  const dateMode: DateModeKey = input.dateMode || entity.dateModes.default
  const dateWhere = compileDateRange(effectiveDateRange, dateMode, entity, ctx)
  
  // 9. Combine all conditions
  const conditions = [
    tenantWhere,
    permissionWhere,
    segmentWhere,
    filterWhere,
    globalWhere,
    dateWhere
  ].filter(w => Object.keys(w).length > 0)
  
  const where: PrismaWhere = conditions.length > 0 
    ? { AND: conditions }
    : {}
  
  // 10. Build orderBy
  let orderBy: PrismaOrderBy | undefined
  if (input.sort) {
    orderBy = { [input.sort.field]: input.sort.dir }
  }
  
  // 11. Compute cache dependencies
  const deps = computeQueryDeps(input, entity, ctx)
  
  // 12. Compute deterministic hash
  const hash = computeQueryHash(input, ctx)
  
  return {
    entityKey: input.entityKey,
    delegate: entity.delegate,  // v2.2.2 FIX: Use delegate for prisma[delegate] calls
    where,
    orderBy,
    take: input.limit,
    dateMode,
    hash,
    deps
  }
}

/**
 * Compile query for count operation
 */
export function compileCountQuery(
  input: WidgetQueryInput,
  ctx: CompileCtx
): { delegate: string; where: PrismaWhere } {
  const compiled = compileQuery(input, ctx)
  return {
    delegate: compiled.delegate,
    where: compiled.where
  }
}

/**
 * Compile query for aggregation operation
 */
export function compileAggregateQuery(
  input: WidgetQueryInput,
  ctx: CompileCtx
): { delegate: string; where: PrismaWhere; field?: string } {
  const compiled = compileQuery(input, ctx)
  return {
    delegate: compiled.delegate,
    where: compiled.where,
    field: input.metric.field
  }
}
