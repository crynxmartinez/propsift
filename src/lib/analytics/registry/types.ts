/**
 * DockInsight 2.2.2 Registry Types
 * 
 * Core type definitions for the analytics registry system.
 * These types define the contracts for entities, segments, metrics, and dimensions.
 */

// =============================================================================
// REGISTRY VERSION
// =============================================================================

export const REGISTRY_VERSION = '2.2.2'

// =============================================================================
// TENANT SCOPE
// =============================================================================

export type TenantScopeMode = 'direct' | 'via_join'

export interface TenantScopeDef {
  mode: TenantScopeMode
  field?: string           // direct: e.g., 'createdById'
  // v2.2.2 FIX: Standardized via_join fields
  joinEntity?: string      // via_join: registry key, e.g., 'records' (for cache deps)
  joinRelation?: string    // via_join: Prisma relation name, e.g., 'record' (for query building)
  joinField?: string       // via_join: field on joined model, e.g., 'createdById'
}

// =============================================================================
// SEARCH FIELDS
// =============================================================================

export type SearchFieldKind = 'scalar' | 'relation_some'

export interface SearchFieldDef {
  kind: SearchFieldKind
  field: string            // scalar: field name, relation_some: relation name
  targetField?: string     // relation_some: field on related model
}

// =============================================================================
// ENTITY DEFINITION
// =============================================================================

export type DateModeKey = 'createdAt' | 'updatedAt' | 'junction_created' | 'completedAt' | 'dueDate'

export interface DateModeDef {
  default: DateModeKey
  available: DateModeKey[]
}

export interface EntityDefinition {
  key: string
  label: string
  labelPlural: string
  // v2.2.2 FIX: Use delegate name (lowerCamelCase) for prisma[delegate] calls
  delegate: string
  tenantScope: TenantScopeDef
  searchFields: SearchFieldDef[]
  dateModes: DateModeDef
}

// =============================================================================
// FILTER OPERATORS
// =============================================================================

export type FilterOperator = 
  | 'eq' 
  | 'neq' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'in' 
  | 'not_in' 
  | 'contains' 
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'between'        // v2.2.2: Requires [min, max] array value
  | 'contains_any'   // For multi-select: has any of the values
  | 'contains_all'   // For multi-select: has all of the values

export interface FilterPredicate {
  field: string
  operator: FilterOperator
  value: unknown
}

// =============================================================================
// SEGMENT DEFINITION
// =============================================================================

export type SegmentCategory = 'status' | 'temperature' | 'activity' | 'custom'

export interface SegmentDefinition {
  key: string
  label: string
  entityKey: string
  category: SegmentCategory
  predicate: FilterPredicate[]
}

// =============================================================================
// DIMENSION DEFINITION
// =============================================================================

export type GroupByMode = 'direct' | 'junction_required'

export interface DimensionDefinition {
  key: string
  label: string
  field: string
  entities: string[] | ['*']
  // v2.2.2: GroupBy compatibility
  groupByMode: GroupByMode
  junctionEntity?: string  // Required if groupByMode === 'junction_required'
  supportedOperators: FilterOperator[]
  enumValues?: { value: string; label: string; color?: string }[]
  relationConfig?: {
    through?: string
    targetTable: string
    labelField: string
    colorField?: string
  }
  dateBuckets?: ('day' | 'week' | 'month' | 'quarter' | 'year')[]
}

// =============================================================================
// METRIC DEFINITION
// =============================================================================

export type MetricType = 'count' | 'sum' | 'avg' | 'rate' | 'distinct_count'

export interface MetricDefinition {
  key: string
  label: string
  type: MetricType
  field?: string           // Required for sum, avg
  entities: string[] | ['*']
  format?: 'number' | 'percent' | 'currency' | 'duration'
  // For rate metrics
  numerator?: {
    type: MetricType
    field?: string
    filter?: FilterPredicate[]
  }
  denominator?: {
    type: MetricType
    field?: string
    filter?: FilterPredicate[]
  }
}

// =============================================================================
// GLOBAL FILTERS
// =============================================================================

export interface DateRangePreset {
  preset: 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'last_30_days' | 
          'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time'
}

export interface DateRangeCustom {
  start: Date
  end: Date
}

export type DateRange = DateRangePreset | DateRangeCustom

export interface TagFilter {
  include?: string[]
  exclude?: string[]
}

export interface MotivationFilter {
  include?: string[]
  exclude?: string[]
}

export interface MarketFilter {
  states?: string[]
  cities?: string[]
}

export interface BoardFilter {
  boardId?: string
  columnId?: string
}

export interface GlobalFilters {
  dateRange?: DateRange
  tags?: TagFilter
  motivations?: MotivationFilter
  assignees?: string[]
  status?: string[]
  temperature?: string[]
  market?: MarketFilter
  board?: BoardFilter
  callReady?: boolean
}

// =============================================================================
// WIDGET QUERY INPUT
// =============================================================================

export interface SortConfig {
  field: string
  dir: 'asc' | 'desc'
}

export interface MetricConfig {
  key: string
  // Optional overrides
  field?: string
  filter?: FilterPredicate[]
}

export interface WidgetQueryInput {
  entityKey: string
  segmentKey?: string
  filters: FilterPredicate[]
  globalFilters: GlobalFilters
  metric: MetricConfig
  dimension?: string
  dateRange?: DateRange           // v2.2.2: OPTIONAL override (widget-level)
  dateMode?: DateModeKey
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sort?: SortConfig
  limit?: number
}

// =============================================================================
// COMPILED QUERY
// =============================================================================

export interface CompiledQuery {
  entityKey: string
  delegate: string               // v2.2.2 FIX: Use delegate for prisma[delegate] calls
  where: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  dateMode: DateModeKey
  hash: string
  deps: string[]                 // v2.2.2: Cache dependencies
}

// =============================================================================
// PERMISSION TYPES
// =============================================================================

export interface EntityPermission {
  canRead: boolean
  canWrite: boolean
  rowFilter?: FilterPredicate[]  // Row-level security
}

export interface PermissionSet {
  entities: Record<string, EntityPermission>
}

// =============================================================================
// COMPILE CONTEXT
// =============================================================================

export interface CompileCtx {
  tenantId: string               // ownerId in this codebase
  userId: string
  role: 'owner' | 'super_admin' | 'admin' | 'member'
  timezone: string
  permissions: PermissionSet
  permissionHash: string         // v2.2.2: Pre-computed for caching
  scopeKey?: string              // v2.2.2 FIX: e.g., teamId for manager-sees-team
}
