# DockInsight 2.2.2 — Implementation Plan (Production-Hardened)

> **Databox-grade analytics + PropSift operations console**
>
> v2.2.2 is v2.2.1 hardened for real Prisma/Redis implementation: groupBy contracts for many-to-many, counter update mechanisms, permission-hash caching, invalidation dependency maps, complete query hashing, operator value contracts, and safe drilldown search.

---

## Changelog (2.2.1 → 2.2.2)

### Production Contracts Locked

| # | Contract | Implementation |
|---|----------|----------------|
| 1 | **GroupBy on relation trap** | Many-to-many dimensions must use junction entity (Prisma can't groupBy through relations) |
| 2 | **Counter drift** | Service-layer transactions + async reconciliation (NOT middleware) |
| 3 | **Cache explosion** | Cache key uses `permissionHash`, not raw `userId` |
| 4 | **Stale dependent widgets** | Dependency-version caching (cache key includes ALL entity versions query depends on) |
| 5 | **Hash collisions** | Query hash includes ALL query-affecting inputs with stable stringify + `ctx` |
| 6 | **Operator ambiguity** | `between` requires `[min, max]` array format |
| 7 | **Search injection** | Drilldown search is entity-scoped with `searchFields` registry (resolver-based) |
| 8 | **Acceptance criteria** | Added comprehensive Phase 1 checklist |
| 9 | **Search relation fields** | `searchFields` supports scalar + relation_some for phones/emails |
| 10 | **Counter transaction safety** | Service-layer `$transaction`, not middleware (avoids recursion + tx isolation) |
| 11 | **Timezone in query hash** | Date presets resolve to ISO timestamps before hashing (no preset strings) |
| 12 | **Wildcard check robustness** | `dimension.entities.includes('*')` instead of `[0] !== '*'` |
| 13 | **Label join caching rule** | Widgets return IDs, labels resolved separately with own versioning |
| 14 | **Registry version in cache** | `REGISTRY_VERSION` in cache key prevents stale shapes after deploy |
| 15 | **Canonical dateRange** | `globalFilters.dateRange` is default, widget can override; hash only effective range |
| 16 | **Dependency-version caching** | Cache key includes versions of ALL entities query depends on |
| 17 | **Rate limit enforcement** | Redis-based rate limiter for drilldown search |
| 18 | **Label versioning** | Separate `labelVersion` keys for tags/motivations |

---

## Non-Negotiables (Frozen After 2.2.2)

These contracts are **locked** and must not be changed without a major version bump:

| Contract | Why It's Frozen |
|----------|-----------------|
| **Tenant scope = `workspaceId`** | Security foundation |
| **Permission hash in cache key** | Prevents cross-user data leaks |
| **Junction entity for many-to-many groupBy** | Prisma limitation, no workaround |
| **Dependency-version caching** | Prevents stale cross-entity data |
| **Service-layer transactions for counters** | Middleware is not transaction-safe |
| **Server recompiles drilldown** | Client cannot submit CompiledQuery |
| **`computeQueryHash(input, ctx)` signature** | Timezone resolution requires ctx |
| **Resolved ISO timestamps in hash** | No preset strings, no midnight bugs |

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
  // v2.2.2 FIX: Standardized via_join fields
  joinEntity?: string      // via_join: registry key, e.g., 'records' (for cache deps)
  joinRelation?: string    // via_join: Prisma relation name, e.g., 'record' (for query building)
  joinField?: string       // via_join: field on joined model, e.g., 'workspaceId'
}

export type PermissionScope = 'adminOnly' | 'team' | 'roleBased'

export interface EntityDefinition {
  key: string
  label: string
  labelPlural: string
  // v2.2.2 FIX: Use delegate name (lowerCamelCase) for prisma[delegate] calls
  delegate: string // Prisma client delegate, e.g., 'recordPhoneNumber' (not 'RecordPhoneNumber')

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

  // v2.2.2: Drilldown search configuration (resolver-based)
  searchFields?: SearchFieldDef[]  // Supports scalar + relation search
  searchMaxLength?: number // default: 100
  
  drilldownRoute: string
  drilldownQueryParam: string
  quickActions: ActionType[]

  joins?: EntityJoin[]
}
```

### SearchFieldDef Type (v2.2.2 - Resolver-Based)

```typescript
// v2.2.2: Search fields can be scalar or relation-based
export type SearchFieldDef =
  | { kind: 'scalar'; field: string }
  | { kind: 'relation_some'; relation: string; field: string }
```

### Entity Keys (v2.2.2)

| Entity Key | Delegate | Tenant Scope | Search Fields |
|------------|----------|--------------|---------------|
| `records` | `record` | direct: `workspaceId` | `[{kind:'scalar',field:'name'}, {kind:'scalar',field:'address'}, {kind:'relation_some',relation:'phones',field:'phoneNumber'}, {kind:'relation_some',relation:'emails',field:'email'}]` |
| `tasks` | `task` | direct: `workspaceId` | `[{kind:'scalar',field:'title'}, {kind:'scalar',field:'description'}]` |
| `phones` | `recordPhoneNumber` | via_join: `joinEntity:'records', joinRelation:'record', joinField:'workspaceId'` | `[{kind:'scalar',field:'phoneNumber'}]` |
| `emails` | `recordEmail` | via_join: `joinEntity:'records', joinRelation:'record', joinField:'workspaceId'` | `[{kind:'scalar',field:'email'}]` |
| `activity` | `activityLog` | direct: `workspaceId` | `[{kind:'scalar',field:'description'}]` |
| `record_tags` | `recordTag` | direct: `workspaceId` | `[]` (no search) |
| `record_motivations` | `recordMotivation` | direct: `workspaceId` | `[]` (no search) |
| `tags` | `tag` | direct: `workspaceId` | `[{kind:'scalar',field:'name'}]` |
| `motivations` | `motivation` | direct: `workspaceId` | `[{kind:'scalar',field:'name'}]` |

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

| Dimension | Entities | GroupBy Mode | Junction Entity | Notes |
|-----------|----------|--------------|-----------------|-------|
| `status` | records | direct | - | Scalar field |
| `temperature` | records | direct | - | Enum field |
| `assignedTo` | records, tasks | direct | - | FK field (assignedToId) |
| `tag` | record_tags | junction_required | `record_tags` | Use junction entity |
| `motivation` | record_motivations | junction_required | `record_motivations` | Use junction entity |
| `day`, `week`, `month` | * | direct | - | Date bucket on createdAt |
| `phoneType` | phones | direct | - | Enum field |
| `taskStatus` | tasks | direct | - | Enum field |
| `priority` | tasks | direct | - | Enum field |

**v2.2.2 FIX:** `tag` and `motivation` dimensions now have `groupByMode: 'junction_required'` with explicit `junctionEntity` for clearer error messages.

**Removed from records dimensions:** `tag`, `motivation` (must use junction entities)

---

## 5. Query Compiler & Field Resolver

### Compiler Inputs (server-safe)

```typescript
export interface WidgetQueryInput {
  entityKey: string
  segmentKey?: string
  filters: FilterPredicate[]
  globalFilters: GlobalFilters  // includes dateRange (dashboard default)
  metric: MetricConfig
  dimension?: string
  dateRange?: DateRangePreset | { start: Date; end: Date }  // v2.2.2: OPTIONAL override
  dateMode?: DateModeKey
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sort?: SortConfig
  limit?: number
}
```

### Canonical DateRange Rule (v2.2.2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 CANONICAL DATERANGE RULE (v2.2.2)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  globalFilters.dateRange = dashboard default (always present)           │
│  input.dateRange = widget-level override (optional)                     │
│                                                                          │
│  Compiler rule:                                                          │
│    const effectiveDateRange = input.dateRange ?? input.globalFilters.dateRange │
│                                                                          │
│  Hash rule:                                                              │
│    Hash ONLY the resolved effective date range (ISO timestamps)         │
│    Do NOT hash both, do NOT hash preset strings                         │
│                                                                          │
│  This prevents:                                                          │
│    - Double-filtering bugs ("why is my chart empty")                    │
│    - Midnight cache bugs (preset strings in hash)                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
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
  // v2.2.2 FIX: Add scopeKey for team-based permissions
  scopeKey?: string  // e.g., teamId, roleGroupId - used when manager sees team
}

// v2.2.2: Compute permission hash
function computePermissionHash(ctx: CompileCtx): string {
  const hashInput: Record<string, unknown> = {
    role: ctx.role,
    rowFilters: ctx.permissions.entities,
  }
  
  // v2.2.2 FIX: Include scopeKey for team-based permissions
  if (ctx.scopeKey) {
    hashInput.scopeKey = ctx.scopeKey
  }
  
  // Include userId ONLY if permissions are truly per-user
  if (hasPerUserScope(ctx)) {
    hashInput.userId = ctx.userId
  }
  
  return crypto.createHash('sha256')
    .update(stableStringify(hashInput))  // v2.2.2 FIX: Use stableStringify
    .digest('hex')
    .substring(0, 16)
}

// v2.2.2 FIX: Check for ANY $userId reference in rowFilters, not just assignedToId
function hasPerUserScope(ctx: CompileCtx): boolean {
  return Object.values(ctx.permissions.entities).some(ep => 
    ep.rowFilter?.some(f => f.value === '$userId')  // Any field with $userId
  )
}
```

### Query Hash (v2.2.2 - Complete + Timezone-Resolved)

```typescript
// v2.2.2: Hash MUST include ALL query-affecting inputs
// v2.2.2: Date presets must be resolved to ISO timestamps BEFORE hashing
// v2.2.2: Signature is computeQueryHash(input, ctx) - ctx is REQUIRED for timezone

const REGISTRY_VERSION = '2.2.2'  // Bump on registry changes to invalidate old cached shapes

export function computeQueryHash(input: WidgetQueryInput, ctx: CompileCtx): string {
  // v2.2.2: Use effective date range (widget override OR global default)
  const effectiveDateRange = input.dateRange ?? input.globalFilters.dateRange
  
  // v2.2.2: Resolve to actual timestamps using tenant timezone
  const resolvedDateRange = resolveDateRange(effectiveDateRange, ctx.timezone)
  
  // Stable stringify with sorted keys
  // v2.2.2: Do NOT include globalFilters.dateRange separately (already in effectiveDateRange)
  // v2.2.2: Do NOT include preset strings, only resolved ISO timestamps
  // v2.2.2 FIX: Normalize globalFilters to prevent hash instability from array order
  const normalizedGlobalFilters = normalizeGlobalFilters(
    omit(input.globalFilters, ['dateRange'])
  )
  
  const hashInput = {
    registryVersion: REGISTRY_VERSION,
    entityKey: input.entityKey,
    segmentKey: input.segmentKey || null,
    filters: sortFilters(input.filters),
    // v2.2.2: Hash globalFilters WITHOUT dateRange, WITH sorted arrays
    globalFiltersExceptDate: normalizedGlobalFilters,
    metric: input.metric,
    dimension: input.dimension || null,
    // v2.2.2: ONLY resolved ISO timestamps, no preset strings
    dateStartISO: resolvedDateRange.start.toISOString(),
    dateEndISO: resolvedDateRange.end.toISOString(),
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

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) delete result[key]
  return result
}

// Stable stringify: sorted keys, consistent output
// v2.2.2 FIX: Do NOT auto-sort arrays - only sort known set-like arrays explicitly
// Auto-sorting can accidentally canonicalize arrays where order matters
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, key) => {
        sorted[key] = value[key]
        return sorted
      }, {} as Record<string, unknown>)
    }
    // Arrays: pass through as-is (sorting done explicitly in normalizeGlobalFilters, sortFilters, etc.)
    return value
  })
}

// v2.2.2 FIX: Include value in sort key to prevent instability when values differ
function sortFilters(filters: FilterPredicate[]): FilterPredicate[] {
  return [...filters].sort((a, b) => 
    `${a.field}:${a.operator}:${stableStringify(a.value)}`.localeCompare(
      `${b.field}:${b.operator}:${stableStringify(b.value)}`
    )
  )
}

// v2.2.2 FIX: Normalize globalFilters to prevent hash instability
// Problem: ['hot','warm'] vs ['warm','hot'] = different hash = cache fragmentation
// v2.2.2 CRITICAL FIX: Must include ALL filter keys, not just known ones
// Otherwise market, board, callReady, etc. are dropped → cache collisions
function normalizeGlobalFilters(gf: Omit<GlobalFilters, 'dateRange'>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  
  // Process all keys from the input (don't drop any!)
  for (const key of Object.keys(gf).sort()) {
    const value = (gf as Record<string, unknown>)[key]
    
    if (value === undefined || value === null) {
      continue  // Skip undefined/null
    }
    
    // Known array fields that should be sorted (set-like semantics)
    if (key === 'assignees' || key === 'status' || key === 'temperature') {
      result[key] = Array.isArray(value) ? [...value].sort() : value
    }
    // Known nested include/exclude objects
    else if (key === 'tags' || key === 'motivations') {
      const nested = value as { include?: string[]; exclude?: string[] }
      result[key] = {
        include: nested.include ? [...nested.include].sort() : undefined,
        exclude: nested.exclude ? [...nested.exclude].sort() : undefined,
      }
    }
    // v2.2.2 FIX: market.states/cities are also set-like arrays that need sorting
    else if (key === 'market') {
      const m = value as { states?: string[]; cities?: string[] }
      result[key] = {
        states: m.states ? [...m.states].sort() : undefined,
        cities: m.cities ? [...m.cities].sort() : undefined,
      }
    }
    // All other keys: pass-through as-is (board, callReady, etc.)
    // These are query-affecting and MUST be included in hash
    else {
      result[key] = value
    }
  }
  
  return result
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

  // 5. Global filters (v2.2.2: MUST exclude dateRange to prevent double-filtering)
  const globalWhere = compileGlobalFilters(input.entityKey, input.globalFilters, ctx, {
    excludeDateRange: true  // CRITICAL: dateRange handled in step 6 only
  })

  // 6. Date range (v2.2.2: SINGLE date filter - effective range only)
  // Widget dateRange overrides globalFilters.dateRange (never both)
  const effectiveDateRange = input.dateRange ?? input.globalFilters.dateRange
  const dateMode = input.dateMode || entity.dateModes.default
  const dateWhere = compileDateRange(effectiveDateRange, dateMode, entity, ctx)

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

  // v2.2.2: Compute dependencies for cache invalidation
  const deps = computeQueryDeps(input, entity, ctx)

  // v2.2.2: Complete hash with ctx (required for timezone)
  const hash = computeQueryHash(input, ctx)

  return {
    entityKey: input.entityKey,
    delegate: entity.delegate,  // v2.2.2 FIX: Use delegate for prisma[delegate] calls
    where,
    orderBy,
    take: input.limit,
    dateMode,
    hash,
    deps  // v2.2.2: Cache dependencies
  }
}

// v2.2.2: Compute all entity dependencies for cache invalidation
// v2.2.2 FIX: joinPath MUST use registry entity keys, not Prisma relation names
// Registry keys: 'records', 'phones', 'emails', 'record_tags', etc.
// Prisma relations: 'record', 'phone', 'email', 'recordTags', etc.
// ALWAYS use registry keys in deps to match cacheVersion keys

// v2.2.2 CRITICAL FIX: deps must include ALL entities the query depends on
// If any global filter applies "via record" join, records must be in deps
// Otherwise record.update won't invalidate phone/email widgets that filter by record fields

function computeQueryDeps(
  input: WidgetQueryInput,
  entity: EntityDefinition,
  ctx: CompileCtx
): string[] {
  const deps = new Set<string>()
  
  // 1. Always include the primary entity (registry key)
  deps.add(input.entityKey)
  
  // 2. Include tenant scope join entity (via_join)
  if (entity.tenantScope.mode === 'via_join' && entity.tenantScope.joinEntity) {
    deps.add(entity.tenantScope.joinEntity)  // e.g., 'records' (not 'record')
  }
  
  // 3. Include entities referenced by global filters
  // v2.2.2 CRITICAL FIX: Check ALL global filters, not just a few
  const gf = input.globalFilters
  
  // Tag/motivation filters → junction entities
  if (gf.tags?.include?.length || gf.tags?.exclude?.length) {
    deps.add('record_tags')
  }
  if (gf.motivations?.include?.length || gf.motivations?.exclude?.length) {
    deps.add('record_motivations')
  }
  
  // v2.2.2 CRITICAL FIX: Any filter that applies "via record" join requires records in deps
  // This includes: status, temperature, assignees, market, board, callReady, etc.
  // If entity is NOT records but these filters are present, they apply via record join
  
  // v2.2.2 FIX: Check presence, not truthiness (callReady: false is still query-affecting)
  const hasAssignees = Array.isArray(gf.assignees) && gf.assignees.length > 0
  const hasStatus = Array.isArray(gf.status) && gf.status.length > 0
  const hasTemperature = Array.isArray(gf.temperature) && gf.temperature.length > 0
  const hasMarket = !!((gf as any).market && (
    ((gf as any).market.states?.length ?? 0) > 0 || 
    ((gf as any).market.cities?.length ?? 0) > 0
  ))
  const hasBoard = !!((gf as any).board && (
    (gf as any).board.boardId || (gf as any).board.columnId
  ))
  // IMPORTANT: callReady: false is still a filter, so check presence not truthiness
  const hasCallReady = (gf as any).callReady !== undefined
  
  const filtersApplyViaRecord = 
    hasAssignees || hasStatus || hasTemperature || hasMarket || hasBoard || hasCallReady
  
  if (filtersApplyViaRecord && input.entityKey !== 'records') {
    deps.add('records')  // These filters join through records
  }
  
  // 4. Include entities used by permission filters
  const entityPerm = ctx.permissions.entities[input.entityKey]
  if (entityPerm?.rowFilter?.length) {
    // Any permission filter on a via_join entity likely references records
    if (entity.tenantScope.mode === 'via_join') {
      deps.add('records')
    }
  }
  
  return Array.from(deps).sort()
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
  // v2.2.2 Patch: Use includes('*') instead of [0] !== '*' for robustness
  const isWildcard = dimension.entities.includes('*')
  if (!isWildcard && !dimension.entities.includes(entityKey)) {
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

### Search Safety (v2.2.2 - Resolver-Based)

```typescript
// v2.2.2: Safe drilldown search compilation with resolver-based fields

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

  // v2.2.2: Build OR across searchable fields using resolver-based SearchFieldDef
  return {
    OR: searchFields.map(sf => {
      if (sf.kind === 'scalar') {
        // Direct scalar field search
        return {
          [sf.field]: {
            contains: sanitized,
            mode: 'insensitive'
          }
        }
      } else {
        // sf.kind === 'relation_some'
        // Search through relation (e.g., phones.phoneNumber)
        return {
          [sf.relation]: {
            some: {
              [sf.field]: {
                contains: sanitized,
                mode: 'insensitive'
              }
            }
          }
        }
      }
    })
  }
}

// v2.2.2 FIX: Prisma parameterizes queries, so SQL wildcard escaping is unnecessary
// and can reduce match quality. Instead, sanitize for safety without breaking search UX.
function sanitizeSearchInput(input: string, maxLength: number): string {
  return input
    .trim()
    .substring(0, maxLength)
    // Remove control characters but keep search-friendly chars
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Optionally restrict to safe chars for phone/email search:
    // .replace(/[^a-zA-Z0-9 @._+\-]/g, '')
}
```

### Rate Limit Enforcement (v2.2.2)

```typescript
// v2.2.2: Redis-based rate limiter for drilldown search
const SEARCH_RATE_LIMIT = 10  // requests per second per user

async function assertRateLimit(
  userId: string, 
  key: string, 
  limitPerSec: number
): Promise<void> {
  const bucket = `rl:${userId}:${key}:${Math.floor(Date.now() / 1000)}`
  const count = await redis.incr(bucket)
  
  if (count === 1) {
    await redis.expire(bucket, 2)  // Auto-expire after 2 seconds
  }
  
  if (count > limitPerSec) {
    throw new RateLimitError(`Rate limit exceeded: ${limitPerSec} requests per second`)
  }
}
```

### Server-Side Enforcement (v2.2.2)

```typescript
export async function handleDrilldown(
  request: DrilldownRequest,
  ctx: CompileCtx
): Promise<DrilldownResponse> {
  // v2.2.2: Enforce rate limit for search
  if (request.search) {
    await assertRateLimit(ctx.userId, 'drilldown-search', SEARCH_RATE_LIMIT)
  }
  
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
  
  // v2.2.2 FIX: Clamp page to >= 1 to prevent negative skip
  const page = Math.max(1, request.page)
  
  // Execute with pagination
  const [rows, total] = await Promise.all([
    prisma[compiled.delegate].findMany({  // v2.2.2 FIX: Use delegate not table
      where,
      orderBy: request.sort ? { [request.sort.field]: request.sort.dir } : compiled.orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma[compiled.delegate].count({ where })  // v2.2.2 FIX: Use delegate not table
  ])
  
  return {
    rows,
    total,
    page,  // v2.2.2 FIX: Return clamped page
    pageSize,
    hasMore: page * pageSize < total
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

### Cache Key Structure (v2.2.2 + Dependency Versions)

```typescript
const REGISTRY_VERSION = '2.2.2'  // Bump on registry/schema changes

async function buildCacheKey(
  compiled: CompiledQuery,
  ctx: CompileCtx
): Promise<string> {
  // v2.2.2: Get versions for ALL dependencies, not just primary entity
  const versionKeys = compiled.deps.map(k => `cacheVersion:${ctx.tenantId}:${k}`)
  const versions = await redis.mget(versionKeys)
  
  // Build dependency signature: "records:5|record_tags:3|phones:2"
  const depSig = compiled.deps.map((k, i) => `${k}:${versions[i] ?? 0}`).join('|')
  const depHash = crypto.createHash('sha256').update(depSig).digest('hex').substring(0, 8)
  
  // v2.2.2: Cache key includes:
  // - REGISTRY_VERSION (invalidate on deploy)
  // - tenantId (tenant isolation)
  // - depHash (all dependency versions)
  // - permissionHash (permission isolation)
  // - queryHash (query uniqueness)
  return `w:${REGISTRY_VERSION}:${ctx.tenantId}:deps:${depHash}:p:${ctx.permissionHash}:q:${compiled.hash}`
}
```

### Dependency-Version Caching (v2.2.2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 DEPENDENCY-VERSION CACHING (v2.2.2)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Problem: phones entity with globalFilters.tags depends on:             │
│    - phones (primary entity)                                            │
│    - records (via_join tenant scope)                                    │
│    - record_tags (tag filter)                                           │
│                                                                          │
│  Old approach: cache key only includes phones version                   │
│  → Stale data when records or record_tags change                        │
│                                                                          │
│  v2.2.2 approach: cache key includes ALL dependency versions            │
│  → Any dependency change = cache miss = fresh data                      │
│                                                                          │
│  CompiledQuery.deps computed by compiler:                               │
│    1. Primary entity (always)                                           │
│    2. Tenant scope join entity (via_join)                               │
│    3. Entities referenced by global filters                             │
│    4. Entities used by permission filters                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
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
  
  // v2.2.2 FIX: tag create/delete bump BOTH cacheVersion AND labelVersion
  // (labels endpoint needs to reflect new/deleted tags)
  'tag.create': ['tags'],  // + bump labelVersion:tags
  'tag.delete': ['tags', 'record_tags'],  // + bump labelVersion:tags
  // tag.update: labelVersion ONLY (see invalidateLabelOnUpdate)
  
  // v2.2.2 FIX: motivation create/delete bump BOTH cacheVersion AND labelVersion
  'motivation.create': ['motivations'],  // + bump labelVersion:motivations
  'motivation.delete': ['motivations', 'record_motivations'],  // + bump labelVersion:motivations
  // motivation.update: labelVersion ONLY (see invalidateLabelOnUpdate)
}

// v2.2.2: Two-tier invalidation - widget vs label
export const LABEL_ENTITIES = ['tags', 'motivations'] as const

export async function invalidateOnMutation(
  tenantId: string,
  mutationType: string
): Promise<void> {
  const [entity, action] = mutationType.split('.')
  
  // v2.2.2 FIX: Label entities need labelVersion bumped on create/delete too
  if (LABEL_ENTITIES.includes(entity as any)) {
    if (action === 'update') {
      // Label update: bump labelVersion ONLY, NOT widget cacheVersion
      await redis.incr(`labelVersion:${tenantId}:${entity}`)
      return
    } else if (action === 'create' || action === 'delete') {
      // Label create/delete: bump BOTH cacheVersion AND labelVersion
      await redis.incr(`labelVersion:${tenantId}:${entity}`)
      // Continue to also bump cacheVersion below
    }
  }
  
  // All other mutations: bump widget cacheVersion
  const entitiesToInvalidate = INVALIDATION_MAP[mutationType] || []
  await Promise.all(
    entitiesToInvalidate.map(entityKey =>
      redis.incr(`cacheVersion:${tenantId}:${entityKey}`)
    )
  )
}
```

### Label Join Caching Rule (v2.2.2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 LABEL JOIN CACHING RULE (v2.2.2)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CHOICE: Widgets return IDs only, labels resolved separately.           │
│                                                                          │
│  Widget response:                                                        │
│    { tagId: 'abc123', count: 47 }                                       │
│                                                                          │
│  Label lookup (cached separately with longer TTL):                      │
│    GET /api/analytics/labels?entity=tags&ids=abc123,def456              │
│    → { abc123: { name: 'Hot Lead', color: '#ef4444' }, ... }            │
│                                                                          │
│  Benefits:                                                               │
│  - tag.update only invalidates label cache, not all widget caches       │
│  - Label cache can have longer TTL (labels change rarely)               │
│  - Widget cache stays valid even when labels change                     │
│                                                                          │
│  Implementation:                                                         │
│  - Widget API returns raw IDs in groupBy results                        │
│  - Client calls label lookup API to resolve display names               │
│  - Label cache uses separate versioning (see below)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Label Versioning (v2.2.2)

```typescript
// v2.2.2: Separate label versions from widget versions
// tag.update bumps labelVersion, NOT cacheVersion

// Label cache keys
function buildLabelCacheKey(entityKey: string, id: string, tenantId: string): string {
  return `label:${tenantId}:${entityKey}:${id}`
}

// Label version keys (separate from widget versions)
// labelVersion:${tenantId}:tags
// labelVersion:${tenantId}:motivations

async function getLabelVersion(tenantId: string, entityKey: string): Promise<number> {
  return Number(await redis.get(`labelVersion:${tenantId}:${entityKey}`)) || 0
}

// On tag.update: bump label version, NOT widget version
async function invalidateLabelOnUpdate(tenantId: string, entityKey: string): Promise<void> {
  await redis.incr(`labelVersion:${tenantId}:${entityKey}`)
}

// Labels endpoint with versioned caching
async function getLabels(
  entityKey: string,
  ids: string[],
  tenantId: string
): Promise<Record<string, LabelData>> {
  const version = await getLabelVersion(tenantId, entityKey)
  const results: Record<string, LabelData> = {}
  
  for (const id of ids) {
    const cacheKey = `${buildLabelCacheKey(entityKey, id, tenantId)}:v${version}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      results[id] = JSON.parse(cached)
    } else {
      const label = await fetchLabelFromDb(entityKey, id)
      await redis.setex(cacheKey, 3600, JSON.stringify(label)) // 1 hour TTL
      results[id] = label
    }
  }
  
  return results
}
```

### Two-Tier Invalidation Summary (v2.2.2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 TWO-TIER INVALIDATION (v2.2.2)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WIDGET CACHE (cacheVersion):                                           │
│    - Bumped on: create, delete, structural changes                      │
│    - Keys: cacheVersion:${tenantId}:${entityKey}                        │
│    - TTL: 5 minutes                                                     │
│                                                                          │
│  LABEL CACHE (labelVersion):                                            │
│    - Bumped on: tag.update, motivation.update (name/color changes)      │
│    - Keys: labelVersion:${tenantId}:${entityKey}                        │
│    - TTL: 1 hour                                                        │
│                                                                          │
│  WHY SEPARATE:                                                          │
│    - Tag rename shouldn't nuke all widget caches                        │
│    - Widget data (counts) unchanged when label changes                  │
│    - Prevents load spikes on common ops actions                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cache Flow (v2.2.2 - Updated)

```typescript
async function fetchWidgetData(
  input: WidgetQueryInput,
  ctx: CompileCtx
): Promise<WidgetData> {
  // v2.2.2: Compile first to get dependencies
  const compiled = compileQuery(input, ctx)
  
  // v2.2.2: Build cache key with ALL dependency versions
  const cacheKey = await buildCacheKey(compiled, ctx)
  
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
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
// v2.2.2 FIX: Permission hash MUST use stableStringify for deterministic output
// Problem: Object key order is not guaranteed → same permissions = different hash
// Risk: Cross-user cache bugs or weird misses, worst case data leakage

function computePermissionHash(ctx: CompileCtx): string {
  // v2.2.2: Build hashInput with sorted, normalized structure
  const hashInput: Record<string, unknown> = {
    role: ctx.role
  }
  
  // Include rowFilters that affect data visibility
  // v2.2.2 FIX: Sort entity keys for deterministic order
  const entityKeys = Object.keys(ctx.permissions.entities).sort()
  const entityFilters: Record<string, unknown> = {}
  
  for (const entityKey of entityKeys) {
    const perm = ctx.permissions.entities[entityKey]
    if (perm.rowFilter?.length) {
      // v2.2.2 FIX: Sort rowFilters by field:operator:value for deterministic order
      // Same pattern as sortFilters() - must include value to prevent instability
      entityFilters[entityKey] = [...perm.rowFilter].sort((a, b) => 
        `${a.field}:${a.operator}:${stableStringify(a.value)}`.localeCompare(
          `${b.field}:${b.operator}:${stableStringify(b.value)}`
        )
      )
    }
  }
  if (Object.keys(entityFilters).length > 0) {
    hashInput.entityFilters = entityFilters
  }
  
  // Include userId ONLY if there's a per-user scope
  if (hasPerUserRowFilter(ctx)) {
    hashInput.userId = ctx.userId
  }
  
  // v2.2.2: stableStringify ensures deterministic JSON output
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
| **Service-Layer Transaction** | Good | Medium | **Recommended** |
| **Prisma Middleware** | Risky | Low | **NOT recommended** (see below) |
| **Async Queue** | Eventually consistent | Low | Safety net only |

### Why NOT Prisma Middleware (v2.2.2 Patch)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 MIDDLEWARE COUNTER TRAP (v2.2.2)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Problem 1: Transaction isolation                                        │
│  - Middleware runs AFTER next(params), outside the original transaction │
│  - If using interactive transactions, counter update is NOT atomic      │
│                                                                          │
│  Problem 2: Recursion                                                    │
│  - record.update() in middleware triggers middleware again               │
│  - Requires guard flags, easy to mess up                                │
│                                                                          │
│  Problem 3: deleteMany doesn't return IDs                               │
│  - Can't reliably know which records to update                          │
│  - Must prefetch or reconcile entire workspace (expensive)              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended: Service-Layer Transactions

```typescript
// src/lib/services/phoneService.ts

export async function addPhoneToRecord(
  recordId: string,
  phoneData: CreatePhoneInput
): Promise<RecordPhoneNumber> {
  // v2.2.2: Use $transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // 1. Create the phone
    const phone = await tx.recordPhoneNumber.create({
      data: {
        ...phoneData,
        recordId
      }
    })
    
    // 2. Increment counter in SAME transaction
    await tx.record.update({
      where: { id: recordId },
      data: { phoneCount: { increment: 1 } }
    })
    
    return phone
  })
}

export async function removePhoneFromRecord(
  phoneId: string
): Promise<void> {
  return prisma.$transaction(async (tx) => {
    // 1. Get the phone to find recordId
    const phone = await tx.recordPhoneNumber.findUniqueOrThrow({
      where: { id: phoneId },
      select: { recordId: true }
    })
    
    // 2. Delete the phone
    await tx.recordPhoneNumber.delete({
      where: { id: phoneId }
    })
    
    // 3. Decrement counter in SAME transaction
    await tx.record.update({
      where: { id: phone.recordId },
      data: { phoneCount: { decrement: 1 } }
    })
  })
}

// For bulk operations: prefetch affected recordIds first
export async function removePhonesFromRecords(
  where: Prisma.RecordPhoneNumberWhereInput
): Promise<{ deletedCount: number; affectedRecordIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    // 1. Get distinct recordIds BEFORE delete
    const phones = await tx.recordPhoneNumber.findMany({
      where,
      select: { recordId: true },
      distinct: ['recordId']
    })
    const affectedRecordIds = phones.map(p => p.recordId)
    
    // 2. Delete phones
    const { count } = await tx.recordPhoneNumber.deleteMany({ where })
    
    // 3. Queue reconciliation for affected records (can't increment in bulk)
    // OR reconcile immediately if count is small
    if (affectedRecordIds.length <= 100) {
      for (const recordId of affectedRecordIds) {
        const phoneCount = await tx.recordPhoneNumber.count({ where: { recordId } })
        await tx.record.update({
          where: { id: recordId },
          data: { phoneCount }
        })
      }
    } else {
      // Queue async reconciliation
      await queueCounterReconciliation(affectedRecordIds)
    }
    
    return { deletedCount: count, affectedRecordIds }
  })
}
```

### Service Pattern for All Counter Types

```typescript
// src/lib/services/counterService.ts

type CounterField = 'phoneCount' | 'emailCount' | 'tagCount' | 'motivationCount'

interface CounterServiceConfig {
  model: string
  counterField: CounterField
  recordIdField: string
}

const COUNTER_CONFIGS: Record<string, CounterServiceConfig> = {
  RecordPhoneNumber: { model: 'recordPhoneNumber', counterField: 'phoneCount', recordIdField: 'recordId' },
  RecordEmail: { model: 'recordEmail', counterField: 'emailCount', recordIdField: 'recordId' },
  RecordTag: { model: 'recordTag', counterField: 'tagCount', recordIdField: 'recordId' },
  RecordMotivation: { model: 'recordMotivation', counterField: 'motivationCount', recordIdField: 'recordId' },
}

// Generic create with counter increment
export async function createWithCounter<T>(
  modelName: keyof typeof COUNTER_CONFIGS,
  data: any
): Promise<T> {
  const config = COUNTER_CONFIGS[modelName]
  
  return prisma.$transaction(async (tx) => {
    const created = await (tx as any)[config.model].create({ data })
    
    await tx.record.update({
      where: { id: data[config.recordIdField] },
      data: { [config.counterField]: { increment: 1 } }
    })
    
    return created
  })
}

// Generic delete with counter decrement
export async function deleteWithCounter(
  modelName: keyof typeof COUNTER_CONFIGS,
  id: string
): Promise<void> {
  const config = COUNTER_CONFIGS[modelName]
  
  return prisma.$transaction(async (tx) => {
    const item = await (tx as any)[config.model].findUniqueOrThrow({
      where: { id },
      select: { [config.recordIdField]: true }
    })
    
    await (tx as any)[config.model].delete({ where: { id } })
    
    await tx.record.update({
      where: { id: item[config.recordIdField] },
      data: { [config.counterField]: { decrement: 1 } }
    })
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
| Counter update service | P0 | Service-layer `$transaction` updates counters (NOT middleware) |
| Entity Registry | P0 | All entities with resolver-based `searchFields` |
| Segment Registry | P0 | All operators including `between` with value contracts |
| Dimension Registry | P0 | `groupByMode` defined for all |
| Query Compiler | P0 | Validates dimension groupBy + computes `deps` |
| Complete query hash | P0 | `computeQueryHash(input, ctx)` with resolved ISO timestamps |
| Permission hash | P0 | Cache key uses permissionHash, not userId |
| Dependency-version caching | P0 | Cache key includes ALL entity dependency versions |
| Date Semantics | P0 | Timezone-aware resolution, canonical dateRange rule |
| Rate limiting | P0 | Redis-based rate limiter for drilldown search |
| Label versioning | P0 | Separate `labelVersion` keys for tags/motivations |

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
- [ ] SearchFields use resolver-based SearchFieldDef (scalar + relation_some)
- [ ] Query hash includes resolved date timestamps (not preset strings)
- [ ] REGISTRY_VERSION in cache key
- [ ] Label lookup API exists (widgets return IDs, labels resolved separately)
- [ ] Service-layer transactions for counter updates (not middleware)
- [ ] Canonical dateRange rule: globalFilters.dateRange is default, widget can override
- [ ] `computeQueryHash(input, ctx)` signature locked (ctx required for timezone)
- [ ] Dependency-version caching: cache key includes ALL entity dependency versions
- [ ] Rate limit enforcement for drilldown search
- [ ] Label versioning separate from widget versioning

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
│       │   ├── counterService.ts    # v2.2.2: Service-layer transactions (NOT middleware)
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
| **Search works on relations** | Resolver-based SearchFieldDef (scalar + relation_some) |
| **No midnight cache bugs** | Query hash uses resolved ISO timestamps |
| **Deploy invalidates cache** | REGISTRY_VERSION in cache key |
| **Labels don't bloat invalidation** | Widgets return IDs, labels resolved separately |
| **Counter updates are atomic** | Service-layer transactions, not middleware |

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
type SearchFieldKind = 'scalar' | 'relation_some'

// Search Field Definition (v2.2.2)
type SearchFieldDef =
  | { kind: 'scalar'; field: string }
  | { kind: 'relation_some'; relation: string; field: string }

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
| tag.delete | tags, record_tags |
| tag.update | **labelVersion only** (not widget cache) |
| motivation.delete | motivations, record_motivations |
| motivation.update | **labelVersion only** (not widget cache) |

---

## Appendix C: Golden Flow (Copy-Pasteable Patterns)

### 1. Effective DateRange (Single Source of Truth)

```typescript
// GOLDEN RULE: Date filtering happens ONCE, in ONE place
// Widget dateRange overrides globalFilters.dateRange (never both applied)

function getEffectiveDateRange(input: WidgetQueryInput): DateRange {
  return input.dateRange ?? input.globalFilters.dateRange
}

// In compileQuery:
const effectiveDateRange = getEffectiveDateRange(input)
const dateWhere = compileDateRange(effectiveDateRange, dateMode, entity, ctx)

// In compileGlobalFilters: MUST exclude dateRange
const globalWhere = compileGlobalFilters(input.entityKey, input.globalFilters, ctx, {
  excludeDateRange: true  // CRITICAL
})

// In computeQueryHash: hash only effective range as ISO
const resolved = resolveDateRange(getEffectiveDateRange(input), ctx.timezone)
// hashInput includes: dateStartISO, dateEndISO (NOT preset string, NOT both ranges)
```

### 2. Deterministic Hashing (Normalized)

```typescript
// GOLDEN RULE: Same logical query = same hash, always

// 1. Sort all arrays before hashing
const normalizedGlobalFilters = {
  tags: { include: [...tags.include].sort(), exclude: [...tags.exclude].sort() },
  assignees: [...assignees].sort(),
  // ... etc
}

// 2. Sort filters by field:operator
const sortedFilters = [...filters].sort((a, b) => 
  `${a.field}:${a.operator}`.localeCompare(`${b.field}:${b.operator}`)
)

// 3. Use stableStringify for all hash inputs
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

// 4. Permission hash: sort entity keys + rowFilters
const entityKeys = Object.keys(ctx.permissions.entities).sort()
```

### 3. Dependency-Based Cache Key

```typescript
// GOLDEN RULE: Cache key includes versions of ALL entities the query depends on

// Step 1: Compiler computes deps
const deps = computeQueryDeps(input, entity, ctx)
// e.g., ['phones', 'records', 'record_tags'] for phones with tag filter

// Step 2: Build cache key with ALL dep versions
async function buildCacheKey(compiled: CompiledQuery, ctx: CompileCtx): Promise<string> {
  const versionKeys = compiled.deps.map(k => `cacheVersion:${ctx.tenantId}:${k}`)
  const versions = await redis.mget(versionKeys)
  
  const depSig = compiled.deps.map((k, i) => `${k}:${versions[i] ?? 0}`).join('|')
  const depHash = crypto.createHash('sha256').update(depSig).digest('hex').substring(0, 8)
  
  return `w:${REGISTRY_VERSION}:${ctx.tenantId}:deps:${depHash}:p:${ctx.permissionHash}:q:${compiled.hash}`
}

// Step 3: Any dep change = cache miss = fresh data
// phone.create bumps 'phones' version → all phone queries miss cache
// record.update bumps 'records' version → phones with via_join also miss cache
```

### 4. Two-Tier Invalidation (Widget vs Label)

```typescript
// GOLDEN RULE: Label changes don't nuke widget caches

// Two version types:
// - cacheVersion:${tenantId}:${entity} → widget data cache
// - labelVersion:${tenantId}:${entity} → label lookup cache

export async function invalidateOnMutation(tenantId: string, mutationType: string): Promise<void> {
  const [entity, action] = mutationType.split('.')
  
  // Label-only updates: bump labelVersion, NOT cacheVersion
  if (action === 'update' && ['tags', 'motivations'].includes(entity)) {
    await redis.incr(`labelVersion:${tenantId}:${entity}`)
    return  // DO NOT bump widget cache
  }
  
  // All other mutations: bump widget cacheVersion
  const entitiesToInvalidate = INVALIDATION_MAP[mutationType] || []
  await Promise.all(
    entitiesToInvalidate.map(k => redis.incr(`cacheVersion:${tenantId}:${k}`))
  )
}

// Client flow:
// 1. Fetch widget data (uses cacheVersion)
// 2. Widget returns IDs: { tagId: 'abc', count: 47 }
// 3. Fetch labels separately (uses labelVersion)
// 4. Tag rename → only step 3 cache misses, step 1 stays cached
```

### 5. Entity Key Convention (Updated)

```typescript
// GOLDEN RULE: Always use registry entity keys, never Prisma relation names

// Registry keys (use these everywhere):
'records', 'phones', 'emails', 'record_tags', 'record_motivations', 'tasks', 'tags', 'motivations'

// Prisma delegates (for prisma[delegate] calls):
'record', 'recordPhoneNumber', 'recordEmail', 'recordTag', 'recordMotivation', 'task', 'tag', 'motivation'

// Prisma relations (for query building):
'record', 'phones', 'emails', 'recordTags', 'recordMotivations', 'tasks', 'tags', 'motivations'

// v2.2.2 FIX: Entity definition now has separate fields:
{
  key: 'phones',                    // Registry key (for cache deps)
  delegate: 'recordPhoneNumber',    // Prisma client delegate (for prisma[delegate])
  tenantScope: {
    mode: 'via_join',
    joinEntity: 'records',          // Registry key (for cache deps)
    joinRelation: 'record',         // Prisma relation name (for query building)
    joinField: 'workspaceId'        // Field on joined model
  }
}

// In deps computation:
deps.add(entity.tenantScope.joinEntity)  // 'records', matches cacheVersion key

// In query execution:
prisma[compiled.delegate].findMany(...)  // 'recordPhoneNumber'
```

### 6. Label Invalidation (Updated)

```typescript
// GOLDEN RULE: Label create/delete bumps BOTH cacheVersion AND labelVersion

// tag.create → bump cacheVersion:tags + labelVersion:tags
// tag.update → bump labelVersion:tags ONLY
// tag.delete → bump cacheVersion:tags + cacheVersion:record_tags + labelVersion:tags

// Same for motivations
```

---

*End of DockInsight 2.2.2 Implementation Plan*
