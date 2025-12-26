# DockInsight 2.2.2 — Implementation Phases

> **Detailed execution roadmap for the production-hardened DockInsight analytics system**
>
> This document breaks down the DOCKINSIGHT_2.2.2_PLAN.md into actionable phases with specific tasks, files to create/modify, and acceptance criteria.

---

## Phase Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **1** | Foundation | Week 1-2 | Schema, registries, compiler core |
| **2** | Caching & Invalidation | Week 3 | Redis caching, version bumping, dependency tracking |
| **3** | Widget API & Execution | Week 4 | API routes, query execution, drilldown |
| **4** | UI Components | Week 5-6 | Dashboard builder, widget rendering |
| **5** | Counter System | Week 7 | Service-layer transactions, reconciliation jobs |
| **6** | Polish & Hardening | Week 8 | Error handling, rate limiting, monitoring |

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Prisma Schema Updates

**Goal:** Add junction entities and denormalized counters

**Files to modify:**
- `prisma/schema.prisma`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 1.1.1 | Add `RecordTag` junction entity | `id`, `workspaceId`, `recordId`, `tagId`, `createdAt` with proper indexes |
| 1.1.2 | Add `RecordMotivation` junction entity | Same structure as RecordTag |
| 1.1.3 | Add denormalized counters to `Record` | `phoneCount`, `emailCount`, `tagCount`, `motivationCount` with `@default(0)` |
| 1.1.4 | Add indexes for analytics queries | `@@index([workspaceId, createdAt])` on all entities |
| 1.1.5 | Run migration | `npx prisma migrate dev --name add_analytics_schema` |
| 1.1.6 | Backfill counters | Run reconciliation script for existing data |

**Acceptance Criteria:**
- [ ] `RecordTag` and `RecordMotivation` exist with `workspaceId`
- [ ] All counters default to 0
- [ ] Existing records have correct counter values

---

### 1.2 Registry System

**Goal:** Create the four registries that drive UI + validation

**Files to create:**
- `src/lib/analytics/registry/entities.ts`
- `src/lib/analytics/registry/segments.ts`
- `src/lib/analytics/registry/metrics.ts`
- `src/lib/analytics/registry/dimensions.ts`
- `src/lib/analytics/registry/index.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 1.2.1 | Create `TenantScopeDef` type | `mode: 'direct' \| 'via_join'`, `joinEntity`, `joinRelation`, `joinField` |
| 1.2.2 | Create `EntityDefinition` interface | `key`, `delegate`, `tenantScope`, `searchFields`, etc. |
| 1.2.3 | Create `SearchFieldDef` type | `scalar` and `relation_some` kinds |
| 1.2.4 | Define all entities | `records`, `tasks`, `phones`, `emails`, `activity`, `record_tags`, `record_motivations`, `tags`, `motivations` |
| 1.2.5 | Create `SegmentDefinition` interface | `key`, `entityKey`, `predicate`, `category` |
| 1.2.6 | Create `FilterOperator` type | All operators including `between` |
| 1.2.7 | Define operator value contracts | `between` requires `[min, max]` array |
| 1.2.8 | Create `DimensionDefinition` interface | `groupByMode`, `junctionEntity` for many-to-many |
| 1.2.9 | Define all dimensions | `status`, `temperature`, `tag`, `motivation`, etc. with correct `groupByMode` |
| 1.2.10 | Create `MetricDefinition` interface | `type: 'count' \| 'sum' \| 'avg' \| 'rate'` |
| 1.2.11 | Export registry accessor functions | `getEntity()`, `getSegment()`, `getDimension()`, `getMetric()` |

**Acceptance Criteria:**
- [ ] All entities defined with correct `tenantScope` (direct vs via_join)
- [ ] `tag` and `motivation` dimensions have `groupByMode: 'junction_required'`
- [ ] `between` operator has value contract documented
- [ ] Registry exports `REGISTRY_VERSION = '2.2.2'`

---

### 1.3 Query Compiler Core

**Goal:** Build the query compiler with all v2.2.2 contracts

**Files to create:**
- `src/lib/analytics/compiler/types.ts`
- `src/lib/analytics/compiler/compileQuery.ts`
- `src/lib/analytics/compiler/tenantScope.ts`
- `src/lib/analytics/compiler/permissionScope.ts`
- `src/lib/analytics/compiler/permissionHash.ts`
- `src/lib/analytics/compiler/queryHash.ts`
- `src/lib/analytics/compiler/dateSemantics.ts`
- `src/lib/analytics/compiler/globalFilters.ts`
- `src/lib/analytics/compiler/index.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 1.3.1 | Create `WidgetQueryInput` interface | All query inputs including optional `dateRange` override |
| 1.3.2 | Create `CompileCtx` interface | `tenantId`, `userId`, `role`, `timezone`, `permissions`, `permissionHash`, `scopeKey` |
| 1.3.3 | Create `CompiledQuery` interface | `entityKey`, `delegate`, `where`, `orderBy`, `deps`, `hash` |
| 1.3.4 | Implement `compileTenantScope()` | Direct and via_join modes |
| 1.3.5 | Implement `compilePermissionWhere()` | Apply permission rowFilters |
| 1.3.6 | Implement `computePermissionHash()` | Sort entity keys + rowFilters by `field:operator:value` |
| 1.3.7 | Implement `stableStringify()` | Sort object keys, do NOT auto-sort arrays |
| 1.3.8 | Implement `normalizeGlobalFilters()` | Include ALL keys, sort set-like arrays, handle `market.states/cities` |
| 1.3.9 | Implement `sortFilters()` | Sort by `field:operator:stableStringify(value)` |
| 1.3.10 | Implement `computeQueryHash()` | Use effective dateRange, resolved ISO timestamps, normalized filters |
| 1.3.11 | Implement `computeQueryDeps()` | Check presence not truthiness, include records for via-record filters |
| 1.3.12 | Implement `compileGlobalFilters()` | With `excludeDateRange: true` option |
| 1.3.13 | Implement `compileDateRange()` | Resolve presets to ISO timestamps using timezone |
| 1.3.14 | Implement `validateDimensionGroupBy()` | Error if junction_required but wrong entity |
| 1.3.15 | Implement main `compileQuery()` | Combine all pieces, return `CompiledQuery` |

**Acceptance Criteria:**
- [ ] `computeQueryHash(input, ctx)` signature locked (ctx required)
- [ ] Canonical dateRange rule: widget overrides global, only one applied
- [ ] `normalizeGlobalFilters()` includes ALL keys (no dropped filters)
- [ ] `computeQueryDeps()` detects `callReady: false` correctly
- [ ] `market.states/cities` arrays are sorted

---

### 1.4 Date Semantics

**Goal:** Timezone-aware date resolution

**Files to create:**
- `src/lib/analytics/compiler/dateSemantics.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 1.4.1 | Implement `resolveDateRange()` | Convert presets to `{ start: Date, end: Date }` using timezone |
| 1.4.2 | Support all presets | `today`, `yesterday`, `this_week`, `last_7_days`, `last_30_days`, `this_month`, `last_month`, `this_quarter`, `this_year`, `all_time` |
| 1.4.3 | Implement `getEffectiveDateRange()` | `input.dateRange ?? input.globalFilters.dateRange` |

**Acceptance Criteria:**
- [ ] Presets resolve to correct ISO timestamps
- [ ] Timezone is respected (no midnight bugs)
- [ ] Hash only includes resolved timestamps, not preset strings

---

## Phase 2: Caching & Invalidation (Week 3)

### 2.1 Cache Infrastructure

**Goal:** Redis-based caching with dependency-version keys

**Files to create:**
- `src/lib/analytics/cache/widgetCache.ts`
- `src/lib/analytics/cache/versionBump.ts`
- `src/lib/analytics/cache/invalidationMap.ts`
- `src/lib/analytics/cache/labelCache.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 2.1.1 | Implement `buildCacheKey()` | Include `REGISTRY_VERSION`, `tenantId`, `depHash`, `permissionHash`, `queryHash` |
| 2.1.2 | Implement dependency version fetching | `redis.mget()` for all dep versions |
| 2.1.3 | Define `INVALIDATION_MAP` | Mutation type → entities to invalidate |
| 2.1.4 | Implement `invalidateOnMutation()` | Two-tier: widget cacheVersion vs labelVersion |
| 2.1.5 | Implement label cache | Separate `labelVersion` keys for tags/motivations |
| 2.1.6 | Implement `getLabels()` | Batch label lookup with versioned caching |

**Acceptance Criteria:**
- [ ] Cache key includes ALL dependency versions
- [ ] `tag.update` bumps `labelVersion` only, not `cacheVersion`
- [ ] `tag.create/delete` bumps BOTH `cacheVersion` AND `labelVersion`
- [ ] `REGISTRY_VERSION` in cache key

---

### 2.2 Cache Flow

**Goal:** Implement the full cache read/write flow

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 2.2.1 | Implement `fetchWidgetData()` | Compile → build cache key → check cache → execute → store |
| 2.2.2 | Set appropriate TTLs | Widget cache: 5 min, Label cache: 1 hour |
| 2.2.3 | Handle cache misses | Execute query and store result |

**Acceptance Criteria:**
- [ ] Cache hit rate measurable
- [ ] No stale data after entity mutations

---

## Phase 3: Widget API & Execution (Week 4)

### 3.1 Widget API Route

**Goal:** Create the widget data API

**Files to create:**
- `src/app/api/analytics/widget/route.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 3.1.1 | Implement POST handler | Accept `WidgetQueryInput`, return widget data |
| 3.1.2 | Build `CompileCtx` from session | Extract `tenantId`, `userId`, `role`, `timezone`, `permissions` |
| 3.1.3 | Compute `permissionHash` | Pre-compute for caching |
| 3.1.4 | Call `fetchWidgetData()` | Use cache flow |
| 3.1.5 | Return structured response | `{ data, meta: { cached, hash } }` |

**Acceptance Criteria:**
- [ ] Authentication required
- [ ] Permission scoping enforced
- [ ] Response includes cache metadata

---

### 3.2 Drilldown API Route

**Goal:** Create the drilldown API with safe search

**Files to create:**
- `src/app/api/analytics/drilldown/route.ts`
- `src/lib/analytics/compiler/searchCompiler.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 3.2.1 | Implement POST handler | Accept `DrilldownRequest`, return paginated rows |
| 3.2.2 | Implement `compileDrilldownSearch()` | Use `searchFields` from entity registry |
| 3.2.3 | Implement `sanitizeSearchInput()` | Trim, limit length, remove control chars (NO SQL wildcard escaping) |
| 3.2.4 | Implement rate limiting | `assertRateLimit()` with Redis |
| 3.2.5 | Enforce max pageSize | `Math.min(request.pageSize, 100)` |
| 3.2.6 | Clamp page number | `Math.max(1, request.page)` |
| 3.2.7 | Recompile query server-side | Never trust client `CompiledQuery` |

**Acceptance Criteria:**
- [ ] Search is entity-scoped (uses registry `searchFields`)
- [ ] Rate limit: 10 requests/second/user
- [ ] Max pageSize: 100
- [ ] Page clamped to >= 1

---

### 3.3 Labels API Route

**Goal:** Create the label lookup API

**Files to create:**
- `src/app/api/analytics/labels/route.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 3.3.1 | Implement GET handler | Accept `entity` and `ids` params |
| 3.3.2 | Use label cache | Versioned with `labelVersion` |
| 3.3.3 | Return label data | `{ [id]: { name, color } }` |

**Acceptance Criteria:**
- [ ] Labels cached separately from widget data
- [ ] 1 hour TTL

---

## Phase 4: UI Components (Weeks 5-6)

### 4.1 Dashboard Builder

**Goal:** Create the dashboard management UI

**Files to create/modify:**
- `src/components/analytics/DashboardBuilder.tsx`
- `src/components/analytics/WidgetConfigPanel.tsx`
- `src/components/analytics/DashboardGrid.tsx`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 4.1.1 | Dashboard CRUD | Create, read, update, delete dashboards |
| 4.1.2 | Widget CRUD | Add, configure, remove widgets |
| 4.1.3 | Global filters UI | Date range, tags, motivations, assignees, etc. |
| 4.1.4 | Widget config panel | Entity, segment, metric, dimension, filters |
| 4.1.5 | Grid layout | Drag-and-drop widget positioning |

**Acceptance Criteria:**
- [ ] Dashboard persists to database
- [ ] Widgets configurable via panel
- [ ] Global filters apply to all widgets

---

### 4.2 Widget Rendering

**Goal:** Create widget visualization components

**Files to create:**
- `src/components/analytics/widgets/KPIWidget.tsx`
- `src/components/analytics/widgets/BarChartWidget.tsx`
- `src/components/analytics/widgets/PieChartWidget.tsx`
- `src/components/analytics/widgets/LineChartWidget.tsx`
- `src/components/analytics/widgets/TableWidget.tsx`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 4.2.1 | KPI widget | Single value with comparison |
| 4.2.2 | Bar chart | Horizontal/vertical bars |
| 4.2.3 | Pie chart | With legend |
| 4.2.4 | Line chart | Time series |
| 4.2.5 | Table widget | Paginated rows |
| 4.2.6 | Drilldown modal | Click widget → see rows |
| 4.2.7 | Label resolution | Fetch labels separately, display names |

**Acceptance Criteria:**
- [ ] All visualization types working
- [ ] Drilldown opens from any widget
- [ ] Labels display correctly (not just IDs)

---

## Phase 5: Counter System (Week 7)

### 5.1 Counter Service

**Goal:** Service-layer transactions for counter updates

**Files to create:**
- `src/lib/services/counterService.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 5.1.1 | Create `COUNTER_CONFIGS` | Map model → counterField + recordIdField |
| 5.1.2 | Implement `createWithCounter()` | `$transaction` with counter increment |
| 5.1.3 | Implement `deleteWithCounter()` | `$transaction` with counter decrement |
| 5.1.4 | Implement `bulkDeleteWithCounter()` | Handle bulk operations |

**Acceptance Criteria:**
- [ ] Counters update atomically with entity create/delete
- [ ] NO middleware (service-layer only)
- [ ] Bulk operations handled

---

### 5.2 Reconciliation Jobs

**Goal:** Safety net for counter drift

**Files to create:**
- `src/jobs/reconcileCounters.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 5.2.1 | Implement `reconcileCounters()` | Recount all relations for a workspace |
| 5.2.2 | Implement `nightlyCounterReconciliation()` | Run for workspaces modified in last 24h |
| 5.2.3 | Create admin API | `POST /api/admin/rebuild-counters` |
| 5.2.4 | Set up cron job | Nightly execution |

**Acceptance Criteria:**
- [ ] Counters can be rebuilt on demand
- [ ] Nightly job runs automatically
- [ ] Admin can trigger manual rebuild

---

## Phase 6: Polish & Hardening (Week 8)

### 6.1 Error Handling

**Goal:** Comprehensive error handling

**Files to create:**
- `src/lib/analytics/errors.ts`

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 6.1.1 | Define error codes | `QUERY_COMPILE_ERROR`, `PERMISSION_DENIED`, `RATE_LIMITED`, etc. |
| 6.1.2 | Create error classes | `QueryCompileError`, `RateLimitError`, etc. |
| 6.1.3 | Implement error responses | Consistent JSON structure |
| 6.1.4 | Add client error handling | Display user-friendly messages |

**Acceptance Criteria:**
- [ ] All errors have codes and messages
- [ ] Client displays appropriate UI for each error type

---

### 6.2 Rate Limiting

**Goal:** Protect against abuse

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 6.2.1 | Implement `assertRateLimit()` | Redis-based sliding window |
| 6.2.2 | Apply to drilldown search | 10 req/sec/user |
| 6.2.3 | Return 429 on limit exceeded | With retry-after header |

**Acceptance Criteria:**
- [ ] Rate limit enforced
- [ ] 429 response with retry info

---

### 6.3 Monitoring & Logging

**Goal:** Observability for production

**Tasks:**

| # | Task | Details |
|---|------|---------|
| 6.3.1 | Log cache hit/miss rates | Track effectiveness |
| 6.3.2 | Log query execution times | Identify slow queries |
| 6.3.3 | Log error rates | Track issues |
| 6.3.4 | Add health check endpoint | `/api/analytics/health` |

**Acceptance Criteria:**
- [ ] Key metrics logged
- [ ] Health check returns status

---

## File Structure Summary

```
src/
├── lib/
│   ├── analytics/
│   │   ├── registry/
│   │   │   ├── entities.ts
│   │   │   ├── segments.ts
│   │   │   ├── metrics.ts
│   │   │   ├── dimensions.ts
│   │   │   └── index.ts
│   │   ├── compiler/
│   │   │   ├── types.ts
│   │   │   ├── compileQuery.ts
│   │   │   ├── tenantScope.ts
│   │   │   ├── permissionScope.ts
│   │   │   ├── permissionHash.ts
│   │   │   ├── queryHash.ts
│   │   │   ├── dateSemantics.ts
│   │   │   ├── globalFilters.ts
│   │   │   ├── searchCompiler.ts
│   │   │   └── index.ts
│   │   ├── cache/
│   │   │   ├── widgetCache.ts
│   │   │   ├── versionBump.ts
│   │   │   ├── invalidationMap.ts
│   │   │   ├── labelCache.ts
│   │   │   └── index.ts
│   │   └── errors.ts
│   └── services/
│       └── counterService.ts
├── app/
│   └── api/
│       └── analytics/
│           ├── widget/route.ts
│           ├── drilldown/route.ts
│           ├── labels/route.ts
│           └── health/route.ts
├── jobs/
│   └── reconcileCounters.ts
└── components/
    └── analytics/
        ├── DashboardBuilder.tsx
        ├── WidgetConfigPanel.tsx
        ├── DashboardGrid.tsx
        └── widgets/
            ├── KPIWidget.tsx
            ├── BarChartWidget.tsx
            ├── PieChartWidget.tsx
            ├── LineChartWidget.tsx
            └── TableWidget.tsx
```

---

## Phase 1 Acceptance Checklist (Complete)

Before moving to Phase 2, ALL of these must be checked:

- [ ] Tenant scope works for direct + via_join entities
- [ ] Permission rowFilter is enforced on all queries
- [ ] Junction entities exist (`RecordTag`, `RecordMotivation`) with `workspaceId`
- [ ] Denormalized counters on `Record` model
- [ ] `REGISTRY_VERSION = '2.2.2'` in registry
- [ ] All entities defined with correct `tenantScope`
- [ ] `tag`/`motivation` dimensions have `groupByMode: 'junction_required'`
- [ ] `computeQueryHash(input, ctx)` signature locked
- [ ] Canonical dateRange rule implemented
- [ ] `normalizeGlobalFilters()` includes ALL keys
- [ ] `computeQueryDeps()` checks presence not truthiness
- [ ] `market.states/cities` arrays sorted
- [ ] `stableStringify()` does NOT auto-sort arrays
- [ ] Permission hash sorts by `field:operator:value`

---

## Quick Reference: Non-Negotiables

These contracts are **frozen** and must not change:

| Contract | Why |
|----------|-----|
| Tenant scope = `workspaceId` | Security foundation |
| Permission hash in cache key | Prevents cross-user data leaks |
| Junction entity for many-to-many groupBy | Prisma limitation |
| Dependency-version caching | Prevents stale cross-entity data |
| Service-layer transactions for counters | Middleware not transaction-safe |
| Server recompiles drilldown | Client cannot submit CompiledQuery |
| `computeQueryHash(input, ctx)` signature | Timezone resolution requires ctx |
| Resolved ISO timestamps in hash | No preset strings, no midnight bugs |

---

*End of DockInsight 2.2.2 Implementation Phases*
