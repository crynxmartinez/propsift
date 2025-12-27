/**
 * DockInsight 2.2.2 Filter Compiler
 * 
 * Compiles widget filters, segment predicates, and global filters to Prisma where clauses.
 */

import type { 
  FilterPredicate, 
  GlobalFilters, 
  CompileCtx,
  EntityDefinition 
} from '../registry/types'

type PrismaWhere = Record<string, unknown>

/**
 * Compile widget-level filters to Prisma where clause
 */
export function compileFilters(
  entityKey: string,
  filters: FilterPredicate[],
  ctx: CompileCtx
): PrismaWhere {
  if (!filters || filters.length === 0) return {}
  
  const conditions = filters.map(f => compileFilterPredicate(f, ctx))
  
  if (conditions.length === 1) {
    return conditions[0]
  }
  
  return { AND: conditions }
}

/**
 * Compile segment predicate to Prisma where clause
 */
export function compileSegment(
  predicate: FilterPredicate[],
  ctx: CompileCtx
): PrismaWhere {
  if (!predicate || predicate.length === 0) return {}
  
  const conditions = predicate.map(f => compileFilterPredicate(f, ctx))
  
  if (conditions.length === 1) {
    return conditions[0]
  }
  
  return { AND: conditions }
}

/**
 * Compile global filters to Prisma where clause.
 * 
 * v2.2.2 Contract:
 * - excludeDateRange option: dateRange handled separately in date compiler
 * - All global filters apply via record join for non-record entities
 */
export function compileGlobalFilters(
  entityKey: string,
  globalFilters: GlobalFilters,
  ctx: CompileCtx,
  options: { excludeDateRange?: boolean } = {}
): PrismaWhere {
  const conditions: PrismaWhere[] = []
  
  // Tags filter
  if (globalFilters.tags) {
    const tagCondition = compileTagFilter(entityKey, globalFilters.tags)
    if (tagCondition) conditions.push(tagCondition)
  }
  
  // Motivations filter
  if (globalFilters.motivations) {
    const motivationCondition = compileMotivationFilter(entityKey, globalFilters.motivations)
    if (motivationCondition) conditions.push(motivationCondition)
  }
  
  // Assignees filter
  if (globalFilters.assignees && globalFilters.assignees.length > 0) {
    conditions.push(compileAssigneesFilter(entityKey, globalFilters.assignees))
  }
  
  // Status filter
  if (globalFilters.status && globalFilters.status.length > 0) {
    conditions.push(compileStatusFilter(entityKey, globalFilters.status))
  }
  
  // Temperature filter
  if (globalFilters.temperature && globalFilters.temperature.length > 0) {
    conditions.push(compileTemperatureFilter(entityKey, globalFilters.temperature))
  }
  
  // Market filter
  if (globalFilters.market) {
    const marketCondition = compileMarketFilter(entityKey, globalFilters.market)
    if (marketCondition) conditions.push(marketCondition)
  }
  
  // Board filter
  if (globalFilters.board) {
    const boardCondition = compileBoardFilter(entityKey, globalFilters.board)
    if (boardCondition) conditions.push(boardCondition)
  }
  
  // Call ready filter - v2.2.2 FIX: Check presence, not truthiness
  if (globalFilters.callReady !== undefined) {
    conditions.push(compileCallReadyFilter(entityKey, globalFilters.callReady))
  }
  
  if (conditions.length === 0) return {}
  if (conditions.length === 1) return conditions[0]
  
  return { AND: conditions }
}

/**
 * Compile a single filter predicate
 */
function compileFilterPredicate(filter: FilterPredicate, ctx: CompileCtx): PrismaWhere {
  const { field, operator, value } = filter
  
  // Handle special $now value for date comparisons
  const resolvedValue = value === '$now' ? new Date() : 
                        value === '$userId' ? ctx.userId : value
  
  switch (operator) {
    case 'eq':
      return { [field]: resolvedValue }
    case 'neq':
      return { [field]: { not: resolvedValue } }
    case 'gt':
      return { [field]: { gt: resolvedValue } }
    case 'gte':
      return { [field]: { gte: resolvedValue } }
    case 'lt':
      return { [field]: { lt: resolvedValue } }
    case 'lte':
      return { [field]: { lte: resolvedValue } }
    case 'in':
      return { [field]: { in: resolvedValue as unknown[] } }
    case 'not_in':
      return { [field]: { notIn: resolvedValue as unknown[] } }
    case 'contains':
      return { [field]: { contains: resolvedValue, mode: 'insensitive' } }
    case 'not_contains':
      return { NOT: { [field]: { contains: resolvedValue, mode: 'insensitive' } } }
    case 'starts_with':
      return { [field]: { startsWith: resolvedValue, mode: 'insensitive' } }
    case 'ends_with':
      return { [field]: { endsWith: resolvedValue, mode: 'insensitive' } }
    case 'is_empty':
      return { [field]: null }
    case 'is_not_empty':
      return { [field]: { not: null } }
    case 'between':
      const [min, max] = resolvedValue as [unknown, unknown]
      return { [field]: { gte: min, lte: max } }
    case 'contains_any':
      // For relation fields like tags
      return { [field]: { some: { id: { in: resolvedValue as string[] } } } }
    case 'contains_all':
      // All values must be present
      return { 
        AND: (resolvedValue as string[]).map(id => ({ 
          [field]: { some: { id } } 
        })) 
      }
    case 'has_some':
      // Relation has at least one item
      return { [field]: { some: {} } }
    case 'has_none':
      // Relation has no items
      return { [field]: { none: {} } }
    default:
      throw new Error(`Unknown filter operator: ${operator}`)
  }
}

/**
 * Compile tag filter based on entity type
 */
function compileTagFilter(
  entityKey: string, 
  tags: { include?: string[]; exclude?: string[] }
): PrismaWhere | null {
  const conditions: PrismaWhere[] = []
  
  if (tags.include && tags.include.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ recordTags: { some: { tagId: { in: tags.include } } } })
    } else if (entityKey === 'record_tags') {
      conditions.push({ tagId: { in: tags.include } })
    } else {
      // Via record join
      conditions.push({ record: { recordTags: { some: { tagId: { in: tags.include } } } } })
    }
  }
  
  if (tags.exclude && tags.exclude.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ recordTags: { none: { tagId: { in: tags.exclude } } } })
    } else if (entityKey === 'record_tags') {
      conditions.push({ tagId: { notIn: tags.exclude } })
    } else {
      conditions.push({ record: { recordTags: { none: { tagId: { in: tags.exclude } } } } })
    }
  }
  
  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return { AND: conditions }
}

/**
 * Compile motivation filter based on entity type
 */
function compileMotivationFilter(
  entityKey: string,
  motivations: { include?: string[]; exclude?: string[] }
): PrismaWhere | null {
  const conditions: PrismaWhere[] = []
  
  if (motivations.include && motivations.include.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ recordMotivations: { some: { motivationId: { in: motivations.include } } } })
    } else if (entityKey === 'record_motivations') {
      conditions.push({ motivationId: { in: motivations.include } })
    } else {
      conditions.push({ record: { recordMotivations: { some: { motivationId: { in: motivations.include } } } } })
    }
  }
  
  if (motivations.exclude && motivations.exclude.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ recordMotivations: { none: { motivationId: { in: motivations.exclude } } } })
    } else if (entityKey === 'record_motivations') {
      conditions.push({ motivationId: { notIn: motivations.exclude } })
    } else {
      conditions.push({ record: { recordMotivations: { none: { motivationId: { in: motivations.exclude } } } } })
    }
  }
  
  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return { AND: conditions }
}

/**
 * Compile assignees filter
 */
function compileAssigneesFilter(entityKey: string, assignees: string[]): PrismaWhere {
  if (entityKey === 'records' || entityKey === 'tasks') {
    return { assignedToId: { in: assignees } }
  }
  // Via record join
  return { record: { assignedToId: { in: assignees } } }
}

/**
 * Compile status filter
 */
function compileStatusFilter(entityKey: string, status: string[]): PrismaWhere {
  if (entityKey === 'records') {
    return { statusId: { in: status } }
  }
  if (entityKey === 'tasks') {
    return { status: { in: status } }
  }
  // Via record join
  return { record: { statusId: { in: status } } }
}

/**
 * Compile temperature filter
 */
function compileTemperatureFilter(entityKey: string, temperature: string[]): PrismaWhere {
  if (entityKey === 'records') {
    return { temperature: { in: temperature } }
  }
  // Via record join
  return { record: { temperature: { in: temperature } } }
}

/**
 * Compile market filter (states/cities)
 */
function compileMarketFilter(
  entityKey: string,
  market: { states?: string[]; cities?: string[] }
): PrismaWhere | null {
  const conditions: PrismaWhere[] = []
  
  if (market.states && market.states.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ propertyState: { in: market.states } })
    } else {
      conditions.push({ record: { propertyState: { in: market.states } } })
    }
  }
  
  if (market.cities && market.cities.length > 0) {
    if (entityKey === 'records') {
      conditions.push({ propertyCity: { in: market.cities } })
    } else {
      conditions.push({ record: { propertyCity: { in: market.cities } } })
    }
  }
  
  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  return { AND: conditions }
}

/**
 * Compile board filter
 */
function compileBoardFilter(
  entityKey: string,
  board: { boardId?: string; columnId?: string }
): PrismaWhere | null {
  if (!board.boardId && !board.columnId) return null
  
  const boardCondition: PrismaWhere = {}
  
  if (board.columnId) {
    boardCondition.columnId = board.columnId
  } else if (board.boardId) {
    boardCondition.column = { boardId: board.boardId }
  }
  
  if (entityKey === 'records') {
    return { boardPositions: { some: boardCondition } }
  }
  
  return { record: { boardPositions: { some: boardCondition } } }
}

/**
 * Compile call ready filter
 * v2.2.2: callReady means has phone numbers with valid status
 */
function compileCallReadyFilter(entityKey: string, callReady: boolean): PrismaWhere {
  if (entityKey === 'records') {
    if (callReady) {
      return { phoneCount: { gt: 0 } }
    } else {
      return { phoneCount: 0 }
    }
  }
  
  // Via record join
  if (callReady) {
    return { record: { phoneCount: { gt: 0 } } }
  } else {
    return { record: { phoneCount: 0 } }
  }
}
