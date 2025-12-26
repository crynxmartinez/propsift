# DockInsight 2.2 — Implementation Plan (Production-Grade)

> **Databox-grade analytics + PropSift operations console**
> 
> v2.2 adds: Query Compiler, Field Resolver, Date Semantics, Permissions, Caching, Error Handling, Migration Audit, and consistency guarantees.

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
| **Instant Answers** | KPI Mode, smart defaults, daily dashboards |
| **Truth Behind Numbers** | Drilldowns open the real list behind any chart |
| **Do the Work** | Action Widgets + Stacks as an operations console |
| **Scales Without Confusion** | Registry-driven entity/segment/metric/dimension system |
| **Always Consistent** | Same compiled query powers widget value + drilldown |
| **Production-Ready** | Proper error handling, caching, permissions |

---

## 2. Current State Analysis

### What We Already Have ✅

| Feature | Status | Implementation |
|---------|--------|----------------|
| 12 Widget Types | ✅ Complete | number, bar, pie, line, area, gauge, progress, leaderboard, funnel, table, donut, horizontal_bar |
| 60+ Data Sources | ✅ Complete | Hardcoded switches (needs registry refactor) |
| Metrics (count/sum/avg) | ✅ Complete | Basic aggregations work |
| Formula Builder | ✅ Complete | Advanced calculated metrics |
| Group By Options | ✅ Complete | Per-entity options defined |
| Time Periods | ✅ Complete | 15 options (all_time to last_365_days) |
| Granularity | ✅ Complete | Daily/Weekly/Monthly for time series |
| Basic Filters | ✅ Partial | Field-level filters work |
| Cross-Filters | ✅ Partial | Tag/motivation/status/assignee/temperature |
| Comparison | ✅ Complete | Previous period, week, month, year |
| Drag-drop Grid | ✅ Complete | react-grid-layout |
| Config Panel | ✅ Complete | Right-side panel |
| Multi-Metric | ✅ Complete | Multiple metrics in one widget |

### What's Missing ❌

| Feature | Priority | Phase |
|---------|----------|-------|
| Registry System | **Critical** | A |
| Query Compiler + Field Resolver | **Critical** | A |
| Date Semantics | **High** | A |
| Error Handling | **High** | A |
| Caching Strategy | **High** | A |
| Permissions | **High** | A |
| Rate Metric Fast Path | **High** | B |
| Drilldowns | **High** | B |
| KPI Mode vs Builder Mode | **High** | B |
| Global Filter Bar | **High** | C |
| Stacks | **Medium** | C |
| Action Widgets | **Medium** | D |
| System Dashboards | **Medium** | D |
| Insights Strip | **Low** | E |

---

## 3. Core Model & Architecture

### Canonical Widget Model

Every widget compiles to:

```
Entity + Segment(optional) + Filters + Metric(s) + Dimension(optional) + DateRange + DateMode + Granularity + Sort/Limit
```

### Terminology Mapping

| UI Term | Logic Term | Database Term |
|---------|------------|---------------|
| Data Sets | Segments | Filter presets |
| - | Entities | Tables/models |
| Group By | Dimensions | Grouping fields |

### Hard Rules

1. **1 Segment = 1 Entity** (always predictable)
2. **Segments are FILTER-ONLY** (no sort/limit inside segments)
3. **Widgets control sorting/limits** (Top 10, least-used, etc.)
4. **Widget value and drilldown use the exact same compiled query**
5. **All queries go through the Query Compiler** (single source of truth)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Widget Request                                 │
│  { entityKey, segmentKey, filters, metric, dimension, dateRange, ... }  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REGISTRY VALIDATION                              │
│  - Entity exists?                                                        │
│  - Segment belongs to entity?                                            │
│  - Metric supported by entity?                                           │
│  - Dimension supported by entity?                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          QUERY COMPILER                                  │
│  - Resolve segment predicates                                            │
│  - Resolve filter predicates (via Field Resolver)                        │
│  - Apply date semantics                                                  │
│  - Apply tenant/permission filters                                       │
│  - Output: CompiledQuery                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  Aggregate Query  │           │  Drilldown Query  │
        │  (widget value)   │           │  (list of rows)   │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
              ┌──────────┐                   ┌──────────┐
              │   1,247  │                   │  [rows]  │
              └──────────┘                   └──────────┘
```

---

## 4. Registry System

Four registries drive UI + validation:

1. **Entity Registry** - What tables exist and what they support
2. **Segment Registry** - Predefined filter presets per entity
3. **Metric Registry** - Available calculations
4. **Dimension Registry** - Available groupings

---

### A) Entity Registry

```typescript
// src/lib/analytics/registries/entities.ts

export interface EntityDefinition {
  key: string                    // 'records' | 'tasks' | etc.
  label: string                  // 'Record'
  labelPlural: string            // 'Records'
  table: string                  // Prisma model name
  
  // Multi-tenant + permissions
  tenantField: string            // 'createdById' or 'ownerId'
  permissionScope: 'team' | 'adminOnly'
  
  // Time semantics
  defaultTimeField: string       // 'createdAt'
  dateModes: {
    default: DateModeKey
    supported: DateModeKey[]
  }
  
  // Capabilities
  metrics: MetricKey[]           // ['count', 'sum', 'avg', 'rate']
  dimensions: DimensionKey[]     // ['status', 'temperature', ...]
  sumFields?: SumFieldDef[]      // Fields that can be summed
  avgFields?: AvgFieldDef[]      // Fields that can be averaged
  
  // Drilldown + actions
  drilldownRoute: string         // '/dashboard/records'
  drilldownQueryParam: string    // 'filter'
  quickActions: ActionType[]     // ['assign', 'createTask', 'export']
  
  // Joins for inherited dimensions/date modes
  joins?: EntityJoin[]
}

export interface EntityJoin {
  entity: string                 // 'records'
  foreignKey: string             // 'recordId'
  inheritDimensions?: string[]   // ['propertyState', 'propertyCity']
  inheritDateModes?: DateModeKey[]
}

export interface SumFieldDef {
  field: string
  label: string
  type: 'number' | 'currency'
}

export interface AvgFieldDef {
  field: string
  label: string
  type: 'number' | 'currency'
}

export type DateModeKey =
  | 'entity_created'
  | 'record_created'
  | 'junction_created'
  | 'activity_created'

export type ActionType =
  | 'assign'
  | 'createTask'
  | 'addTag'
  | 'removeTag'
  | 'export'
  | 'complete'
  | 'reschedule'
  | 'delete'
```

#### Entity Definitions Table

| Entity Key | Label | Table | Tenant Field | Date Mode | Metrics | Drilldown |
|------------|-------|-------|--------------|-----------|---------|-----------|
| `records` | Records | Record | createdById | entity_created | count, sum, avg, rate | /dashboard/records |
| `tasks` | Tasks | Task | createdById | entity_created | count, rate | /dashboard/tasks |
| `tags` | Tags | Tag | createdById | junction_created | count | /dashboard/tags |
| `motivations` | Motivations | Motivation | createdById | junction_created | count | /dashboard/motivations |
| `statuses` | Statuses | Status | createdById | entity_created | count | /dashboard/statuses |
| `phones` | Phones | RecordPhoneNumber | record.createdById | entity_created | count | /dashboard/records |
| `emails` | Emails | RecordEmail | record.createdById | entity_created | count | /dashboard/records |
| `boards` | Boards | Board | createdById | entity_created | count | /dashboard/board |
| `automations` | Automations | Automation | createdById | entity_created | count | /dashboard/automations |
| `team` | Team | User | accountOwnerId | entity_created | count | /dashboard/settings |
| `activity` | Activity | ActivityLog | userId | activity_created | count | /dashboard/activity |
| `custom_fields` | Custom Fields | CustomField | createdById | entity_created | count | - |

---

### B) Segment Registry

```typescript
// src/lib/analytics/registries/segments.ts

export interface SegmentDefinition {
  key: string                    // 'hot'
  entityKey: string              // 'records'
  label: string                  // 'Hot Records'
  description: string            // 'Records with temperature = hot'
  predicate: FilterPredicate[]   // Filter conditions
  category: SegmentCategory      // 'quality' | 'execution' | etc.
  icon?: string                  // Lucide icon name
  color?: string                 // Hex color
}

export type SegmentCategory = 'quality' | 'execution' | 'pipeline' | 'coverage'

export interface FilterPredicate {
  field: string
  operator: FilterOperator
  value?: unknown
}

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in'
  | 'exists' | 'not_exists'  // For relations
```

#### Records Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `hot` | Hot Records | `temperature eq 'hot'` | pipeline |
| `warm` | Warm Records | `temperature eq 'warm'` | pipeline |
| `cold` | Cold Records | `temperature eq 'cold'` | pipeline |
| `new_7_days` | New (7 Days) | `createdAt gte NOW-7d` | pipeline |
| `new_30_days` | New (30 Days) | `createdAt gte NOW-30d` | pipeline |
| `assigned` | Assigned | `assignedToId is_not_empty` | execution |
| `unassigned` | Unassigned | `assignedToId is_empty` | execution |
| `has_tags` | Has Tags | `recordTags exists` | quality |
| `no_tags` | No Tags | `recordTags not_exists` | quality |
| `has_motivations` | Has Motivations | `recordMotivations exists` | quality |
| `no_motivations` | No Motivations | `recordMotivations not_exists` | quality |
| `has_phones` | Has Phones | `phones exists` | coverage |
| `no_phones` | No Phones | `phones not_exists` | coverage |
| `multiple_phones` | Multiple Phones | `phones.count gt 1` | coverage |
| `has_emails` | Has Emails | `emails exists` | coverage |
| `no_emails` | No Emails | `emails not_exists` | coverage |
| `multiple_emails` | Multiple Emails | `emails.count gt 1` | coverage |
| `on_boards` | On Boards | `boardPositions exists` | pipeline |
| `not_on_boards` | Not On Boards | `boardPositions not_exists` | pipeline |
| `call_ready` | Call Ready | See special definition | execution |

#### Call Ready Segment (Special)

```typescript
const CALL_READY_SEGMENT: SegmentDefinition = {
  key: 'call_ready',
  entityKey: 'records',
  label: 'Call Ready',
  description: 'Has phone, not DNC, not contacted in 14 days',
  predicate: [
    { field: 'phones', operator: 'exists' },
    { field: 'phones.statuses', operator: 'not_contains', value: 'DNC' },
    { field: 'lastContactedAt', operator: 'lt', value: 'NOW-14d' }
  ],
  category: 'execution',
  icon: 'Phone',
  color: '#10B981'
}
```

#### Tasks Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `pending` | Pending | `status eq 'PENDING'` | execution |
| `in_progress` | In Progress | `status eq 'IN_PROGRESS'` | execution |
| `completed` | Completed | `status eq 'COMPLETED'` | execution |
| `overdue` | Overdue | `dueDate lt NOW AND status neq 'COMPLETED'` | execution |
| `due_today` | Due Today | `dueDate eq TODAY` | execution |
| `due_this_week` | Due This Week | `dueDate between NOW and NOW+7d` | execution |
| `unassigned` | Unassigned | `assignedToId is_empty` | execution |
| `recurring` | Recurring | `recurrence is_not_empty` | pipeline |

#### Tags Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `used` | Used Tags | `recordTags exists` | quality |
| `unused` | Unused Tags | `recordTags not_exists` | quality |

#### Motivations Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `used` | Used Motivations | `recordMotivations exists` | quality |
| `unused` | Unused Motivations | `recordMotivations not_exists` | quality |

#### Phones Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `mobile` | Mobile | `type eq 'mobile'` | coverage |
| `landline` | Landline | `type eq 'landline'` | coverage |
| `voip` | VoIP | `type eq 'voip'` | coverage |
| `dnc` | DNC | `statuses contains 'DNC'` | coverage |
| `not_dnc` | Not DNC | `statuses not_contains 'DNC'` | coverage |

#### Automations Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `active` | Active | `isActive eq true` | execution |
| `inactive` | Inactive | `isActive eq false` | execution |

#### Team Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `active` | Active Members | `status eq 'active'` | execution |
| `inactive` | Inactive Members | `status eq 'inactive'` | execution |

> **Important:** "Top tags" or "Most used" is NOT a segment. That becomes widget sorting/limit.

---

### C) Metric Registry

```typescript
// src/lib/analytics/registries/metrics.ts

export interface MetricDefinition {
  key: string
  label: string
  type: 'aggregate' | 'rate_preset' | 'rate_generic' | 'formula'
  
  // For aggregate metrics
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  requiresField?: boolean
  allowedFieldTypes?: ('number' | 'currency')[]
  
  // For rate_preset metrics
  rateConfig?: {
    numeratorEntity: string
    numeratorSegment?: string
    denominatorEntity: string
    denominatorSegment?: string
  }
  
  // Display
  format: 'number' | 'percentage' | 'currency' | 'decimal'
  decimalPlaces?: number
  prefix?: string
  suffix?: string
}
```

#### Base Metrics

| Key | Label | Type | Aggregation | Requires Field | Format |
|-----|-------|------|-------------|----------------|--------|
| `count` | Count | aggregate | count | No | number |
| `sum` | Sum | aggregate | sum | Yes (number) | number |
| `avg` | Average | aggregate | avg | Yes (number) | decimal |
| `min` | Minimum | aggregate | min | Yes (number) | number |
| `max` | Maximum | aggregate | max | Yes (number) | number |

#### Preset Rate Metrics

| Key | Label | Numerator | Denominator | Format |
|-----|-------|-----------|-------------|--------|
| `tag_coverage` | Tag Coverage | records + has_tags | records | percentage |
| `motivation_coverage` | Motivation Coverage | records + has_motivations | records | percentage |
| `phone_coverage` | Phone Coverage | records + has_phones | records | percentage |
| `email_coverage` | Email Coverage | records + has_emails | records | percentage |
| `assignment_coverage` | Assignment Coverage | records + assigned | records | percentage |
| `task_completion_rate` | Task Completion Rate | tasks + completed | tasks | percentage |
| `call_ready_rate` | Call Ready Rate | records + call_ready | records | percentage |
| `hot_rate` | Hot Rate | records + hot | records | percentage |
| `warm_rate` | Warm Rate | records + warm | records | percentage |
| `cold_rate` | Cold Rate | records + cold | records | percentage |

---

### D) Dimension Registry

```typescript
// src/lib/analytics/registries/dimensions.ts

export interface DimensionDefinition {
  key: string
  label: string
  type: 'enum' | 'date' | 'string' | 'number' | 'relation'
  field: string                  // Database field path
  
  // Which entities support this
  entities: string[]
  
  // For enum dimensions
  enumValues?: { value: string; label: string; color?: string }[]
  
  // For relation dimensions
  relationConfig?: {
    through?: string             // Junction table
    targetTable: string          // Related table
    labelField: string           // Field to use as label
    colorField?: string          // Optional color field
  }
  
  // For date dimensions
  dateBuckets?: ('day' | 'week' | 'month' | 'quarter' | 'year')[]
  
  // Supported operators for filtering
  supportedOperators: FilterOperator[]
}
```

#### Dimension Definitions

| Key | Label | Type | Entities | Field |
|-----|-------|------|----------|-------|
| `status` | Status | relation | records | statusId |
| `temperature` | Temperature | enum | records | temperature |
| `tag` | Tag | relation | records | recordTags.tag |
| `motivation` | Motivation | relation | records | recordMotivations.motivation |
| `assignedTo` | Assignee | relation | records, tasks | assignedToId |
| `createdBy` | Creator | relation | records, tasks | createdById |
| `propertyState` | State | string | records | property.state |
| `propertyCity` | City | string | records | property.city |
| `structureType` | Structure Type | string | records | property.structureType |
| `yearBuilt` | Year Built | number | records | property.yearBuilt |
| `bedrooms` | Bedrooms | number | records | property.bedrooms |
| `bathrooms` | Bathrooms | number | records | property.bathrooms |
| `taskStatus` | Status | enum | tasks | status |
| `priority` | Priority | enum | tasks | priority |
| `phoneType` | Phone Type | enum | phones | type |
| `automationStatus` | Status | enum | automations | isActive |
| `role` | Role | enum | team | role |
| `actionType` | Action Type | enum | activity | action |
| `day` | By Day | date | all | createdAt |
| `week` | By Week | date | all | createdAt |
| `month` | By Month | date | all | createdAt |
| `quarter` | By Quarter | date | all | createdAt |
| `year` | By Year | date | all | createdAt |

---

## 5. Query Compiler & Field Resolver

This is the core that makes v2.2 executable. Without this, pseudo-fields like `phones.count` or `recordTags.exists` cannot be queried.

### Why You Need It

Your predicates include pseudo-fields that Prisma/SQL can't query directly:
- `phones.count > 1` → needs subquery or aggregation
- `recordTags.exists` → needs relation check
- `lastContactedAt < NOW-14d` → needs date calculation

The Field Resolver compiles these into real Prisma query fragments.

### Components

#### 1) Field Resolver Registry

```typescript
// src/lib/analytics/query/fieldResolver.ts

export type ResolverType = 'scalar' | 'relation' | 'computed'

export interface FieldResolver {
  entityKey: string
  field: string
  type: ResolverType
  description?: string
  
  // Supported operators (not all fields support all ops)
  supportedOperators: FilterOperator[]
  
  // Compile to Prisma where clause
  toWhere: (op: FilterOperator, value: unknown, ctx: CompileCtx) => PrismaWhere
  
  // Optional: custom select for computed fields
  toSelect?: (ctx: CompileCtx) => PrismaSelect
  
  // Optional: custom orderBy
  toOrderBy?: (dir: 'asc' | 'desc', ctx: CompileCtx) => PrismaOrderBy
  
  // Validation
  validate?: (op: FilterOperator, value: unknown) => ValidationResult
}

export interface CompileCtx {
  tenantField: string
  tenantId: string
  dateRange?: { start: Date; end: Date }
  dateMode?: DateModeKey
  userId?: string
  permissions?: PermissionSet
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

type PrismaWhere = Record<string, unknown>
type PrismaSelect = Record<string, unknown>
type PrismaOrderBy = Record<string, unknown>
```

#### Example Field Resolvers

```typescript
// Scalar field resolver
const temperatureResolver: FieldResolver = {
  entityKey: 'records',
  field: 'temperature',
  type: 'scalar',
  description: 'Record temperature (hot/warm/cold)',
  supportedOperators: ['eq', 'neq', 'in', 'not_in'],
  
  toWhere: (op, value) => {
    switch (op) {
      case 'eq': return { temperature: value }
      case 'neq': return { temperature: { not: value } }
      case 'in': return { temperature: { in: value } }
      case 'not_in': return { temperature: { notIn: value } }
    }
  },
  
  validate: (op, value) => {
    const valid = ['hot', 'warm', 'cold'].includes(value as string)
    return valid ? { valid: true } : { valid: false, error: 'Invalid temperature' }
  }
}

// Relation exists resolver
const phonesExistsResolver: FieldResolver = {
  entityKey: 'records',
  field: 'phones',
  type: 'relation',
  description: 'Record has phone numbers',
  supportedOperators: ['exists', 'not_exists'],
  
  toWhere: (op) => {
    switch (op) {
      case 'exists': return { phones: { some: {} } }
      case 'not_exists': return { phones: { none: {} } }
    }
  }
}

// Computed field resolver (count)
const phonesCountResolver: FieldResolver = {
  entityKey: 'records',
  field: 'phones.count',
  type: 'computed',
  description: 'Number of phone numbers on record',
  supportedOperators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
  
  toWhere: (op, value, ctx) => {
    // This requires a subquery or _count
    // Prisma approach: use _count in select, then filter
    // For WHERE, we need raw SQL or different approach
    
    // Option 1: Use having with groupBy (complex)
    // Option 2: Use raw SQL
    // Option 3: Post-filter (not ideal for large datasets)
    
    // Recommended: Use Prisma's relation count filter
    return {
      phones: {
        // Prisma doesn't support count in where directly
        // We'll handle this in the compiler with a different strategy
      }
    }
  },
  
  // For phones.count, we use a different compilation strategy
  // See: ComputedFieldStrategy below
}
```

#### Computed Field Strategy

For fields like `phones.count > 1`, we have options:

| Strategy | Pros | Cons | Use When |
|----------|------|------|----------|
| Raw SQL | Fast, accurate | Prisma bypass | Large datasets |
| Post-filter | Simple | Memory intensive | Small datasets |
| Denormalized field | Fastest | Needs sync | Frequent queries |

**Recommended:** Add denormalized count fields for frequently queried relations:

```prisma
model Record {
  // ... existing fields
  
  // Denormalized counts (updated via triggers/hooks)
  phoneCount      Int @default(0)
  emailCount      Int @default(0)
  tagCount        Int @default(0)
  motivationCount Int @default(0)
}
```

#### 2) Segment Compiler

```typescript
// src/lib/analytics/query/segmentCompiler.ts

export function compileSegment(
  segment: SegmentDefinition,
  ctx: CompileCtx
): PrismaWhere {
  const whereConditions = segment.predicate.map(pred => {
    const resolver = getFieldResolver(segment.entityKey, pred.field)
    if (!resolver) {
      throw new QueryCompileError(`Unknown field: ${pred.field}`)
    }
    
    // Validate operator
    if (!resolver.supportedOperators.includes(pred.operator)) {
      throw new QueryCompileError(
        `Operator ${pred.operator} not supported for ${pred.field}`
      )
    }
    
    // Validate value
    if (resolver.validate) {
      const result = resolver.validate(pred.operator, pred.value)
      if (!result.valid) {
        throw new QueryCompileError(result.error!)
      }
    }
    
    return resolver.toWhere(pred.operator, pred.value, ctx)
  })
  
  return { AND: whereConditions }
}
```

#### 3) Filter Compiler

```typescript
// src/lib/analytics/query/filterCompiler.ts

export function compileFilters(
  entityKey: string,
  filters: FilterPredicate[],
  globalFilters: GlobalFilters,
  ctx: CompileCtx
): PrismaWhere {
  const conditions: PrismaWhere[] = []
  
  // Compile widget-level filters
  for (const filter of filters) {
    const resolver = getFieldResolver(entityKey, filter.field)
    if (!resolver) continue // Skip unknown fields
    
    conditions.push(resolver.toWhere(filter.operator, filter.value, ctx))
  }
  
  // Compile applicable global filters
  const applicableGlobalFilters = getApplicableGlobalFilters(entityKey, globalFilters)
  for (const [key, value] of Object.entries(applicableGlobalFilters)) {
    const globalResolver = getGlobalFilterResolver(entityKey, key)
    if (globalResolver && value !== undefined) {
      conditions.push(globalResolver.toWhere(value, ctx))
    }
  }
  
  return conditions.length > 0 ? { AND: conditions } : {}
}
```

#### 4) Query Compiler (Single Source of Truth)

```typescript
// src/lib/analytics/query/compiler.ts

export interface WidgetQuery {
  entityKey: string
  segmentKey?: string
  filters: FilterPredicate[]
  globalFilters: GlobalFilters
  metric: MetricConfig
  dimension?: string
  dateRange: DateRange
  dateMode?: DateModeKey
  sort?: SortConfig
  limit?: number
}

export interface CompiledQuery {
  entityKey: string
  table: string
  where: PrismaWhere
  select?: PrismaSelect
  orderBy?: PrismaOrderBy
  take?: number
  skip?: number
  dateMode: DateModeKey
  
  // For aggregations
  groupBy?: string[]
  aggregate?: AggregateConfig
  
  // Metadata
  hash: string  // For caching
}

export function compileQuery(
  query: WidgetQuery,
  ctx: CompileCtx
): CompiledQuery {
  const entity = getEntity(query.entityKey)
  if (!entity) {
    throw new QueryCompileError(`Unknown entity: ${query.entityKey}`)
  }
  
  // Start with tenant filter
  const baseWhere: PrismaWhere = {
    [entity.tenantField]: ctx.tenantId
  }
  
  // Add segment predicate
  let segmentWhere: PrismaWhere = {}
  if (query.segmentKey) {
    const segment = getSegment(query.entityKey, query.segmentKey)
    if (!segment) {
      throw new QueryCompileError(`Unknown segment: ${query.segmentKey}`)
    }
    segmentWhere = compileSegment(segment, ctx)
  }
  
  // Add filters
  const filterWhere = compileFilters(
    query.entityKey,
    query.filters,
    query.globalFilters,
    ctx
  )
  
  // Add date range
  const dateMode = query.dateMode || entity.dateModes.default
  const dateWhere = compileDateRange(query.dateRange, dateMode, entity, ctx)
  
  // Combine all conditions
  const where: PrismaWhere = {
    AND: [baseWhere, segmentWhere, filterWhere, dateWhere].filter(w => Object.keys(w).length > 0)
  }
  
  // Build orderBy
  let orderBy: PrismaOrderBy | undefined
  if (query.sort) {
    orderBy = { [query.sort.field]: query.sort.dir }
  }
  
  // Compute hash for caching
  const hash = computeQueryHash(where, orderBy, query.limit)
  
  return {
    entityKey: query.entityKey,
    table: entity.table,
    where,
    orderBy,
    take: query.limit,
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

```typescript
// Both use the same compiled query
const compiled = compileQuery(widgetQuery, ctx)

// Widget: aggregate
const count = await prisma[compiled.table].count({ where: compiled.where })

// Drilldown: list
const rows = await prisma[compiled.table].findMany({
  where: compiled.where,
  orderBy: compiled.orderBy,
  take: pageSize,
  skip: (page - 1) * pageSize
})
```

---

## 6. Date Semantics

Date range must mean something consistent across entities.

### Date Modes

| Mode | Meaning | Time Field | Example Entities |
|------|---------|------------|------------------|
| `entity_created` | When the entity was created | entity.createdAt | records, tasks |
| `record_created` | When the parent record was created | record.createdAt | phones, emails |
| `junction_created` | When the relationship was created | junction.createdAt | tags, motivations usage |
| `activity_created` | When the activity occurred | activity.createdAt | activity logs |

### Date Mode Examples

| Query | Date Mode | Meaning |
|-------|-----------|---------|
| "Records created last 30 days" | entity_created | record.createdAt >= 30d ago |
| "Tags used last 30 days" | junction_created | recordTag.createdAt >= 30d ago |
| "Phones added last 30 days" | entity_created | phone.createdAt >= 30d ago |
| "Activity last 30 days" | activity_created | activity.createdAt >= 30d ago |

### UI Behavior

If entity supports multiple date modes, show selector:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Date measures: [Record Created ▼]                                      │
│                  ├─ Record Created                                      │
│                  ├─ Tag Applied                                         │
│                  └─ Last Activity                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/lib/analytics/query/dateSemantics.ts

export function compileDateRange(
  dateRange: DateRange,
  dateMode: DateModeKey,
  entity: EntityDefinition,
  ctx: CompileCtx
): PrismaWhere {
  const { start, end } = resolveDateRange(dateRange)
  
  switch (dateMode) {
    case 'entity_created':
      return {
        [entity.defaultTimeField]: {
          gte: start,
          lte: end
        }
      }
    
    case 'record_created':
      // For entities joined to records
      const recordJoin = entity.joins?.find(j => j.entity === 'records')
      if (!recordJoin) {
        throw new QueryCompileError(`Entity ${entity.key} cannot use record_created date mode`)
      }
      return {
        record: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }
    
    case 'junction_created':
      // For junction tables (tags, motivations)
      // This requires querying the junction table directly
      return {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    
    case 'activity_created':
      return {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    
    default:
      return {}
  }
}

export function resolveDateRange(dateRange: DateRange): { start: Date; end: Date } {
  if (typeof dateRange === 'object' && 'start' in dateRange) {
    return dateRange
  }
  
  const now = new Date()
  const today = startOfDay(now)
  
  switch (dateRange) {
    case 'today':
      return { start: today, end: endOfDay(now) }
    case 'yesterday':
      return { start: subDays(today, 1), end: endOfDay(subDays(today, 1)) }
    case 'this_week':
      return { start: startOfWeek(now), end: endOfWeek(now) }
    case 'last_7_days':
      return { start: subDays(today, 7), end: endOfDay(now) }
    case 'last_30_days':
      return { start: subDays(today, 30), end: endOfDay(now) }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month':
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfQuarter(now) }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'all_time':
      return { start: new Date(0), end: endOfDay(now) }
    default:
      return { start: subDays(today, 30), end: endOfDay(now) }
  }
}
```

---

## 7. Builder UX Flow

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

### Smart Defaults

| Entity | Default Segment | Default Metric | Default Dimension |
|--------|-----------------|----------------|-------------------|
| records | (none) | count | status |
| tasks | pending | count | assignedTo |
| tags | used | count | (none) |
| motivations | used | count | (none) |
| phones | (none) | count | phoneType |

---

## 8. KPI Mode vs Builder Mode

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

### Mode Toggle

```typescript
interface WidgetModeState {
  mode: 'kpi' | 'builder'
  isEditing: boolean
  showAdvanced: boolean
}
```

---

## 9. Global Filters

### Definition

```typescript
interface GlobalFilters {
  dateRange: DateRangePreset | CustomDateRange
  assignedTo?: string | null  // null = unassigned
  temperature?: Temperature[]
  status?: RecordStatus[]
  tags?: string[]
  // Extensible per tenant
}
```

### Applicability Matrix

| Global Filter | records | tasks | phones | emails | tags | motivations |
|---------------|---------|-------|--------|--------|------|-------------|
| dateRange | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| assignedTo | ✅ | ✅ | via record | via record | ❌ | ❌ |
| temperature | ✅ | via record | via record | via record | ❌ | ❌ |
| status | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| tags | ✅ | via record | via record | via record | ❌ | ❌ |

### UI Indicator

When a global filter doesn't apply to a widget's entity, show indicator:

```
┌─────────────────────────────────────────┐
│  📊 Tags by Usage                       │
│  ⚠️ Assignee filter not applicable      │
│                                         │
│  [Tag A] ████████████ 45                │
│  [Tag B] ████████ 32                    │
└─────────────────────────────────────────┘
```

---

## 10. Metrics System

### Metric Types

| Type | Description | Example |
|------|-------------|---------|
| `aggregate` | Simple aggregation | count, sum, avg, min, max |
| `preset_rate` | Predefined coverage | tagCoverage, phoneCoverage |
| `generic_rate` | User-defined ratio | numerator/denominator |
| `formula` | Computed expression | (a + b) / c |

### Aggregate Metrics

```typescript
interface AggregateMetric {
  key: string
  type: 'aggregate'
  label: string
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max'
  field?: string  // Required for sum/avg/min/max
  entities: string[]
}
```

### Rate Metrics

```typescript
interface RateMetric {
  key: string
  type: 'preset_rate' | 'generic_rate'
  label: string
  numerator: MetricRef | SegmentRef
  denominator: MetricRef | SegmentRef
  format: 'percent' | 'ratio'
  
  // Constraint: denominator must be superset of numerator
  // e.g., "hot records" / "all records" ✅
  // e.g., "all records" / "hot records" ❌
}
```

### Formula Metrics

```typescript
interface FormulaMetric {
  key: string
  type: 'formula'
  label: string
  expression: string  // e.g., "(a + b) / c"
  variables: Record<string, MetricRef>
  format: 'number' | 'percent' | 'currency'
}
```

### Preset Metrics Registry

| Key | Label | Type | Formula |
|-----|-------|------|---------|
| `count` | Count | aggregate | COUNT(*) |
| `tagCoverage` | Tag Coverage | preset_rate | records with tags / all records |
| `phoneCoverage` | Phone Coverage | preset_rate | records with phones / all records |
| `emailCoverage` | Email Coverage | preset_rate | records with emails / all records |
| `avgPhones` | Avg Phones | aggregate | AVG(phoneCount) |
| `hotRate` | Hot Rate | preset_rate | hot records / all records |

---

## 11. Drilldowns

### Core Principle

**Drilldown = same compiled query, but SELECT instead of COUNT**

### Drilldown Interface

```typescript
interface DrilldownConfig {
  entityKey: string
  columns: ColumnDef[]
  defaultSort: SortConfig
  pageSize: number
  bulkActions: BulkActionDef[]
  exportFormats: ExportFormat[]
}

interface DrilldownRequest {
  compiledQuery: CompiledQuery  // Same query that powered the widget
  page: number
  pageSize: number
  sort?: SortConfig
  search?: string
}

interface DrilldownResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

### Pagination

```typescript
// Server-side cursor pagination for large datasets
interface CursorPagination {
  cursor?: string  // Encoded cursor for next page
  take: number
  direction: 'forward' | 'backward'
}

// Offset pagination for smaller datasets
interface OffsetPagination {
  page: number
  pageSize: number
  skip: number  // (page - 1) * pageSize
}
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

### What is a Stack?

A **Stack** is a saved, reusable filter configuration that can be applied to any compatible widget.

### Stack Definition

```typescript
interface Stack {
  id: string
  tenantId: string
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
  
  // For change detection
  definitionHash: string
  
  // Usage tracking
  usageCount: number
  lastUsedAt?: Date
  
  // Sharing
  isShared: boolean
  sharedWith?: string[]
}

function computeStackHash(stack: Stack): string {
  const definition = {
    entityKey: stack.entityKey,
    filters: stack.filters,
    segmentKey: stack.segmentKey
  }
  return crypto.createHash('sha256')
    .update(JSON.stringify(definition))
    .digest('hex')
    .substring(0, 16)
}
```

### Stack Operations

| Operation | Description |
|-----------|-------------|
| Create | Save current widget filters as a new stack |
| Apply | Load stack filters into current widget |
| Update | Modify stack definition (bumps version) |
| Duplicate | Create copy with new name |
| Delete | Remove stack (soft delete) |
| Share | Make stack available to team |

---

## 13. Action Widgets

### Purpose

Action Widgets enable bulk operations directly from analytics views.

### Action Widget Definition

```typescript
interface ActionWidget {
  id: string
  type: 'action'
  entityKey: string
  segmentKey?: string
  filters: FilterPredicate[]
  actions: ActionDef[]
  selectionMode: 'all' | 'page' | 'manual'
  selectedIds?: string[]
  title: string
  description?: string
  showCount: boolean
}

interface ActionDef {
  key: string
  label: string
  icon: string
  type: 'assign' | 'tag' | 'task' | 'status' | 'export' | 'custom'
  requireConfirmation: boolean
  confirmationMessage?: string
  requiredPermission: string
  handler: ActionHandler
}

type SelectionToken = {
  type: 'all'
  compiledQuery: CompiledQuery
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
  selectionToken: SelectionToken
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

### Versioned Templates

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

interface WidgetPlacement {
  widgetConfig: WidgetConfig
  position: { x: number; y: number; w: number; h: number }
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

### Rule-Based Insights

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

interface InsightCondition {
  type: 'threshold' | 'trend' | 'anomaly' | 'comparison'
  metric: MetricRef
  segment?: SegmentRef
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
  value?: number
  direction?: 'up' | 'down'
  percentChange?: number
  period?: string
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

### Error Taxonomy

| Category | HTTP Code | User Message | Recovery |
|----------|-----------|--------------|----------|
| `QUERY_COMPILE_ERROR` | 400 | "Invalid widget configuration" | Show config panel |
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
  stack?: string
  retryable: boolean
  retryAfterMs?: number
  suggestedAction?: 'retry' | 'reconfigure' | 'contact_support'
}
```

---

## 17. Caching Strategy

### Cache Layers

| Layer | TTL | Scope | Invalidation |
|-------|-----|-------|--------------|
| Browser | 5 min | User session | Manual refresh |
| API Response | 1 min | Per query hash | Data mutation |
| Query Result | 5 min | Per tenant + query | Data mutation |
| Registry | 1 hour | Global | Deploy |

### Cache Key Structure

```typescript
function buildCacheKey(query: CompiledQuery, ctx: CompileCtx): string {
  return [
    'widget',
    ctx.tenantId,
    query.entityKey,
    query.hash,
    query.dateMode,
    formatDateRange(ctx.dateRange)
  ].join(':')
}
```

### Cache Invalidation

```typescript
async function invalidateWidgetCache(
  tenantId: string,
  entityKey: string
): Promise<void> {
  const pattern = `widget:${tenantId}:${entityKey}:*`
  await redis.del(await redis.keys(pattern))
}
```

---

## 18. Permissions

### Permission Model

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
  rowFilter?: FilterPredicate[]
}
```

### Role-Based Defaults

| Role | Records | Tasks | Widgets | Dashboards | Actions |
|------|---------|-------|---------|------------|---------|
| Admin | Full | Full | Full | Full | All |
| Manager | Full | Full | Create/Edit | Create/Edit | All |
| Agent | View + Own | Own | View | View | Limited |
| Viewer | View | View | View | View | None |

---

## 19. UI/UX Guidelines

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

### Typography

| Element | Size | Weight |
|---------|------|--------|
| KPI Value | 48px | Bold |
| Widget Title | 16px | Semibold |
| Body | 14px | Regular |
| Caption | 12px | Regular |
| Label | 12px | Medium |

---

## 20. Execution Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core infrastructure and registry system

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Entity Registry | P0 | All entities defined with joins, fields, date modes |
| Segment Registry | P0 | All segments with predicates |
| Metric Registry | P0 | count, sum, avg, preset rates |
| Dimension Registry | P0 | All groupable fields |
| Field Resolver | P0 | Scalar and relation resolvers |
| Query Compiler | P0 | Compiles segment + filters + date range |
| Date Semantics | P0 | All date modes implemented |

**Exit Criteria:**
- [ ] Can compile any widget config to Prisma query
- [ ] Widget value and drilldown use same compiled query
- [ ] All existing datasources migrated to registry

### Phase 2: Widget Engine (Weeks 3-4)

**Goal:** Full widget rendering with drilldowns

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Widget Config Schema | P0 | Canonical model validated |
| KPI Widget | P0 | Renders count with comparison |
| Chart Widgets | P0 | Bar, pie, line, area working |
| Table Widget | P1 | Sortable, paginated |
| Drilldown Modal | P0 | Opens with same query, paginated |
| Bulk Actions | P1 | Assign, tag, task from drilldown |
| Export | P1 | CSV, Excel from drilldown |

**Exit Criteria:**
- [ ] All widget types render correctly
- [ ] Drilldown shows exact matching rows
- [ ] Bulk actions work with selection token

### Phase 3: Builder UX (Weeks 5-6)

**Goal:** Intuitive widget creation experience

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Entity Selector | P0 | Shows all entities with icons |
| Segment Selector | P0 | Quick picks + dropdown |
| Metric Selector | P0 | Shows compatible metrics |
| Dimension Selector | P0 | Shows compatible dimensions |
| Filter Builder | P1 | Add/remove predicates |
| Live Preview | P1 | Updates as config changes |
| Validation | P0 | Prevents invalid configs |

**Exit Criteria:**
- [ ] Can create any widget in < 30 seconds
- [ ] Invalid configs are prevented
- [ ] Preview matches final widget

### Phase 4: Stacks & Actions (Weeks 7-8)

**Goal:** Saved filters and bulk operations

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Stack CRUD | P0 | Create, read, update, delete |
| Stack Apply | P0 | Load into widget |
| Stack Sharing | P1 | Share with team |
| Action Widget | P1 | Bulk assign, tag, task |
| Audit Logging | P0 | All actions logged |

**Exit Criteria:**
- [ ] Stacks persist and apply correctly
- [ ] Bulk actions execute with audit trail
- [ ] Shared stacks visible to team

### Phase 5: Dashboards & Insights (Weeks 9-10)

**Goal:** System dashboards and proactive insights

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Dashboard CRUD | P0 | Create, edit, delete |
| System Templates | P0 | Overview, Pipeline, Team, Tags |
| Auto-Creation | P1 | New tenants get defaults |
| Insight Rules | P1 | Threshold-based alerts |
| Insight Display | P1 | Shows on dashboard |

**Exit Criteria:**
- [ ] System dashboards auto-created
- [ ] Insights trigger on conditions
- [ ] Users can customize dashboards

### Phase 6: Polish & Performance (Weeks 11-12)

**Goal:** Production-ready quality

| Task | Priority | Acceptance Criteria |
|------|----------|---------------------|
| Caching | P0 | Query results cached |
| Error Handling | P0 | All error states handled |
| Permissions | P0 | Role-based access enforced |
| Performance | P0 | < 500ms widget load |
| Mobile | P1 | Responsive on tablet/phone |
| Accessibility | P1 | Keyboard nav, screen reader |

**Exit Criteria:**
- [ ] All widgets load in < 500ms
- [ ] No unhandled errors
- [ ] Permissions enforced at API level

---

## 21. Technical Specifications

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/widget` | POST | Execute widget query |
| `/api/analytics/drilldown` | POST | Get drilldown rows |
| `/api/analytics/export` | POST | Export drilldown data |
| `/api/analytics/stacks` | GET/POST | List/create stacks |
| `/api/analytics/stacks/:id` | GET/PUT/DELETE | Stack CRUD |
| `/api/analytics/dashboards` | GET/POST | List/create dashboards |
| `/api/analytics/dashboards/:id` | GET/PUT/DELETE | Dashboard CRUD |
| `/api/analytics/insights` | GET | Get active insights |
| `/api/analytics/actions` | POST | Execute bulk action |

### Database Schema Additions

```prisma
model AnalyticsStack {
  id            String   @id @default(cuid())
  tenantId      String
  name          String
  description   String?
  entityKey     String
  filters       Json
  segmentKey    String?
  definitionHash String
  version       Int      @default(1)
  usageCount    Int      @default(0)
  lastUsedAt    DateTime?
  isShared      Boolean  @default(false)
  sharedWith    String[] @default([])
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  creator       User     @relation(fields: [createdBy], references: [id])
  
  @@index([tenantId])
  @@index([entityKey])
}

model AnalyticsDashboard {
  id            String   @id @default(cuid())
  tenantId      String
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
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  creator       User     @relation(fields: [createdBy], references: [id])
  
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
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  user          User     @relation(fields: [userId], references: [id])
  
  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

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
│       │   └── dateSemantics.ts
│       ├── cache/
│       │   └── widgetCache.ts
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
        │   ├── KPIWidget.tsx
        │   ├── BarChartWidget.tsx
        │   ├── PieChartWidget.tsx
        │   ├── LineChartWidget.tsx
        │   ├── AreaChartWidget.tsx
        │   └── TableWidget.tsx
        ├── builder/
        │   ├── WidgetBuilder.tsx
        │   ├── EntitySelector.tsx
        │   ├── SegmentSelector.tsx
        │   ├── MetricSelector.tsx
        │   ├── DimensionSelector.tsx
        │   └── FilterBuilder.tsx
        ├── drilldown/
        │   ├── DrilldownModal.tsx
        │   ├── DrilldownTable.tsx
        │   └── BulkActions.tsx
        ├── stacks/
        │   ├── StackList.tsx
        │   └── StackEditor.tsx
        └── dashboard/
            ├── Dashboard.tsx
            ├── DashboardEditor.tsx
            └── InsightsPanel.tsx
```

---

## 22. Migration Mapping + Audit

### Legacy Datasource Key Mapping

| Legacy Key | New Entity | New Segment | Notes |
|------------|------------|-------------|-------|
| `records` | records | (none) | Direct mapping |
| `hot_records` | records | hot | Segment predicate |
| `warm_records` | records | warm | Segment predicate |
| `cold_records` | records | cold | Segment predicate |
| `tasks` | tasks | (none) | Direct mapping |
| `pending_tasks` | tasks | pending | Segment predicate |
| `completed_tasks` | tasks | completed | Segment predicate |
| `tags` | tags | (none) | Direct mapping |
| `motivations` | motivations | (none) | Direct mapping |
| `phones` | phones | (none) | Direct mapping |
| `emails` | emails | (none) | Direct mapping |

### Migration Checklist

- [ ] All legacy datasource keys mapped to entity + segment
- [ ] All existing widgets migrated to new config schema
- [ ] All existing filters migrated to predicate format
- [ ] All existing metrics mapped to registry keys
- [ ] All existing groupBy mapped to dimension keys
- [ ] Backward compatibility layer for old API calls
- [ ] Data validation for migrated configs
- [ ] Rollback plan if migration fails

### Backward Compatibility

```typescript
// Translate legacy config to new format
function migrateLegacyConfig(legacy: LegacyWidgetConfig): WidgetConfig {
  const [entityKey, segmentKey] = mapLegacyDatasource(legacy.dataSource)
  
  return {
    entityKey,
    segmentKey,
    metric: mapLegacyMetric(legacy.metric),
    dimension: mapLegacyGroupBy(legacy.groupBy),
    filters: mapLegacyFilters(legacy.filters),
    dateRange: legacy.dateRange,
    visualization: legacy.type,
    // ... rest of config
  }
}
```

---

## 23. Success Metrics

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

## Appendix A: Type Definitions Summary

```typescript
// Core Types
type EntityKey = 'records' | 'tasks' | 'tags' | 'motivations' | 'phones' | 'emails' | 'automations' | 'team' | 'activity'
type SegmentKey = string
type MetricKey = string
type DimensionKey = string
type DateModeKey = 'entity_created' | 'record_created' | 'junction_created' | 'activity_created'
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all_time'
type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null' | 'exists' | 'not_exists'
type VisualizationType = 'kpi' | 'bar' | 'pie' | 'line' | 'area' | 'table' | 'action'

// Canonical Widget Config
interface WidgetConfig {
  id: string
  entityKey: EntityKey
  segmentKey?: SegmentKey
  filters: FilterPredicate[]
  metric: MetricConfig
  dimension?: DimensionKey
  dateRange: DateRangePreset | CustomDateRange
  dateMode?: DateModeKey
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sort?: SortConfig
  limit?: number
  visualization: VisualizationType
  appearance: AppearanceConfig
  drilldown: DrilldownConfig
}
```

---

## Appendix B: Quick Reference

### Entity → Available Segments

| Entity | Segments |
|--------|----------|
| records | all, hot, warm, cold, assigned, unassigned, withPhone, withEmail, withTag, callReady |
| tasks | all, pending, completed, overdue, dueToday, dueThisWeek |
| tags | all, used, unused |
| motivations | all, used, unused |
| phones | all, mobile, landline, verified |
| emails | all, verified, unverified |

### Entity → Available Metrics

| Entity | Metrics |
|--------|---------|
| records | count, tagCoverage, phoneCoverage, emailCoverage, avgPhones, hotRate |
| tasks | count, completionRate, avgDuration |
| tags | count, usageCount, avgPerRecord |
| motivations | count, usageCount |
| phones | count, verificationRate |
| emails | count, verificationRate |

### Entity → Available Dimensions

| Entity | Dimensions |
|--------|------------|
| records | status, temperature, assignedTo, tag, motivation, day, week, month |
| tasks | status, priority, assignedTo, day, week, month |
| tags | (none - tags are the dimension) |
| motivations | (none - motivations are the dimension) |
| phones | phoneType, day, week, month |
| emails | day, week, month |

---

*End of DockInsight 2.2 Implementation Plan*
