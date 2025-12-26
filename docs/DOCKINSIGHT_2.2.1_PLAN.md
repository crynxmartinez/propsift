# DockInsight 2.2.1 — Implementation Plan (Buildable + Consistent)

> **Databox-grade analytics + PropSift operations console**
>
> v2.2.1 is v2.2 patched for real production execution: true tenant scoping, junction entities for usage analytics, canonical operators, denormalized count support, server-safe drilldowns, permission-safe caching, and Redis-safe invalidation.

---

## Changelog (2.2 → 2.2.1)

### Fixed / Clarified

| Issue | Fix |
|-------|-----|
| **True multi-tenancy** | Tenant scoping is `workspaceId` (org/tenant), not `createdById` |
| **Permissions separated from tenancy** | Row-level permission filters are injected AFTER tenant scope |
| **Tags/Motivations usage** | Added junction entities (`record_tags`, `record_motivations`) so `junction_created` is real |
| **Canonical operator set** | Unified `is_null`/`is_not_null` and added `between` (no "is_empty" confusion) |
| **Computed counts** | Officially supported via denormalized counters (`phoneCount`, `emailCount`, `tagCount`, `motivationCount`) |
| **Server-safe drilldown** | Client no longer sends `CompiledQuery` |
| **Caching** | Removed Redis `KEYS` invalidation; replaced with version bump keys |
| **Cache safety** | Cache key includes permission scope / user so Agent vs Admin never collides |
| **Join-based tenant scope** | Entities like phones/emails can scope tenant via record join safely |

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
19. [UI/UX Guidelines](#19-uiux-guidelines)
20. [Execution Phases](#20-execution-phases)
21. [Technical Specifications](#21-technical-specifications)
22. [Migration Mapping + Audit](#22-migration-mapping--audit)
23. [Success Metrics](#23-success-metrics)

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

---

## 2. Current State Analysis

Same as 2.2, plus: the missing pieces are now explicitly buildable (no ambiguous tenancy, no fake date modes).

**Key differences from 2.2:**
- Tenant scope is `workspaceId`, not `createdById`
- Junction entities exist for tag/motivation usage analytics
- Denormalized counters are a contract, not optional
- Drilldown is server-safe (no client-supplied compiled queries)

---

## 3. Core Model & Architecture

### Canonical Widget Model

```
Entity + Segment(optional) + Filters + Metric(s) + Dimension(optional)
+ DateRange + DateMode + Granularity + Sort/Limit
```

### Hard Rules (v2.2.1)

| Rule | Description |
|------|-------------|
| **Tenant scope is mandatory** | Every query must have tenant scope |
| **Permissions are additive** | Tenant scope AND permission rowFilter |
| **Segments are filter-only** | No sort/limit in segment definitions |
| **Consistency guarantee** | Widget value and drilldown come from the same `compile()` output |
| **Server-safe drilldown** | Client never submits `CompiledQuery` |
| **Permission-safe caching** | Cache keys include permission scope |

---

## 4. Registry System

Four registries drive UI + validation:

- **Entity Registry**
- **Segment Registry**
- **Metric Registry**
- **Dimension Registry**

### A) Entity Registry (patched for real tenancy)

```typescript
// src/lib/analytics/registry/entities.ts

export type TenantScopeMode = 'direct' | 'via_join'

export interface TenantScopeDef {
  mode: TenantScopeMode
  // direct: entity has tenant field (e.g., workspaceId)
  field?: string
  // via_join: tenant scope lives on related model (e.g., phone -> record.workspaceId)
  joinPath?: string     // e.g. 'record'
  joinField?: string    // e.g. 'workspaceId'
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

  drilldownRoute: string
  drilldownQueryParam: string
  quickActions: ActionType[]

  joins?: EntityJoin[]
}
```

**Key change:** Tenant scope is never `createdById`.

### Entity Keys (v2.2.1)

| Entity Key | Table | Tenant Scope | Notes |
|------------|-------|--------------|-------|
| `records` | Record | direct: `workspaceId` | Base entity |
| `tasks` | Task | direct: `workspaceId` | Base entity |
| `phones` | RecordPhoneNumber | via_join: `record.workspaceId` | Tenant scope via record |
| `emails` | RecordEmail | via_join: `record.workspaceId` | Tenant scope via record |
| `activity` | ActivityLog | direct: `workspaceId` | Activity logs |
| `record_tags` | RecordTag | direct: `workspaceId` | Junction - supports `junction_created` |
| `record_motivations` | RecordMotivation | direct: `workspaceId` | Junction - supports `junction_created` |
| `tags` | Tag | direct: `workspaceId` | Tag definitions (not "usage") |
| `motivations` | Motivation | direct: `workspaceId` | Motivation definitions |

**Important:** Usage analytics (e.g., "Top Tags last 30d") should use `record_tags`, not `tags`.

### B) Segment Registry (operators normalized)

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
  | 'between'

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

**Rule reminder:** Segments do not sort/limit.

### C) Metric Registry

Same as 2.2, with enforcement rule:

> For rate metrics, denominator must be a superset of numerator under the same tenant + permission filters.

This prevents nonsense ratios.

```typescript
// src/lib/analytics/registry/metrics.ts

export type MetricType = 'aggregate' | 'preset_rate' | 'generic_rate' | 'formula'

export interface MetricDefinition {
  key: string
  type: MetricType
  label: string
  description?: string
  entities: string[]
  
  // For aggregate
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  field?: string
  
  // For rate
  numerator?: MetricRef | SegmentRef
  denominator?: MetricRef | SegmentRef
  format?: 'percent' | 'ratio'
  
  // For formula
  expression?: string
  variables?: Record<string, MetricRef>
}
```

### D) Dimension Registry

```typescript
// src/lib/analytics/registry/dimensions.ts

export interface DimensionDefinition {
  key: string
  label: string
  type: 'enum' | 'date' | 'string' | 'number' | 'relation'
  field: string

  entities: string[] | ['*']   // use ['*'] for wildcard

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

### Compile Context (tenant + permissions + timezone)

```typescript
export interface CompileCtx {
  tenantId: string           // workspace/org/tenant id
  userId: string
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  timezone: string           // e.g. 'Asia/Manila'
  permissions: PermissionSet
}
```

### Tenant Scope Injection (direct vs via_join)

```typescript
function compileTenantScope(entity: EntityDefinition, ctx: CompileCtx): PrismaWhere {
  const ts = entity.tenantScope
  if (ts.mode === 'direct') {
    return { [ts.field!]: ctx.tenantId }
  }
  // via join
  return { [ts.joinPath!]: { [ts.joinField!]: ctx.tenantId } }
}
```

### Permission rowFilter Injection (after tenant scope)

```typescript
function compilePermissionWhere(entityKey: string, ctx: CompileCtx): PrismaWhere {
  const ep = ctx.permissions.entities[entityKey]
  if (!ep?.canView) throw new PermissionError()

  const conditions: PrismaWhere[] = []
  if (ep.rowFilter?.length) {
    conditions.push(compilePredicates(entityKey, ep.rowFilter, ctx))
  }
  return conditions.length ? { AND: conditions } : {}
}
```

### Denormalized Counts (official support)

Supported computed fields for records:

- `phoneCount`
- `emailCount`
- `tagCount`
- `motivationCount`

Segments become queryable without raw SQL:

```typescript
// records segment: multiple phones
{ field: 'phoneCount', operator: 'gt', value: 1 }
```

**v2.2.1 Contract:** If a predicate references `*.count`, it must map to a real field, or compilation fails with `QUERY_COMPILE_ERROR`.

### Full Query Compiler

```typescript
// src/lib/analytics/query/compiler.ts

export interface CompiledQuery {
  entityKey: string
  table: string
  where: PrismaWhere
  select?: PrismaSelect
  orderBy?: PrismaOrderBy
  take?: number
  skip?: number
  dateMode: DateModeKey
  groupBy?: string[]
  aggregate?: AggregateConfig
  hash: string
}

export function compileQuery(
  input: WidgetQueryInput,
  ctx: CompileCtx
): CompiledQuery {
  const entity = getEntity(input.entityKey)
  if (!entity) {
    throw new QueryCompileError(`Unknown entity: ${input.entityKey}`)
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

  // Compute hash for caching
  const hash = computeQueryHash(where, orderBy, input.limit)

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
```

### Consistency Guarantee (Non-Negotiable)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONSISTENCY GUARANTEE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Widget value and drilldown MUST call the same compile() output.        │
│                                                                          │
│  The ONLY difference:                                                    │
│  - Widget uses aggregate query (count/sum/avg)                          │
│  - Drilldown uses list query (select rows)                              │
│                                                                          │
│  This prevents: "KPI says 1,247 but drilldown shows 1,198"              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Date Semantics

### Date Modes

| Mode | Meaning | Typical Entities |
|------|---------|------------------|
| `entity_created` | entity.createdAt | records, tasks, phones, emails |
| `record_created` | record.createdAt | phones/emails (when measuring by parent record creation) |
| `junction_created` | junction.createdAt | record_tags, record_motivations |
| `activity_created` | activity.createdAt | activity |

### Timezone Guarantee

All presets (`today`, `this_week`, etc.) must resolve in **tenant timezone** (`ctx.timezone`), not server timezone.

```typescript
export function resolveDateRange(
  dateRange: DateRange,
  timezone: string
): { start: Date; end: Date } {
  const now = new Date()
  const zonedNow = toZonedTime(now, timezone)
  const today = startOfDay(zonedNow)

  switch (dateRange) {
    case 'today':
      return { 
        start: fromZonedTime(today, timezone), 
        end: fromZonedTime(endOfDay(zonedNow), timezone) 
      }
    case 'yesterday':
      const yesterday = subDays(today, 1)
      return { 
        start: fromZonedTime(yesterday, timezone), 
        end: fromZonedTime(endOfDay(yesterday), timezone) 
      }
    case 'this_week':
      return { 
        start: fromZonedTime(startOfWeek(zonedNow), timezone), 
        end: fromZonedTime(endOfWeek(zonedNow), timezone) 
      }
    case 'last_7_days':
      return { 
        start: fromZonedTime(subDays(today, 7), timezone), 
        end: fromZonedTime(endOfDay(zonedNow), timezone) 
      }
    case 'last_30_days':
      return { 
        start: fromZonedTime(subDays(today, 30), timezone), 
        end: fromZonedTime(endOfDay(zonedNow), timezone) 
      }
    case 'this_month':
      return { 
        start: fromZonedTime(startOfMonth(zonedNow), timezone), 
        end: fromZonedTime(endOfMonth(zonedNow), timezone) 
      }
    case 'this_quarter':
      return { 
        start: fromZonedTime(startOfQuarter(zonedNow), timezone), 
        end: fromZonedTime(endOfQuarter(zonedNow), timezone) 
      }
    case 'this_year':
      return { 
        start: fromZonedTime(startOfYear(zonedNow), timezone), 
        end: fromZonedTime(endOfYear(zonedNow), timezone) 
      }
    case 'all_time':
      return { start: new Date(0), end: fromZonedTime(endOfDay(zonedNow), timezone) }
    default:
      return { 
        start: fromZonedTime(subDays(today, 30), timezone), 
        end: fromZonedTime(endOfDay(zonedNow), timezone) 
      }
  }
}
```

---

## 7. Builder UX Flow

Same as 2.2, but the UI must **never show pseudo-fields unless a resolver exists**.

### Step-by-Step Wizard

```
Step 1: Choose Entity
  [Records] [Tasks] [Tags] [Phones] [More ▼]

Step 2: Choose Data Set (optional segment)
  [All Records ▼]
  Quick picks: [Hot] [Warm] [Cold] [Call Ready] [Assigned]

Step 3: Choose Metric
  [Count ▼]
  Quick picks: [Count] [Tag Coverage %] [Phone Coverage %]

Step 4: Group By (optional)
  [None ▼]
  Options: Status, Temperature, Tag, Assignee, Day, Week, Month

Step 5: Filters (Advanced)
  + Add Filter → [Field ▼] [Operator ▼] [Value]

Step 6: Visualization
  [KPI] [Bar] [Pie] [Line] [Area] [Table]

Step 7: Drilldown (auto-enabled)
  ☑ Click to view matching records
  Quick actions: [Assign] [Create Tasks] [Add Tag] [Export]
```

---

## 8. KPI Mode vs Builder Mode

Same as 2.2.

### KPI Mode (Default View)

- Large, clean numbers
- Clear comparison indicators (▲ 12% vs last week)
- Prominent action buttons
- Click anywhere to drilldown
- No edit controls visible

### Builder Mode (Toggle)

- Edit controls visible
- Live preview updates
- Save/duplicate/stack options
- Advanced filter builder

---

## 9. Global Filters

```typescript
export interface GlobalFilters {
  dateRange: DateRangePreset | { start: Date; end: Date }

  market?: { states?: string[]; cities?: string[] } // records only (or via record join)
  assignees?: string[] | null // null = unassigned only
  temperature?: ('hot' | 'warm' | 'cold')[]
  status?: string[] // if you have record statuses

  tags?: { include?: string[]; exclude?: string[] }
  motivations?: { include?: string[]; exclude?: string[] }

  callReady?: boolean
  board?: { boardId?: string; columnId?: string }
}
```

Applicability is computed via registry (entity capabilities + join inheritance).

### Applicability Matrix

| Global Filter | records | tasks | phones | emails | record_tags | record_motivations |
|---------------|---------|-------|--------|--------|-------------|-------------------|
| dateRange | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| assignees | ✅ | ✅ | via record | via record | via record | via record |
| temperature | ✅ | via record | via record | via record | via record | via record |
| status | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| tags | ✅ | via record | via record | via record | ❌ | ❌ |
| callReady | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 10. Metrics System

Same as 2.2, plus:

**Rate metrics compile into two compiled queries (numerator + denominator) that share:**
- Tenant scope
- Permission scope
- Global filters
- Date semantics

### Metric Types

| Type | Description | Example |
|------|-------------|---------|
| `aggregate` | Simple aggregation | count, sum, avg, min, max |
| `preset_rate` | Predefined coverage | tagCoverage, phoneCoverage |
| `generic_rate` | User-defined ratio | numerator/denominator |
| `formula` | Computed expression | (a + b) / c |

### Preset Metrics

| Key | Label | Type | Formula |
|-----|-------|------|---------|
| `count` | Count | aggregate | COUNT(*) |
| `tagCoverage` | Tag Coverage | preset_rate | records with tags / all records |
| `phoneCoverage` | Phone Coverage | preset_rate | records with phones / all records |
| `emailCoverage` | Email Coverage | preset_rate | records with emails / all records |
| `avgPhones` | Avg Phones | aggregate | AVG(phoneCount) |
| `hotRate` | Hot Rate | preset_rate | hot records / all records |

---

## 11. Drilldowns (server-safe contract)

### Request/Response

```typescript
export interface DrilldownRequest {
  widgetQuery: WidgetQueryInput     // NOT CompiledQuery
  page: number
  pageSize: number
  sort?: SortConfig
  search?: string
}

export interface DrilldownResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

**Non-negotiable:** No client-supplied `CompiledQuery`.

### Drilldown Flow

```
1. Client sends widgetQuery (same config that powered the widget)
2. Server recompiles query with current user's ctx
3. Server executes SELECT with pagination
4. Server returns rows + total
```

### Drilldown UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Hot Records (1,247)                                    [Export ▼] [×]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ☐ Select All (page)  |  Selected: 0  |  [Assign ▼] [Add Tag] [Task]   │
├─────────────────────────────────────────────────────────────────────────┤
│  ☐ │ Name          │ Status │ Temperature │ Assignee │ Created        │
│  ☐ │ John Smith    │ Active │ Hot         │ Alice    │ Dec 15, 2024   │
│  ☐ │ Jane Doe      │ Active │ Hot         │ Bob      │ Dec 14, 2024   │
│  ☐ │ Bob Wilson    │ Active │ Hot         │ —        │ Dec 13, 2024   │
├─────────────────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 1,247  │  [< Prev] [1] [2] [3] ... [50] [Next >]       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Stacks System

Same as 2.2, with additions:

- `tenantId` required (not `createdById`)
- `definitionHash` computed server-side
- `version` bumps on update
- Soft delete recommended

```typescript
interface Stack {
  id: string
  tenantId: string          // workspace/org id
  name: string
  description?: string
  entityKey: string
  filters: FilterPredicate[]
  segmentKey?: string
  
  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
  version: number
  
  // For change detection (computed server-side)
  definitionHash: string
  
  // Usage tracking
  usageCount: number
  lastUsedAt?: Date
  
  // Sharing
  isShared: boolean
  sharedWith?: string[]
  
  // Soft delete
  deletedAt?: Date
}
```

---

## 13. Action Widgets

Same as 2.2, but note:

Selection token should be either:
- `ids` (safe - explicit list)
- `all` (server recomputes compiled query again before executing)

```typescript
type SelectionToken = {
  type: 'all'
  widgetQuery: WidgetQueryInput  // NOT CompiledQuery
  estimatedCount: number
} | {
  type: 'ids'
  ids: string[]
  count: number
}
```

### Audit Log Schema

```typescript
interface AuditLogEntry {
  id: string
  tenantId: string
  userId: string
  action: string
  entityType: string
  selectionType: 'all' | 'ids'
  affectedCount: number
  affectedIds?: string[]
  payload: Record<string, unknown>
  result: 'success' | 'partial' | 'failed'
  errorMessage?: string
  startedAt: Date
  completedAt: Date
  durationMs: number
}
```

---

## 14. System Dashboards

Same as 2.2.

```typescript
interface SystemDashboard {
  key: string
  version: number
  name: string
  description: string
  widgets: WidgetPlacement[]
  layout: GridLayout
  autoCreate: boolean
  createForNewTenants: boolean
  upgradePolicy: 'replace' | 'merge' | 'ignore'
}
```

### Default System Dashboards

| Dashboard | Description | Widgets |
|-----------|-------------|---------|
| Overview | Daily operations summary | KPIs, activity chart, task list |
| Pipeline | Lead pipeline view | Temperature breakdown, conversion funnel |
| Team | Team performance | Assignments, completion rates |
| Tags | Tag analytics | Usage, coverage, trends |

---

## 15. Insights Layer

Same as 2.2.

```typescript
interface InsightRule {
  key: string
  name: string
  description: string
  condition: InsightCondition
  message: string
  severity: 'info' | 'warning' | 'critical'
  suggestedActions?: ActionDef[]
  checkInterval: 'realtime' | 'hourly' | 'daily'
  cooldownHours?: number
}
```

### Example Insights

| Insight | Condition | Severity | Message |
|---------|-----------|----------|---------|
| Stale hot leads | Hot records with no activity > 7 days | warning | "{{count}} hot leads haven't been contacted in 7+ days" |
| Unassigned spike | Unassigned records > 100 | warning | "{{count}} records are unassigned" |
| Tag coverage drop | Tag coverage < 50% | info | "Only {{percent}}% of records have tags" |
| Task overdue | Overdue tasks > 10 | critical | "{{count}} tasks are overdue" |

---

## 16. Error Handling

Same taxonomy as 2.2, plus one addition:

| Code | HTTP | User Message | Recovery |
|------|------|--------------|----------|
| `QUERY_COMPILE_ERROR` | 400 | "Invalid widget configuration" | Show config panel |
| `UNKNOWN_FIELD_RESOLVER` | 400 | "Field not supported for filtering" | Remove filter |
| `PERMISSION_DENIED` | 403 | "You don't have access to this data" | Hide widget |
| `DATA_NOT_FOUND` | 404 | "No data available" | Show empty state |
| `QUERY_TIMEOUT` | 408 | "Query took too long" | Retry with smaller range |
| `RATE_LIMITED` | 429 | "Too many requests" | Auto-retry with backoff |
| `SERVER_ERROR` | 500 | "Something went wrong" | Retry button |
| `SERVICE_UNAVAILABLE` | 503 | "Service temporarily unavailable" | Auto-retry |

### Error Response Schema

```typescript
interface WidgetError {
  code: ErrorCode
  message: string
  userMessage: string
  details?: Record<string, unknown>
  retryable: boolean
  retryAfterMs?: number
  suggestedAction?: 'retry' | 'reconfigure' | 'contact_support'
}
```

---

## 17. Caching Strategy (Redis-safe)

### Version Bump Invalidation (recommended)

Keep a counter per tenant+entity:

```
cacheVersion:{tenantId}:{entityKey} = Int
```

Cache key includes that version:

```typescript
function cacheKey(
  entityKey: string, 
  queryHash: string, 
  ctx: CompileCtx, 
  version: number
): string {
  const permKey = `${ctx.role}:${ctx.userId}`
  return `w:${ctx.tenantId}:${entityKey}:v${version}:p:${permKey}:h:${queryHash}` 
}
```

On mutation affecting records, bump:

```
INCR cacheVersion:{tenantId}:records
```

**No Redis `KEYS`, no pattern deletes.**

### Cache Layers

| Layer | TTL | Scope | Invalidation |
|-------|-----|-------|--------------|
| Browser | 5 min | User session | Manual refresh |
| API Response | 1 min | Per query hash | Version bump |
| Query Result | 5 min | Per tenant + query + permission | Version bump |
| Registry | 1 hour | Global | Deploy |

### Cache Flow

```typescript
async function fetchWidgetData(
  input: WidgetQueryInput,
  ctx: CompileCtx
): Promise<WidgetData> {
  const entity = getEntity(input.entityKey)
  const version = await redis.get(`cacheVersion:${ctx.tenantId}:${input.entityKey}`) || 0
  
  const compiled = compileQuery(input, ctx)
  const key = cacheKey(input.entityKey, compiled.hash, ctx, version)
  
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await executeQuery(compiled, ctx)
  await redis.setex(key, 300, JSON.stringify(data)) // 5 min TTL
  
  return data
}

async function invalidateOnMutation(tenantId: string, entityKey: string): Promise<void> {
  await redis.incr(`cacheVersion:${tenantId}:${entityKey}`)
}
```

---

## 18. Permissions

Same as 2.2, but enforce this layering:

1. **Tenant scope** (mandatory, first)
2. **Entity permission** `canView`
3. **rowFilter** (if any)
4. **Field masking** (`hiddenFields`) for drilldown/select

```typescript
interface PermissionSet {
  entities: Record<string, EntityPermission>
  widgets: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
  }
  dashboards: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
  }
  actions: Record<string, boolean>
}

interface EntityPermission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  hiddenFields?: string[]
  readOnlyFields?: string[]
  rowFilter?: FilterPredicate[]  // e.g., only see assigned records
}
```

### Role-Based Defaults

| Role | Records | Tasks | Widgets | Dashboards | Actions |
|------|---------|-------|---------|------------|---------|
| Admin | Full | Full | Full | Full | All |
| Manager | Full | Full | Create/Edit | Create/Edit | All |
| Agent | View + Own | Own | View | View | Limited |
| Viewer | View | View | View | View | None |

### Permission Check Flow

```typescript
function checkQueryPermission(
  input: WidgetQueryInput,
  ctx: CompileCtx
): void {
  const entityPerm = ctx.permissions.entities[input.entityKey]
  
  if (!entityPerm?.canView) {
    throw new PermissionDeniedError(`No permission to view ${input.entityKey}`)
  }
}
```

---

## 19. UI/UX Guidelines

Same as 2.2.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Instant Feedback** | Loading states, optimistic updates, skeleton screens |
| **Progressive Disclosure** | Show simple first, reveal complexity on demand |
| **Consistency** | Same patterns across all widgets and dashboards |
| **Accessibility** | WCAG 2.1 AA compliance, keyboard navigation |
| **Mobile-First** | Responsive design, touch-friendly targets |

### Widget States

| State | Visual | Behavior |
|-------|--------|----------|
| Loading | Skeleton + spinner | Disable interactions |
| Empty | Illustration + message | Show "Add data" CTA |
| Error | Error icon + message | Show retry/reconfigure |
| Success | Data visualization | Enable all interactions |
| Stale | Data + refresh indicator | Show "Refresh" button |

### Color Palette

| Use | Color | Hex |
|-----|-------|-----|
| Primary | Blue | #3B82F6 |
| Success | Green | #10B981 |
| Warning | Amber | #F59E0B |
| Error | Red | #EF4444 |
| Info | Sky | #0EA5E9 |
| Neutral | Slate | #64748B |

---

## 20. Execution Phases (adjusted)

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core infrastructure with v2.2.1 patches

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Tenant scope system (direct vs via_join) | P0 | All entities have correct tenant scope |
| Junction entities for usage analytics | P0 | `record_tags`, `record_motivations` exist |
| Denormalized counters contract | P0 | `phoneCount`, `tagCount`, etc. on Record |
| Entity Registry | P0 | All entities defined with tenant scope |
| Segment Registry | P0 | All segments with predicates |
| Metric Registry | P0 | count, sum, avg, preset rates |
| Dimension Registry | P0 | All groupable fields |
| Field Resolver | P0 | Scalar and relation resolvers |
| Query Compiler | P0 | Compiles with tenant + permission scope |
| Date Semantics | P0 | All date modes with timezone support |
| Version bump caching | P0 | Redis-safe invalidation |

**Exit Criteria:**
- [ ] Can compile any widget config to Prisma query
- [ ] Tenant scope is always `workspaceId`
- [ ] Permission scope is layered correctly
- [ ] Cache keys include permission scope

### Phase 2: Widget Engine (Weeks 3-4)

**Goal:** Full widget rendering with server-safe drilldowns

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Widget Config Schema | P0 | Canonical model validated |
| KPI Widget | P0 | Renders count with comparison |
| Chart Widgets | P0 | Bar, pie, line, area working |
| Table Widget | P1 | Sortable, paginated |
| Drilldown API | P0 | Accepts `widgetQuery`, not `compiledQuery` |
| Drilldown Modal | P0 | Opens with same query, paginated |
| Bulk Actions | P1 | Assign, tag, task from drilldown |
| Export | P1 | CSV, Excel from drilldown |

**Exit Criteria:**
- [ ] All widget types render correctly
- [ ] Drilldown shows exact matching rows
- [ ] Client never sends CompiledQuery

### Phase 3: Builder UX (Weeks 5-6)

Same as 2.2.

### Phase 4: Stacks & Actions (Weeks 7-8)

Same as 2.2.

### Phase 5: Dashboards & Insights (Weeks 9-10)

Same as 2.2.

### Phase 6: Polish & Performance (Weeks 11-12)

Same as 2.2.

---

## 21. Technical Specifications

### Prisma Schema Additions

#### Denormalized Counts on Record

```prisma
model Record {
  id               String   @id @default(cuid())
  workspaceId      String

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Denormalized counters (v2.2.1 contract)
  phoneCount       Int @default(0)
  emailCount       Int @default(0)
  tagCount         Int @default(0)
  motivationCount  Int @default(0)

  // ... other fields

  @@index([workspaceId])
}
```

#### Junction Entities (for real junction_created)

```prisma
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
  @@index([recordId])
  @@index([tagId])
  @@index([createdAt])
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
  @@index([recordId])
  @@index([motivationId])
  @@index([createdAt])
}
```

#### Analytics Tables

```prisma
model AnalyticsStack {
  id             String    @id @default(cuid())
  tenantId       String    // workspaceId
  name           String
  description    String?
  entityKey      String
  filters        Json
  segmentKey     String?
  definitionHash String
  version        Int       @default(1)
  usageCount     Int       @default(0)
  lastUsedAt     DateTime?
  isShared       Boolean   @default(false)
  sharedWith     String[]  @default([])
  createdBy      String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  @@index([tenantId])
  @@index([entityKey])
}

model AnalyticsDashboard {
  id            String   @id @default(cuid())
  tenantId      String   // workspaceId
  name          String
  description   String?
  widgets       Json
  layout        Json
  isSystem      Boolean  @default(false)
  systemKey     String?
  systemVersion Int?
  isCustomized  Boolean  @default(false)
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  @@index([tenantId])
  @@index([systemKey])
}

model AnalyticsAuditLog {
  id            String   @id @default(cuid())
  tenantId      String
  userId        String
  action        String
  entityType    String
  selectionType String
  affectedCount Int
  affectedIds   String[] @default([])
  payload       Json
  result        String
  errorMessage  String?
  startedAt     DateTime
  completedAt   DateTime
  durationMs    Int
  createdAt     DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/widget` | POST | Execute widget query |
| `/api/analytics/drilldown` | POST | Get drilldown rows (accepts `widgetQuery`) |
| `/api/analytics/export` | POST | Export drilldown data |
| `/api/analytics/stacks` | GET/POST | List/create stacks |
| `/api/analytics/stacks/:id` | GET/PUT/DELETE | Stack CRUD |
| `/api/analytics/dashboards` | GET/POST | List/create dashboards |
| `/api/analytics/dashboards/:id` | GET/PUT/DELETE | Dashboard CRUD |
| `/api/analytics/insights` | GET | Get active insights |
| `/api/analytics/actions` | POST | Execute bulk action |

### File Structure

```
src/
├── lib/
│   └── analytics/
│       ├── registry/
│       │   ├── entities.ts
│       │   ├── segments.ts
│       │   ├── metrics.ts
│       │   └── dimensions.ts
│       ├── query/
│       │   ├── compiler.ts
│       │   ├── fieldResolver.ts
│       │   ├── segmentCompiler.ts
│       │   ├── filterCompiler.ts
│       │   ├── tenantScope.ts
│       │   ├── permissionScope.ts
│       │   └── dateSemantics.ts
│       ├── cache/
│       │   ├── widgetCache.ts
│       │   └── versionBump.ts
│       └── types.ts
├── app/
│   └── api/
│       └── analytics/
│           ├── widget/route.ts
│           ├── drilldown/route.ts
│           ├── export/route.ts
│           ├── stacks/route.ts
│           ├── dashboards/route.ts
│           ├── insights/route.ts
│           └── actions/route.ts
└── components/
    └── analytics/
        ├── widgets/
        ├── builder/
        ├── drilldown/
        ├── stacks/
        └── dashboard/
```

---

## 22. Migration Mapping + Audit

Same as 2.2, plus:

### Counter Migration

If legacy had segments like `records_multiple_phones`, migrate predicate to:

```typescript
{ field: 'phoneCount', operator: 'gt', value: 1 }
```

If you don't have counters yet, migration should fail fast with a clear error:

```
"Segment requires Record.phoneCount but field not present"
```

### Migration Checklist

- [ ] All legacy datasource keys mapped to entity + segment
- [ ] All existing widgets migrated to new config schema
- [ ] All existing filters migrated to predicate format
- [ ] All existing metrics mapped to registry keys
- [ ] All existing groupBy mapped to dimension keys
- [ ] Denormalized counters added to Record model
- [ ] Junction entities created with `workspaceId`
- [ ] Backward compatibility layer for old API calls
- [ ] Data validation for migrated configs
- [ ] Rollback plan if migration fails

---

## 23. Success Metrics

Same as 2.2.

### Implementation Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Widget Load Time | < 500ms | P95 latency |
| Query Compile Time | < 50ms | P95 latency |
| Cache Hit Rate | > 80% | Cache hits / total requests |
| Error Rate | < 0.1% | Errors / total requests |
| Test Coverage | > 80% | Lines covered |

### User Experience

| Metric | Target | Measurement |
|--------|--------|-------------|
| Widget Creation Time | < 30s | Time from start to save |
| Drilldown Click Rate | > 50% | Drilldowns / widget views |
| Stack Usage | > 20% | Widgets using stacks |
| Dashboard Customization | > 30% | Customized / total dashboards |
| Insight Action Rate | > 40% | Actions taken / insights shown |

### Business Impact

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users | +20% | DAU on analytics |
| Time in Analytics | +30% | Session duration |
| Bulk Actions | +50% | Actions via widgets |
| Support Tickets | -20% | Analytics-related tickets |

---

## Quick "Reality Check" Summary

### What 2.2.1 Guarantees

✅ You can ship this without "analytics lies" because:

| Guarantee | How |
|-----------|-----|
| **Tenant scope is correct** | `workspaceId`, not `createdById` |
| **Permissions don't leak into caching** | Cache key includes `role:userId` |
| **Tag usage is modeled correctly** | Junction entity `record_tags` |
| **"count" predicates are actually queryable** | Denormalized counters on Record |
| **Drilldowns can't be tampered with** | Client sends `widgetQuery`, server recompiles |
| **Redis won't get nuked by KEYS** | Version bump invalidation |

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

// Canonical Widget Query Input
interface WidgetQueryInput {
  entityKey: EntityKey
  segmentKey?: SegmentKey
  filters: FilterPredicate[]
  globalFilters: GlobalFilters
  metric: MetricConfig
  dimension?: DimensionKey
  dateRange: DateRangePreset | { start: Date; end: Date }
  dateMode?: DateModeKey
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sort?: SortConfig
  limit?: number
}

// Compile Context
interface CompileCtx {
  tenantId: string
  userId: string
  role: 'admin' | 'manager' | 'agent' | 'viewer'
  timezone: string
  permissions: PermissionSet
}
```

---

## Appendix B: Quick Reference

### Entity → Tenant Scope

| Entity | Scope Mode | Field/Path |
|--------|------------|------------|
| records | direct | workspaceId |
| tasks | direct | workspaceId |
| phones | via_join | record.workspaceId |
| emails | via_join | record.workspaceId |
| activity | direct | workspaceId |
| record_tags | direct | workspaceId |
| record_motivations | direct | workspaceId |
| tags | direct | workspaceId |
| motivations | direct | workspaceId |

### Entity → Available Segments

| Entity | Segments |
|--------|----------|
| records | all, hot, warm, cold, assigned, unassigned, withPhone, withEmail, withTag, callReady, multiplePhones |
| tasks | all, pending, completed, overdue, dueToday, dueThisWeek |
| record_tags | all (use for tag usage analytics) |
| record_motivations | all (use for motivation usage analytics) |
| phones | all, mobile, landline, verified |
| emails | all, verified, unverified |

### Entity → Available Metrics

| Entity | Metrics |
|--------|---------|
| records | count, tagCoverage, phoneCoverage, emailCoverage, avgPhones, hotRate |
| tasks | count, completionRate, avgDuration |
| record_tags | count (tag usage count) |
| record_motivations | count (motivation usage count) |
| phones | count, verificationRate |
| emails | count, verificationRate |

### Entity → Available Dimensions

| Entity | Dimensions |
|--------|------------|
| records | status, temperature, assignedTo, tag, motivation, day, week, month |
| tasks | status, priority, assignedTo, day, week, month |
| record_tags | tag, day, week, month |
| record_motivations | motivation, day, week, month |
| phones | phoneType, day, week, month |
| emails | day, week, month |

---

*End of DockInsight 2.2.1 Implementation Plan*
