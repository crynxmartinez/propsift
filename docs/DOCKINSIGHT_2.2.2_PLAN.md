# DockInsight 2.2.2 — Implementation Plan (Production-Hardened)

> **Databox-grade analytics + PropSift operations console**
>
> v2.2.2 is v2.2.1 hardened for real Prisma/Redis implementation: groupBy contracts for many-to-many, counter update mechanisms, permission-hash caching, invalidation dependency maps, complete query hashing, operator value contracts, and safe drilldown search.

---

## Changelog (2.2.1 → 2.2.2)

### Patches Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | **GroupBy on relation trap** | Many-to-many dimensions must use junction entity (Prisma can't groupBy through relations) |
| 2 | **Counter drift** | Defined counter update mechanism: transaction hooks + async reconciliation |
| 3 | **Cache explosion** | Cache key uses `permissionHash`, not raw `userId` |
| 4 | **Stale dependent widgets** | Added invalidation dependency map (phone add → bump records + phones) |
| 5 | **Hash collisions** | Query hash includes ALL query-affecting inputs with stable stringify |
| 6 | **Operator ambiguity** | `between` requires `[min, max]` array format |
| 7 | **Search injection** | Drilldown search is entity-scoped with `searchFields` registry |
| 8 | **Acceptance criteria** | Added comprehensive Phase 1 checklist |

---

## Table of Contents

1. [North Star Vision](#1-north-star-vision)
2. [Current State Analysis](#2-current-state-analysis)
3. [Core Model & Architecture](#3-core-model--architecture)
4. [Registry System](#4-registry-system)
5. [Query Compiler & Field Resolver](#5-query-compiler--field-resolver)
6. [Date Semantics](#6-date-semantics)
7. [Builder UX Flow](#7-builder-ux-flow)
8. [KPI Mode vs Builder Mode](#8-kpi-mode-vs-builder-mode)
9. [Global Filters](#9-global-filters)
10. [Metrics System](#10-metrics-system)
11. [Drilldowns](#11-drilldowns)
12. [Stacks System](#12-stacks-system)
13. [Action Widgets](#13-action-widgets)
14. [System Dashboards](#14-system-dashboards)
15. [Insights Layer](#15-insights-layer)
16. [Error Handling](#16-error-handling)
17. [Caching Strategy](#17-caching-strategy)
18. [Permissions](#18-permissions)
19. [Counter Update Mechanism](#19-counter-update-mechanism)
20. [UI/UX Guidelines](#20-uiux-guidelines)
21. [Execution Phases](#21-execution-phases)
22. [Technical Specifications](#22-technical-specifications)
23. [Migration Mapping + Audit](#23-migration-mapping--audit)
24. [Success Metrics](#24-success-metrics)

---

## 1. North Star Vision

DockInsight should feel like:

| Principle | Description |
|-----------|-------------|
| **Instant Answers** | KPI Mode + smart defaults |
| **Truth Behind Numbers** | Drilldown opens the real rows behind any value |
| **Do the Work** | Action Widgets + Stacks as ops console |
| **Scales Without Confusion** | Registry-driven entity/segment/metric/dimension system |
| **Always Consistent** | Same compiled query powers widget + drilldown |
| **Production-Ready** | Errors, caching, permissions, audit |
| **No Analytics Lies** | Counters stay correct, cache never serves stale cross-user data |

---

## 2. Current State Analysis

v2.2.2 builds on v2.2.1 with implementation-level contracts that prevent:
- Prisma groupBy failures on relations
- Counter drift over time
- Cache explosion per-user
- Stale widgets after related entity mutations
- Hash collisions causing wrong cached data
- Search injection attacks

---

## 3. Core Model & Architecture

### Canonical Widget Model

```
Entity + Segment(optional) + Filters + Metric(s) + Dimension(optional)
+ DateRange + DateMode + Granularity + Sort/Limit
```

### Hard Rules (v2.2.2)

| Rule | Description |
|------|-------------|
| **Tenant scope is mandatory** | Every query must have tenant scope (`workspaceId`) |
| **Permissions are additive** | Tenant scope AND permission rowFilter |
| **Segments are filter-only** | No sort/limit in segment definitions |
| **Consistency guarantee** | Widget value and drilldown come from the same `compile()` output |
| **Server-safe drilldown** | Client never submits `CompiledQuery` |
| **Permission-hash caching** | Cache keys include permission hash, not raw userId |
| **Many-to-many groupBy contract** | Must use junction entity for Prisma compatibility |
| **Counter consistency** | Updates in same transaction or queued immediately |

---

## 4. Registry System

Four registries drive UI + validation:

- **Entity Registry**
- **Segment Registry**
- **Metric Registry**
- **Dimension Registry**

### A) Entity Registry (v2.2.2 with searchFields)

```typescript
// src/lib/analytics/registry/entities.ts

export type TenantScopeMode = 'direct' | 'via_join'

export interface TenantScopeDef {
  mode: TenantScopeMode
  field?: string           // direct: e.g., 'workspaceId'
  joinPath?: string        // via_join: e.g., 'record'
  joinField?: string       // via_join: e.g., 'workspaceId'
}

export type PermissionScope = 'adminOnly' | 'team' | 'roleBased'

export interface EntityDefinition {
  key: string
  label: string
  labelPlural: string
  table: string // Prisma model name

  tenantScope: TenantScopeDef
  permissionScope: PermissionScope

  defaultTimeField: string // usually createdAt
  dateModes: {
    default: DateModeKey
    supported: DateModeKey[]
  }

  metrics: MetricKey[]
  dimensions: DimensionKey[]
  sumFields?: SumFieldDef[]
  avgFields?: AvgFieldDef[]

  // v2.2.2: Drilldown search configuration
  searchFields?: string[]  // e.g., ['name', 'address', 'phone']
  searchMaxLength?: number // default: 100
  
  drilldownRoute: string
  drilldownQueryParam: string
  quickActions: ActionType[]

  joins?: EntityJoin[]
}
```

### Entity Keys (v2.2.2)

| Entity Key | Table | Tenant Scope | Search Fields |
|------------|-------|--------------|---------------|
| `records` | Record | direct: `workspaceId` | `['name', 'address', 'phone', 'email']` |
| `tasks` | Task | direct: `workspaceId` | `['title', 'description']` |
| `phones` | RecordPhoneNumber | via_join: `record.workspaceId` | `['phoneNumber']` |
| `emails` | RecordEmail | via_join: `record.workspaceId` | `['email']` |
| `activity` | ActivityLog | direct: `workspaceId` | `['description']` |
| `record_tags` | RecordTag | direct: `workspaceId` | `[]` (no search) |
| `record_motivations` | RecordMotivation | direct: `workspaceId` | `[]` (no search) |
| `tags` | Tag | direct: `workspaceId` | `['name']` |
| `motivations` | Motivation | direct: `workspaceId` | `['name']` |

### B) Segment Registry

```typescript
// src/lib/analytics/registry/segments.ts

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'is_null' | 'is_not_null'
  | 'exists' | 'not_exists'
  | 'between'  // v2.2.2: requires [min, max] array

export interface FilterPredicate {
  field: string
  operator: FilterOperator
  value?: unknown
}

export interface SegmentDefinition {
  key: string
  entityKey: string
  label: string
  description: string
  predicate: FilterPredicate[]
  category: 'quality' | 'execution' | 'pipeline' | 'coverage'
  icon?: string
  color?: string
}
```

### Operator Value Contracts (v2.2.2)

| Operator | Value Type | Example |
|----------|------------|---------|
| `eq`, `neq` | `string \| number \| boolean` | `{ field: 'status', operator: 'eq', value: 'active' }` |
| `gt`, `gte`, `lt`, `lte` | `number \| Date` | `{ field: 'phoneCount', operator: 'gt', value: 1 }` |
| `in`, `not_in` | `Array<string \| number>` | `{ field: 'temperature', operator: 'in', value: ['hot', 'warm'] }` |
| `contains`, `not_contains` | `string` | `{ field: 'name', operator: 'contains', value: 'john' }` |
| `starts_with`, `ends_with` | `string` | `{ field: 'email', operator: 'ends_with', value: '@gmail.com' }` |
| `is_null`, `is_not_null` | `undefined` (no value) | `{ field: 'assignedToId', operator: 'is_null' }` |
| `exists`, `not_exists` | `undefined` (no value) | `{ field: 'phones', operator: 'exists' }` |
| **`between`** | **`[min, max]` array** | `{ field: 'createdAt', operator: 'between', value: ['2024-01-01', '2024-12-31'] }` |

**v2.2.2 Contract:** `between` MUST be a 2-element array `[min, max]`. Compiler normalizes to `{ gte: min, lte: max }`.

### C) Metric Registry

Same as 2.2.1, with enforcement rule:

> For rate metrics, denominator must be a superset of numerator under the same tenant + permission filters.

### D) Dimension Registry (v2.2.2 GroupBy Contract)

```typescript
// src/lib/analytics/registry/dimensions.ts

export interface DimensionDefinition {
  key: string
  label: string
  type: 'enum' | 'date' | 'string' | 'number' | 'relation'
  field: string

  entities: string[] | ['*']

  // v2.2.2: GroupBy compatibility
  groupByMode: 'direct' | 'junction_required'
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
```

### GroupBy Contract (v2.2.2 - Critical)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GROUPBY CONTRACT (v2.2.2)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Prisma CANNOT groupBy through relations (e.g., recordTags.tag.name).   │
│                                                                          │
│  RULE: Many-to-many dimensions must be grouped on the junction entity.  │
│                                                                          │
│  ✅ CORRECT: record_tags entity, groupBy: tagId, then join Tag for label│
│  ❌ WRONG:   records entity, groupBy: tag (Prisma will fail)            │
│                                                                          │
│  For "Top Tags" chart → use record_tags entity, not records             │
│  For "Records by Status" → use records entity (status is direct field)  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dimension Definitions (v2.2.2)

| Dimension | Entities | GroupBy Mode | Notes |
|-----------|----------|--------------|-------|
| `status` | records | direct | Scalar field |
| `temperature` | records | direct | Enum field |
| `assignedTo` | records, tasks | direct | FK field (assignedToId) |
| `tag` | record_tags | direct | Use junction entity |
| `motivation` | record_motivations | direct | Use junction entity |
| `day`, `week`, `month` | * | direct | Date bucket on createdAt |
| `phoneType` | phones | direct | Enum field |
| `taskStatus` | tasks | direct | Enum field |
| `priority` | tasks | direct | Enum field |

**Removed from records dimensions:** `tag`, `motivation` (must use junction entities)

---

## 5. Query Compiler & Field Resolver

### Compiler Inputs (server-safe)

```typescript
export interface WidgetQueryInput {
  entityKey: string
  segmentKey?: string
  filters: FilterPredicate[]
  globalFilters: GlobalFilters
  metric: MetricConfig
  dimension?: string
  dateRange: DateRange
  dateMode?: DateModeKey
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sort?: SortConfig
  limit?: number
}
```

### Compile Context

```typescript
export interface CompileCtx {
  tenantId: string
  userId: string
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  timezone: string
  permissions: PermissionSet
  permissionHash: string  // v2.2.2: Pre-computed for caching
}

// v2.2.2: Compute permission hash
function computePermissionHash(ctx: CompileCtx): string {
  const hashInput = {
    role: ctx.role,
    rowFilters: ctx.permissions.entities,
    // Include userId ONLY if permissions are truly per-user
    // (e.g., agent sees only assigned-to-self)
    userId: hasPerUserScope(ctx) ? ctx.userId : undefined
  }
  return crypto.createHash('sha256')
    .update(JSON.stringify(hashInput))
    .digest('hex')
    .substring(0, 16)
}

function hasPerUserScope(ctx: CompileCtx): boolean {
  // Check if any entity has a rowFilter referencing userId
  return Object.values(ctx.permissions.entities).some(ep => 
    ep.rowFilter?.some(f => f.field === 'assignedToId' && f.value === '$userId')
  )
}
```

### Query Hash (v2.2.2 - Complete)

```typescript
// v2.2.2: Hash MUST include ALL query-affecting inputs

export function computeQueryHash(input: WidgetQueryInput): string {
  // Stable stringify with sorted keys
  const hashInput = {
    entityKey: input.entityKey,
    segmentKey: input.segmentKey || null,
    filters: sortFilters(input.filters),
    globalFilters: sortObject(input.globalFilters),
    metric: input.metric,
    dimension: input.dimension || null,
    dateRange: normalizeDateRange(input.dateRange),
    dateMode: input.dateMode || null,
    granularity: input.granularity || null,
    sort: input.sort || null,
    limit: input.limit || null
  }
  
  return crypto.createHash('sha256')
    .update(stableStringify(hashInput))
    .digest('hex')
    .substring(0, 16)
}

// Stable stringify: sorted keys, consistent output
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, key) => {
        sorted[key] = value[key]
        return sorted
      }, {} as Record<string, unknown>)
    }
    return value
  })
}

function sortFilters(filters: FilterPredicate[]): FilterPredicate[] {
  return [...filters].sort((a, b) => 
    `${a.field}:${a.operator}`.localeCompare(`${b.field}:${b.operator}`)
  )
}
```

### Between Operator Compilation (v2.2.2)

```typescript
function compileBetweenOperator(predicate: FilterPredicate): PrismaWhere {
  const { field, value } = predicate
  
  // v2.2.2 Contract: value MUST be [min, max] array
  if (!Array.isArray(value) || value.length !== 2) {
    throw new QueryCompileError(
      `'between' operator requires [min, max] array, got: ${JSON.stringify(value)}`
    )
  }
  
  const [min, max] = value
  return {
    [field]: {
      gte: min,
      lte: max
    }
  }
}
```

### Full Query Compiler

```typescript
export function compileQuery(
  input: WidgetQueryInput,
  ctx: CompileCtx
): CompiledQuery {
  const entity = getEntity(input.entityKey)
  if (!entity) {
    throw new QueryCompileError(`Unknown entity: ${input.entityKey}`)
  }

  // v2.2.2: Validate dimension groupBy compatibility
  if (input.dimension) {
    validateDimensionGroupBy(input.entityKey, input.dimension)
  }

  // 1. Tenant scope (mandatory)
  const tenantWhere = compileTenantScope(entity, ctx)

  // 2. Permission scope (after tenant)
  const permissionWhere = compilePermissionWhere(input.entityKey, ctx)

  // 3. Segment predicate
  let segmentWhere: PrismaWhere = {}
  if (input.segmentKey) {
    const segment = getSegment(input.entityKey, input.segmentKey)
    if (!segment) {
      throw new QueryCompileError(`Unknown segment: ${input.segmentKey}`)
    }
    segmentWhere = compileSegment(segment, ctx)
  }

  // 4. Widget filters
  const filterWhere = compileFilters(input.entityKey, input.filters, ctx)

  // 5. Global filters
  const globalWhere = compileGlobalFilters(input.entityKey, input.globalFilters, ctx)

  // 6. Date range
  const dateMode = input.dateMode || entity.dateModes.default
  const dateWhere = compileDateRange(input.dateRange, dateMode, entity, ctx)

  // Combine all conditions
  const where: PrismaWhere = {
    AND: [
      tenantWhere,
      permissionWhere,
      segmentWhere,
      filterWhere,
      globalWhere,
      dateWhere
    ].filter(w => Object.keys(w).length > 0)
  }

  // Build orderBy
  let orderBy: PrismaOrderBy | undefined
  if (input.sort) {
    orderBy = { [input.sort.field]: input.sort.dir }
  }

  // v2.2.2: Complete hash
  const hash = computeQueryHash(input)

  return {
    entityKey: input.entityKey,
    table: entity.table,
    where,
    orderBy,
    take: input.limit,
    dateMode,
    hash
  }
}

// v2.2.2: Validate dimension is groupable on this entity
function validateDimensionGroupBy(entityKey: string, dimensionKey: string): void {
  const dimension = getDimension(dimensionKey)
  if (!dimension) {
    throw new QueryCompileError(`Unknown dimension: ${dimensionKey}`)
  }
  
  if (dimension.groupByMode === 'junction_required') {
    if (dimension.junctionEntity !== entityKey) {
      throw new QueryCompileError(
        `Dimension '${dimensionKey}' requires junction entity '${dimension.junctionEntity}', ` +
        `but query uses '${entityKey}'. Use the junction entity for groupBy.`
      )
    }
  }
  
  // Check entity compatibility
  if (dimension.entities[0] !== '*' && !dimension.entities.includes(entityKey)) {
    throw new QueryCompileError(
      `Dimension '${dimensionKey}' is not available for entity '${entityKey}'`
    )
  }
}
```

---

## 6. Date Semantics

Same as 2.2.1. All date presets resolve in tenant timezone.

| Mode | Meaning | Typical Entities |
|------|---------|------------------|
| `entity_created` | entity.createdAt | records, tasks, phones, emails |
| `record_created` | record.createdAt | phones/emails (by parent record creation) |
| `junction_created` | junction.createdAt | record_tags, record_motivations |
| `activity_created` | activity.createdAt | activity |

---

## 7. Builder UX Flow

Same as 2.2.1, with one addition:

**v2.2.2:** UI must NOT show `tag` or `motivation` as groupBy options for `records` entity. These dimensions only appear when user selects `record_tags` or `record_motivations` entity.

---

## 8. KPI Mode vs Builder Mode

Same as 2.2.1.

---

## 9. Global Filters

```typescript
export interface GlobalFilters {
  dateRange: DateRangePreset | { start: Date; end: Date }
  market?: { states?: string[]; cities?: string[] }
  assignees?: string[] | null
  temperature?: ('hot' | 'warm' | 'cold')[]
  status?: string[]
  tags?: { include?: string[]; exclude?: string[] }
  motivations?: { include?: string[]; exclude?: string[] }
  callReady?: boolean
  board?: { boardId?: string; columnId?: string }
}
```

### Applicability Matrix (v2.2.2 Clarified)

| Global Filter | records | tasks | phones | emails | record_tags | record_motivations |
|---------------|---------|-------|--------|--------|-------------|-------------------|
| dateRange | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| assignees | ✅ | ✅ | via record | via record | via record | via record |
| temperature | ✅ | via record | via record | via record | via record | via record |
| status | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| tags | ✅ | via record | via record | via record | ✅ (filter by tagId) | ❌ |
| motivations | ✅ | via record | via record | via record | ❌ | ✅ (filter by motivationId) |
| callReady | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**v2.2.2 Clarification:** For `record_tags`, the `tags` global filter means "filter junction rows by tagId" (to focus a chart on specific tags).

---

## 10. Metrics System

Same as 2.2.1.

---

## 11. Drilldowns (v2.2.2 - Safe Search)

### Request/Response

```typescript
export interface DrilldownRequest {
  widgetQuery: WidgetQueryInput
  page: number
  pageSize: number  // v2.2.2: Server enforces max (e.g., 100)
  sort?: SortConfig
  search?: string   // v2.2.2: Entity-scoped, sanitized
}

export interface DrilldownResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

### Search Safety (v2.2.2)

```typescript
// v2.2.2: Safe drilldown search compilation

const SEARCH_MAX_LENGTH = 100
const SEARCH_RATE_LIMIT = 10 // requests per second per user

export function compileDrilldownSearch(
  entityKey: string,
  search: string | undefined,
  ctx: CompileCtx
): PrismaWhere {
  if (!search || search.trim() === '') {
    return {}
  }

  const entity = getEntity(entityKey)
  const searchFields = entity.searchFields || []
  
  if (searchFields.length === 0) {
    // Entity doesn't support search
    return {}
  }

  // Sanitize input
  const sanitized = sanitizeSearchInput(search, entity.searchMaxLength || SEARCH_MAX_LENGTH)
  
  if (sanitized.length < 2) {
    // Too short, skip search
    return {}
  }

  // Build OR across searchable fields
  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: sanitized,
        mode: 'insensitive'
      }
    }))
  }
}

function sanitizeSearchInput(input: string, maxLength: number): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards
}
```

### Server-Side Enforcement

```typescript
export async function handleDrilldown(
  request: DrilldownRequest,
  ctx: CompileCtx
): Promise<DrilldownResponse> {
  // v2.2.2: Enforce max pageSize
  const MAX_PAGE_SIZE = 100
  const pageSize = Math.min(request.pageSize, MAX_PAGE_SIZE)
  
  // Recompile query server-side (never trust client)
  const compiled = compileQuery(request.widgetQuery, ctx)
  
  // Add search filter
  const searchWhere = compileDrilldownSearch(
    request.widgetQuery.entityKey,
    request.search,
    ctx
  )
  
  const where = {
    AND: [compiled.where, searchWhere].filter(w => Object.keys(w).length > 0)
  }
  
  // Execute with pagination
  const [rows, total] = await Promise.all([
    prisma[compiled.table].findMany({
      where,
      orderBy: request.sort ? { [request.sort.field]: request.sort.dir } : compiled.orderBy,
      skip: (request.page - 1) * pageSize,
      take: pageSize
    }),
    prisma[compiled.table].count({ where })
  ])
  
  return {
    rows,
    total,
    page: request.page,
    pageSize,
    hasMore: request.page * pageSize < total
  }
}
```

---

## 12. Stacks System

Same as 2.2.1.

---

## 13. Action Widgets

Same as 2.2.1.

---

## 14. System Dashboards

Same as 2.2.1.

---

## 15. Insights Layer

Same as 2.2.1.

---

## 16. Error Handling

Same as 2.2.1, plus:

| Code | HTTP | User Message | Recovery |
|------|------|--------------|----------|
| `QUERY_COMPILE_ERROR` | 400 | "Invalid widget configuration" | Show config panel |
| `UNKNOWN_FIELD_RESOLVER` | 400 | "Field not supported for filtering" | Remove filter |
| `INVALID_OPERATOR_VALUE` | 400 | "Invalid filter value format" | Fix filter value |
| `DIMENSION_GROUPBY_ERROR` | 400 | "Cannot group by this dimension" | Use correct entity |
| `SEARCH_TOO_SHORT` | 400 | "Search term too short" | Enter more characters |
| `PERMISSION_DENIED` | 403 | "You don't have access to this data" | Hide widget |
| `RATE_LIMITED` | 429 | "Too many requests" | Auto-retry with backoff |

---

## 17. Caching Strategy (v2.2.2 - Permission Hash + Dependency Map)

### Cache Key Structure (v2.2.2)

```typescript
function buildCacheKey(
  input: WidgetQueryInput,
  ctx: CompileCtx,
  version: number
): string {
  const queryHash = computeQueryHash(input)
  
  // v2.2.2: Use permissionHash, not raw userId
  return `w:${ctx.tenantId}:${input.entityKey}:v${version}:p:${ctx.permissionHash}:q:${queryHash}`
}
```

### Invalidation Dependency Map (v2.2.2)

```typescript
// v2.2.2: Define which entities to invalidate per mutation type

export const INVALIDATION_MAP: Record<string, string[]> = {
  // Mutation type → entities to invalidate
  'record.create': ['records'],
  'record.update': ['records'],
  'record.delete': ['records', 'record_tags', 'record_motivations', 'phones', 'emails'],
  
  'phone.create': ['phones', 'records'],  // records coverage changes
  'phone.update': ['phones'],
  'phone.delete': ['phones', 'records'],
  
  'email.create': ['emails', 'records'],
  'email.update': ['emails'],
  'email.delete': ['emails', 'records'],
  
  'recordTag.create': ['record_tags', 'records'],  // records tagCount changes
  'recordTag.delete': ['record_tags', 'records'],
  
  'recordMotivation.create': ['record_motivations', 'records'],
  'recordMotivation.delete': ['record_motivations', 'records'],
  
  'task.create': ['tasks'],
  'task.update': ['tasks'],
  'task.delete': ['tasks'],
  
  'tag.create': ['tags'],
  'tag.update': ['tags', 'record_tags'],  // label might change
  'tag.delete': ['tags', 'record_tags'],
  
  'motivation.create': ['motivations'],
  'motivation.update': ['motivations', 'record_motivations'],
  'motivation.delete': ['motivations', 'record_motivations'],
}

// Invalidate affected entities
export async function invalidateOnMutation(
  tenantId: string,
  mutationType: string
): Promise<void> {
  const entitiesToInvalidate = INVALIDATION_MAP[mutationType] || []
  
  await Promise.all(
    entitiesToInvalidate.map(entityKey =>
      redis.incr(`cacheVersion:${tenantId}:${entityKey}`)
    )
  )
}
```

### Cache Flow

```typescript
async function fetchWidgetData(
  input: WidgetQueryInput,
  ctx: CompileCtx
): Promise<WidgetData> {
  // Get current version for all relevant entities
  const version = await redis.get(`cacheVersion:${ctx.tenantId}:${input.entityKey}`) || 0
  
  const cacheKey = buildCacheKey(input, ctx, Number(version))
  
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  const compiled = compileQuery(input, ctx)
  const data = await executeQuery(compiled, ctx)
  
  await redis.setex(cacheKey, 300, JSON.stringify(data)) // 5 min TTL
  
  return data
}
```

---

## 18. Permissions

Same as 2.2.1, with clarification:

### Permission Hash Rules (v2.2.2)

| Scenario | Include userId in hash? |
|----------|------------------------|
| Admin sees all | No |
| Manager sees team | No (use teamId) |
| Agent sees only assigned-to-self | **Yes** |
| Viewer sees all (read-only) | No |

```typescript
function computePermissionHash(ctx: CompileCtx): string {
  const hashInput: Record<string, unknown> = {
    role: ctx.role
  }
  
  // Include rowFilters that affect data visibility
  const entityFilters: Record<string, unknown> = {}
  for (const [entityKey, perm] of Object.entries(ctx.permissions.entities)) {
    if (perm.rowFilter?.length) {
      entityFilters[entityKey] = perm.rowFilter
    }
  }
  if (Object.keys(entityFilters).length > 0) {
    hashInput.entityFilters = entityFilters
  }
  
  // Include userId ONLY if there's a per-user scope
  if (hasPerUserRowFilter(ctx)) {
    hashInput.userId = ctx.userId
  }
  
  return crypto.createHash('sha256')
    .update(stableStringify(hashInput))
    .digest('hex')
    .substring(0, 16)
}

function hasPerUserRowFilter(ctx: CompileCtx): boolean {
  return Object.values(ctx.permissions.entities).some(ep =>
    ep.rowFilter?.some(f => 
      f.value === '$userId' || 
      f.value === ctx.userId
    )
  )
}
```

---

## 19. Counter Update Mechanism (v2.2.2 - New Section)

### The Problem

Denormalized counters (`phoneCount`, `emailCount`, `tagCount`, `motivationCount`) on Record will drift if not updated correctly.

### Counter Update Options

| Option | Consistency | Complexity | Recommendation |
|--------|-------------|------------|----------------|
| **DB Triggers** | Best | High (env-dependent) | Use if DBA available |
| **Transaction Hook** | Good | Medium | **Recommended** |
| **Async Queue** | Eventually consistent | Low | Safety net only |

### Recommended: Transaction Hook (Prisma Middleware)

```typescript
// src/lib/prisma/counterMiddleware.ts

import { Prisma } from '@prisma/client'

export const counterMiddleware: Prisma.Middleware = async (params, next) => {
  const result = await next(params)
  
  // Phone counters
  if (params.model === 'RecordPhoneNumber') {
    if (params.action === 'create') {
      await updateRecordCounter(params.args.data.recordId, 'phoneCount', 1)
    } else if (params.action === 'delete') {
      await updateRecordCounter(result.recordId, 'phoneCount', -1)
    } else if (params.action === 'deleteMany') {
      // Queue async reconciliation for affected records
      await queueCounterReconciliation(params.args.where)
    }
  }
  
  // Email counters
  if (params.model === 'RecordEmail') {
    if (params.action === 'create') {
      await updateRecordCounter(params.args.data.recordId, 'emailCount', 1)
    } else if (params.action === 'delete') {
      await updateRecordCounter(result.recordId, 'emailCount', -1)
    }
  }
  
  // Tag counters
  if (params.model === 'RecordTag') {
    if (params.action === 'create') {
      await updateRecordCounter(params.args.data.recordId, 'tagCount', 1)
    } else if (params.action === 'delete') {
      await updateRecordCounter(result.recordId, 'tagCount', -1)
    }
  }
  
  // Motivation counters
  if (params.model === 'RecordMotivation') {
    if (params.action === 'create') {
      await updateRecordCounter(params.args.data.recordId, 'motivationCount', 1)
    } else if (params.action === 'delete') {
      await updateRecordCounter(result.recordId, 'motivationCount', -1)
    }
  }
  
  return result
}

async function updateRecordCounter(
  recordId: string,
  field: 'phoneCount' | 'emailCount' | 'tagCount' | 'motivationCount',
  delta: number
): Promise<void> {
  await prisma.record.update({
    where: { id: recordId },
    data: { [field]: { increment: delta } }
  })
}
```

### Async Reconciliation Job (Safety Net)

```typescript
// src/jobs/reconcileCounters.ts

export async function reconcileCounters(workspaceId: string): Promise<void> {
  // Get all records for workspace
  const records = await prisma.record.findMany({
    where: { workspaceId },
    select: { id: true }
  })
  
  for (const record of records) {
    const [phoneCount, emailCount, tagCount, motivationCount] = await Promise.all([
      prisma.recordPhoneNumber.count({ where: { recordId: record.id } }),
      prisma.recordEmail.count({ where: { recordId: record.id } }),
      prisma.recordTag.count({ where: { recordId: record.id } }),
      prisma.recordMotivation.count({ where: { recordId: record.id } })
    ])
    
    await prisma.record.update({
      where: { id: record.id },
      data: { phoneCount, emailCount, tagCount, motivationCount }
    })
  }
}

// Nightly job: reconcile records modified in last 24h
export async function nightlyCounterReconciliation(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const workspaces = await prisma.record.findMany({
    where: { updatedAt: { gte: yesterday } },
    select: { workspaceId: true },
    distinct: ['workspaceId']
  })
  
  for (const { workspaceId } of workspaces) {
    await reconcileCounters(workspaceId)
  }
}
```

### Admin Tool: Manual Rebuild

```typescript
// API: POST /api/admin/rebuild-counters
export async function rebuildCountersForWorkspace(
  workspaceId: string
): Promise<{ recordsUpdated: number }> {
  await reconcileCounters(workspaceId)
  
  const count = await prisma.record.count({ where: { workspaceId } })
  return { recordsUpdated: count }
}
```

---

## 20. UI/UX Guidelines

Same as 2.2.1.

---

## 21. Execution Phases (v2.2.2 - Updated Acceptance Criteria)

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core infrastructure with v2.2.2 contracts

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Tenant scope system | P0 | Direct + via_join working |
| Junction entities | P0 | `record_tags`, `record_motivations` exist with `workspaceId` |
| Denormalized counters | P0 | `phoneCount`, `tagCount`, etc. on Record |
| Counter update hooks | P0 | Prisma middleware updates counters |
| Entity Registry | P0 | All entities with `searchFields` |
| Segment Registry | P0 | All operators including `between` |
| Dimension Registry | P0 | `groupByMode` defined for all |
| Query Compiler | P0 | Validates dimension groupBy compatibility |
| Complete query hash | P0 | Includes all inputs with stable stringify |
| Permission hash | P0 | Cache key uses hash, not userId |
| Invalidation map | P0 | Mutations bump dependent entities |
| Date Semantics | P0 | Timezone-aware resolution |

### Phase 1 Acceptance Checklist (v2.2.2)

- [ ] Tenant scope works for direct + via_join entities
- [ ] Permission rowFilter is enforced on all queries (aggregate + drilldown)
- [ ] Junction entities exist and support `junction_created`
- [ ] Counters update correctly on create/delete of phones/emails/tags/motivations
- [ ] GroupBy rules: many-to-many dims handled via junction entities
- [ ] Stable hashing covers all query-affecting inputs
- [ ] Cache keys include permission hash (not necessarily userId)
- [ ] Invalidation map bumps dependent entities per mutation
- [ ] Drilldown search is safe, scoped, and rate-limited
- [ ] Max pageSize enforced server-side (e.g., 100)
- [ ] `between` operator validates `[min, max]` array format
- [ ] Nightly counter reconciliation job exists

### Phase 2-6

Same as 2.2.1.

---

## 22. Technical Specifications

### Prisma Schema (v2.2.2)

```prisma
model Record {
  id               String   @id @default(cuid())
  workspaceId      String

  // ... other fields

  // Denormalized counters (v2.2.2 contract)
  phoneCount       Int @default(0)
  emailCount       Int @default(0)
  tagCount         Int @default(0)
  motivationCount  Int @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  phones           RecordPhoneNumber[]
  emails           RecordEmail[]
  tags             RecordTag[]
  motivations      RecordMotivation[]

  @@index([workspaceId])
  @@index([workspaceId, createdAt])
}

model RecordTag {
  id          String   @id @default(cuid())
  workspaceId String
  recordId    String
  tagId       String
  createdAt   DateTime @default(now())

  record      Record   @relation(fields: [recordId], references: [id], onDelete: Cascade)
  tag         Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([recordId, tagId])
  @@index([workspaceId])
  @@index([workspaceId, createdAt])
  @@index([recordId])
  @@index([tagId])
}

model RecordMotivation {
  id            String   @id @default(cuid())
  workspaceId   String
  recordId      String
  motivationId  String
  createdAt     DateTime @default(now())

  record        Record     @relation(fields: [recordId], references: [id], onDelete: Cascade)
  motivation    Motivation @relation(fields: [motivationId], references: [id], onDelete: Cascade)

  @@unique([recordId, motivationId])
  @@index([workspaceId])
  @@index([workspaceId, createdAt])
  @@index([recordId])
  @@index([motivationId])
}
```

### File Structure (v2.2.2)

```
src/
├── lib/
│   └── analytics/
│       ├── registry/
│       │   ├── entities.ts      # With searchFields
│       │   ├── segments.ts      # With operator contracts
│       │   ├── metrics.ts
│       │   └── dimensions.ts    # With groupByMode
│       ├── query/
│       │   ├── compiler.ts      # With dimension validation
│       │   ├── fieldResolver.ts
│       │   ├── operatorCompiler.ts  # With between handling
│       │   ├── searchCompiler.ts    # v2.2.2: Safe search
│       │   ├── tenantScope.ts
│       │   ├── permissionScope.ts
│       │   ├── permissionHash.ts    # v2.2.2
│       │   ├── queryHash.ts         # v2.2.2: Complete hash
│       │   └── dateSemantics.ts
│       ├── cache/
│       │   ├── widgetCache.ts
│       │   ├── versionBump.ts
│       │   └── invalidationMap.ts   # v2.2.2
│       ├── counters/
│       │   ├── middleware.ts        # v2.2.2
│       │   └── reconciliation.ts    # v2.2.2
│       └── types.ts
├── app/
│   └── api/
│       └── analytics/
│           ├── widget/route.ts
│           ├── drilldown/route.ts   # With safe search
│           └── ...
├── jobs/
│   └── reconcileCounters.ts         # v2.2.2
└── components/
    └── analytics/
        └── ...
```

---

## 23. Migration Mapping + Audit

Same as 2.2.1, plus:

### Counter Migration

If counters don't exist yet:
1. Add columns with `@default(0)`
2. Run migration
3. Run `reconcileCounters` for all workspaces
4. Verify counts match actual relations

---

## 24. Success Metrics

Same as 2.2.1.

---

## Quick "Reality Check" Summary

### What 2.2.2 Guarantees

| Guarantee | How |
|-----------|-----|
| **Tenant scope is correct** | `workspaceId`, not `createdById` |
| **Permissions don't leak into caching** | Cache key uses `permissionHash` |
| **Tag usage is modeled correctly** | Junction entity `record_tags` |
| **"count" predicates are queryable** | Denormalized counters on Record |
| **Counters stay accurate** | Transaction hooks + nightly reconciliation |
| **Drilldowns can't be tampered with** | Client sends `widgetQuery`, server recompiles |
| **Redis won't get nuked by KEYS** | Version bump invalidation |
| **GroupBy works in Prisma** | Many-to-many uses junction entities |
| **Cache doesn't explode per-user** | Permission hash, not raw userId |
| **Related widgets stay fresh** | Invalidation dependency map |
| **Search is safe** | Entity-scoped, sanitized, rate-limited |

---

## Appendix A: Type Definitions Summary

```typescript
// Core Types
type EntityKey = 'records' | 'tasks' | 'tags' | 'motivations' | 'phones' | 'emails' | 'activity' | 'record_tags' | 'record_motivations'
type SegmentKey = string
type MetricKey = string
type DimensionKey = string
type DateModeKey = 'entity_created' | 'record_created' | 'junction_created' | 'activity_created'
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time'
type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null' | 'exists' | 'not_exists' | 'between'
type VisualizationType = 'kpi' | 'bar' | 'pie' | 'line' | 'area' | 'table' | 'action'
type TenantScopeMode = 'direct' | 'via_join'
type GroupByMode = 'direct' | 'junction_required'

// Compile Context (v2.2.2)
interface CompileCtx {
  tenantId: string
  userId: string
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  timezone: string
  permissions: PermissionSet
  permissionHash: string  // v2.2.2
}
```

---

## Appendix B: Quick Reference

### Entity → GroupBy Dimensions

| Entity | Available Dimensions | Notes |
|--------|---------------------|-------|
| records | status, temperature, assignedTo, day, week, month | NO tag/motivation (use junction) |
| tasks | status, priority, assignedTo, day, week, month | |
| record_tags | tag, day, week, month | Use for "Top Tags" |
| record_motivations | motivation, day, week, month | Use for "Top Motivations" |
| phones | phoneType, day, week, month | |
| emails | day, week, month | |

### Invalidation Dependency Map

| Mutation | Entities to Invalidate |
|----------|----------------------|
| phone.create/delete | phones, records |
| email.create/delete | emails, records |
| recordTag.create/delete | record_tags, records |
| recordMotivation.create/delete | record_motivations, records |
| tag.update/delete | tags, record_tags |
| motivation.update/delete | motivations, record_motivations |

---

*End of DockInsight 2.2.2 Implementation Plan*
