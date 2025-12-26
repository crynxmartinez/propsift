# DockInsight 2.0 - Implementation Plan

> **Databox-grade analytics + PropSift operations console**

---

## Table of Contents

1. [North Star Vision](#north-star-vision)
2. [Current State Analysis](#current-state-analysis)
3. [Core Model & Architecture](#core-model--architecture)
4. [Registry System](#registry-system)
5. [Builder UX Flow](#builder-ux-flow)
6. [KPI Mode vs Builder Mode](#kpi-mode-vs-builder-mode)
7. [Global Filters](#global-filters)
8. [Killer Metrics Pack](#killer-metrics-pack)
9. [Drilldowns](#drilldowns)
10. [Stacks System](#stacks-system)
11. [Action Widgets](#action-widgets)
12. [System Dashboards](#system-dashboards)
13. [Insights Layer](#insights-layer)
14. [UI/UX Guidelines](#uiux-guidelines)
15. [Execution Phases](#execution-phases)
16. [Technical Specifications](#technical-specifications)

---

## North Star Vision

DockInsight should feel like:

| Principle | Description |
|-----------|-------------|
| **Instant Answers** | KPI Mode, smart defaults, daily dashboards |
| **Truth Behind Numbers** | Drilldowns to actual records/tasks |
| **Do the Work** | Action Widgets + Stacks for operations |
| **Scales Without Confusion** | Registry-driven Entity/Segment/Metric/Dimension system |

---

## Current State Analysis

### What We Already Have ✅

| Feature | Status | Implementation |
|---------|--------|----------------|
| 12 Widget Types | ✅ Complete | number, bar, pie, line, area, gauge, progress, leaderboard, funnel, table, donut, horizontal_bar |
| 60+ Data Sources | ✅ Complete | Hardcoded in switch statements (needs registry refactor) |
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
| Entity/Segment Model | **Critical** | A |
| Rate Metric (fast path) | **High** | B |
| Drilldowns | **High** | B |
| KPI Mode vs Builder Mode | **High** | B |
| Global Filter Bar | **High** | C |
| Stacks | **Medium** | C |
| Action Widgets | **Medium** | D |
| System Dashboards | **Medium** | D |
| Insights Strip | **Low** | E |

---

## Core Model & Architecture

### Canonical Widget Model

Every dock must compile to this structure:

```
Entity + Segment(optional) + Filters + Metric(s) + Dimension(optional) + Time + Sort/Limit
```

### Terminology Mapping

| UI Term | Logic Term | Database Term |
|---------|------------|---------------|
| Data Sets | Segments | Predefined filter presets |
| - | Entities | Database tables |
| Group By | Dimensions | Grouping fields |

### Hard Rule

> **1 Segment = 1 Entity**
> 
> A segment can only filter one entity type. This keeps everything predictable.

---

## Registry System

### Overview

Four registries drive both UI and validation:

1. **Entity Registry** - What tables exist and what they support
2. **Segment Registry** - Predefined filter presets per entity
3. **Metric Registry** - Available calculations
4. **Dimension Registry** - Available groupings

---

### A) Entity Registry

```typescript
// File: src/lib/analytics/registries/entities.ts

interface EntityDefinition {
  key: string                    // 'records' | 'tasks' | 'activity' | etc.
  label: string                  // 'Records'
  labelPlural: string            // 'Records'
  table: string                  // Prisma model name
  defaultTimeField: string       // 'createdAt'
  ownerField: string             // 'createdById'
  
  // Capabilities
  metrics: MetricKey[]           // ['count', 'sum', 'avg', 'rate']
  dimensions: DimensionKey[]     // ['status', 'temperature', 'tag', ...]
  sumFields?: string[]           // Fields that can be summed
  avgFields?: string[]           // Fields that can be averaged
  
  // Drilldown
  drilldownRoute: string         // '/dashboard/records'
  drilldownQueryParam: string    // 'filter'
  quickActions: string[]         // ['assign', 'createTask', 'export']
  
  // Joins (for inherited dimensions)
  joins?: EntityJoin[]
}

interface EntityJoin {
  entity: string                 // 'records'
  foreignKey: string             // 'recordId'
  inheritDimensions: string[]    // ['temperature', 'state', 'city']
}
```

#### Entity Definitions

| Entity Key | Label | Table | Time Field | Metrics | Drilldown |
|------------|-------|-------|------------|---------|-----------|
| `records` | Records | Record | createdAt | count, sum, avg, rate | /dashboard/records |
| `tasks` | Tasks | Task | createdAt | count, rate | /dashboard/tasks |
| `tags` | Tags | Tag | createdAt | count | /dashboard/tags |
| `motivations` | Motivations | Motivation | createdAt | count | /dashboard/motivations |
| `statuses` | Statuses | Status | createdAt | count | /dashboard/statuses |
| `phones` | Phone Numbers | RecordPhoneNumber | createdAt | count | /dashboard/records |
| `emails` | Emails | RecordEmail | createdAt | count | /dashboard/records |
| `boards` | Boards | Board | createdAt | count | /dashboard/board |
| `automations` | Automations | Automation | createdAt | count | /dashboard/automations |
| `team` | Team Members | User | createdAt | count | /dashboard/settings |
| `activity` | Activity Logs | ActivityLog | createdAt | count | /dashboard/activity |
| `custom_fields` | Custom Fields | CustomField | createdAt | count | - |

---

### B) Segment Registry

```typescript
// File: src/lib/analytics/registries/segments.ts

interface SegmentDefinition {
  key: string                    // 'hot'
  entityKey: string              // 'records'
  label: string                  // 'Hot Records'
  description: string            // 'Records with temperature = hot'
  predicate: FilterPredicate[]   // Filter conditions
  category: SegmentCategory      // 'quality' | 'execution' | 'pipeline' | 'coverage'
  icon?: string                  // Lucide icon name
  color?: string                 // Hex color
}

type SegmentCategory = 'quality' | 'execution' | 'pipeline' | 'coverage'

interface FilterPredicate {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in'
  value: unknown
}
```

#### Segment Definitions

##### Records Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `hot` | Hot Records | `temperature = 'hot'` | pipeline |
| `warm` | Warm Records | `temperature = 'warm'` | pipeline |
| `cold` | Cold Records | `temperature = 'cold'` | pipeline |
| `new_7_days` | New Records (7 Days) | `createdAt >= NOW - 7 days` | pipeline |
| `assigned` | Assigned Records | `assignedToId IS NOT NULL` | execution |
| `unassigned` | Unassigned Records | `assignedToId IS NULL` | execution |
| `has_tags` | Records with Tags | `recordTags.count > 0` | quality |
| `no_tags` | Records without Tags | `recordTags.count = 0` | quality |
| `has_motivations` | Records with Motivations | `recordMotivations.count > 0` | quality |
| `no_motivations` | Records without Motivations | `recordMotivations.count = 0` | quality |
| `has_phones` | Records with Phones | `phones.count > 0` | coverage |
| `no_phones` | Records without Phones | `phones.count = 0` | coverage |
| `multiple_phones` | Records with Multiple Phones | `phones.count > 1` | coverage |
| `has_emails` | Records with Emails | `emails.count > 0` | coverage |
| `no_emails` | Records without Emails | `emails.count = 0` | coverage |
| `on_boards` | Records on Boards | `boardPositions.count > 0` | pipeline |
| `not_on_boards` | Records not on Boards | `boardPositions.count = 0` | pipeline |
| `call_ready` | Call Ready | See below | execution |

##### Call Ready Segment (Special)

```typescript
const CALL_READY_SEGMENT: SegmentDefinition = {
  key: 'call_ready',
  entityKey: 'records',
  label: 'Call Ready',
  description: 'Has phone, not DNC, not contacted recently',
  predicate: [
    { field: 'phones.count', operator: 'gt', value: 0 },
    { field: 'phones.statuses', operator: 'not_contains', value: 'DNC' },
    { field: 'lastContactedAt', operator: 'lt', value: 'NOW - 14 days' }
  ],
  category: 'execution',
  icon: 'Phone',
  color: '#10B981'
}
```

##### Tasks Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `pending` | Pending Tasks | `status = 'PENDING'` | execution |
| `in_progress` | In Progress Tasks | `status = 'IN_PROGRESS'` | execution |
| `completed` | Completed Tasks | `status = 'COMPLETED'` | execution |
| `overdue` | Overdue Tasks | `dueDate < NOW AND status != 'COMPLETED'` | execution |
| `due_today` | Due Today | `dueDate = TODAY` | execution |
| `due_this_week` | Due This Week | `dueDate BETWEEN NOW AND NOW + 7 days` | execution |
| `unassigned` | Unassigned Tasks | `assignedToId IS NULL` | execution |
| `recurring` | Recurring Tasks | `recurrence IS NOT NULL` | pipeline |

##### Tags Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `most_used` | Most Used Tags | `recordTags.count > 0 ORDER BY count DESC` | quality |
| `least_used` | Least Used Tags | `recordTags.count > 0 ORDER BY count ASC` | quality |
| `unused` | Unused Tags | `recordTags.count = 0` | quality |

##### Motivations Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `most_used` | Most Used Motivations | `recordMotivations.count > 0 ORDER BY count DESC` | quality |
| `least_used` | Least Used Motivations | `recordMotivations.count > 0 ORDER BY count ASC` | quality |
| `unused` | Unused Motivations | `recordMotivations.count = 0` | quality |

##### Phones Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `mobile` | Mobile Numbers | `type = 'mobile'` | coverage |
| `landline` | Landline Numbers | `type = 'landline'` | coverage |
| `dnc` | DNC Numbers | `statuses CONTAINS 'DNC'` | coverage |

##### Automations Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `active` | Active Automations | `isActive = true` | execution |
| `inactive` | Inactive Automations | `isActive = false` | execution |

##### Team Segments

| Key | Label | Predicate | Category |
|-----|-------|-----------|----------|
| `active` | Active Members | `status = 'active'` | execution |

---

### C) Metric Registry

```typescript
// File: src/lib/analytics/registries/metrics.ts

interface MetricDefinition {
  key: string                    // 'count' | 'sum' | 'avg' | 'rate'
  label: string                  // 'Count'
  type: 'aggregate' | 'rate' | 'formula'
  
  // For sum/avg
  requiresField?: boolean
  allowedFieldTypes?: ('number' | 'currency')[]
  
  // For rate metrics
  rateConfig?: {
    numeratorEntity: string
    numeratorSegment?: string
    denominatorEntity: string
    denominatorSegment?: string
  }
  
  // Display
  format?: 'number' | 'percentage' | 'currency'
  suffix?: string
}
```

#### Base Metrics

| Key | Label | Type | Requires Field | Format |
|-----|-------|------|----------------|--------|
| `count` | Count | aggregate | No | number |
| `sum` | Sum | aggregate | Yes (number) | number |
| `avg` | Average | aggregate | Yes (number) | number |

#### Preset Rate Metrics

| Key | Label | Numerator | Denominator | Format |
|-----|-------|-----------|-------------|--------|
| `tag_coverage` | Tag Coverage % | records + has_tags | records | percentage |
| `motivation_coverage` | Motivation Coverage % | records + has_motivations | records | percentage |
| `phone_coverage` | Phone Coverage % | records + has_phones | records | percentage |
| `email_coverage` | Email Coverage % | records + has_emails | records | percentage |
| `assignment_coverage` | Assignment Coverage % | records + assigned | records | percentage |
| `task_completion_rate` | Task Completion Rate % | tasks + completed | tasks | percentage |
| `call_ready_rate` | Call Ready % | records + call_ready | records | percentage |

---

### D) Dimension Registry

```typescript
// File: src/lib/analytics/registries/dimensions.ts

interface DimensionDefinition {
  key: string                    // 'status' | 'temperature' | 'tag'
  label: string                  // 'Status'
  type: 'enum' | 'date' | 'string' | 'number' | 'relation'
  field: string                  // Database field path
  
  // Which entities support this
  entities: string[]
  
  // For relation dimensions (tags, motivations)
  relationConfig?: {
    through?: string             // Junction table
    targetTable: string          // Related table
    labelField: string           // Field to use as label
    colorField?: string          // Optional color field
  }
  
  // For date dimensions
  dateBuckets?: ('day' | 'week' | 'month' | 'quarter' | 'year')[]
}
```

#### Dimension Definitions

| Key | Label | Type | Entities | Field |
|-----|-------|------|----------|-------|
| `status` | Status | relation | records, tasks | statusId / status |
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

## Builder UX Flow

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Choose Entity                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ Records │ │  Tasks  │ │  Tags   │ │  More ▼ │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│  Step 2: Choose Data Set (optional)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ All Records                                        ▼ │   │
│  └──────────────────────────────────────────────────────┘   │
│  Quick picks: [Hot] [Warm] [Cold] [Call Ready] [Assigned]   │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Choose Metric                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Count                                              ▼ │   │
│  └──────────────────────────────────────────────────────┘   │
│  Quick picks: [Count] [Tag Coverage %] [Phone Coverage %]   │
├─────────────────────────────────────────────────────────────┤
│  Step 4: Group By (optional, for charts)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ None                                               ▼ │   │
│  └──────────────────────────────────────────────────────┘   │
│  Options: Status, Temperature, Tag, Assignee, Day/Week/Month│
├─────────────────────────────────────────────────────────────┤
│  Step 5: Filters (Advanced ▼)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ + Add Filter                                          │   │
│  │ Include tags: [Tag 1] [Tag 2]                         │   │
│  │ Exclude motivations: [Motivation 1]                   │   │
│  │ ☑ Call Ready only                                     │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Step 6: Visualization                                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ KPI │ │ Bar │ │ Pie │ │Line │ │Table│ │More▼│           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────────────────────────────┤
│  Step 7: Drilldown (auto-enabled)                            │
│  ☑ Click to view matching records                            │
│  Quick actions: [Assign] [Create Tasks] [Export]             │
└─────────────────────────────────────────────────────────────┘
```

### Builder UX Rules

1. **Only show valid options** based on entity + metric + dimension compatibility
2. **Default selections pre-fill** so users can finish in 10 seconds
3. **Advanced sections are collapsible** (filters, formula, multi-metric)
4. **Preview updates live** as options change
5. **Validation prevents broken configs** before save

---

## KPI Mode vs Builder Mode

### KPI Mode (Default View)

```
┌─────────────────────────────────────────┐
│                                         │
│              1,247                      │  ← Large, clean number
│           Hot Records                   │
│                                         │
│     ▲ 12% vs last week                  │  ← Comparison chip
│                                         │
│  [View List]  [Assign All]              │  ← Action buttons
│                                         │
└─────────────────────────────────────────┘
```

**Characteristics:**
- No edit controls visible
- Large, clean numbers
- Clear comparison indicators
- Prominent action buttons
- Click anywhere to drilldown

### Builder Mode (Toggle)

```
┌─────────────────────────────────────────┐
│  ⚙️ Edit  📋 Duplicate  💾 Save Stack   │  ← Edit controls
│                                         │
│              1,247                      │
│           Hot Records                   │
│                                         │
│     ▲ 12% vs last week                  │
│                                         │
│  [View List]  [Assign All]              │
│                                         │
└─────────────────────────────────────────┘
```

**Characteristics:**
- Full config panel access
- Multi-metric controls
- Layout/appearance options
- Save as Stack option

### Toggle Location

```
┌─────────────────────────────────────────────────────────────┐
│  📊 My Dashboard                    [KPI Mode ○ Builder ●]  │
│─────────────────────────────────────────────────────────────│
```

---

## Global Filters

### Global Filter Bar Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 Last 30 Days ▼  │  📍 All Markets ▼  │  👤 All Assignees ▼  │       │
│  🌡️ All Temps ▼     │  🏷️ Tags ▼         │  💡 Motivations ▼    │       │
│  📞 Call Ready ☐    │  📋 Board ▼        │                [Clear All]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Filter Definitions

| Filter | Type | Options | Applies To |
|--------|------|---------|------------|
| Date Range | Preset + Custom | Today, This Week, Last 30 Days, Custom | All entities |
| Market | Multi-select | States, Cities | records (+ joined entities) |
| Assignee | Multi-select | Team members | records, tasks |
| Temperature | Multi-select | Hot, Warm, Cold | records only |
| Tags | Include/Exclude | All tags | records only |
| Motivations | Include/Exclude | All motivations | records only |
| Call Ready | Toggle | On/Off | records only |
| Board | Select | All boards + columns | records only |

### Filter Applicability Matrix

```typescript
const FILTER_APPLICABILITY: Record<string, string[]> = {
  dateRange: ['records', 'tasks', 'activity', 'automations', 'phones', 'emails'],
  market: ['records'],
  assignee: ['records', 'tasks'],
  temperature: ['records'],
  tags: ['records'],
  motivations: ['records'],
  callReady: ['records'],
  board: ['records'],
}
```

### Non-Applicable Filter Behavior

When a global filter doesn't apply to a widget's entity:

```
┌─────────────────────────────────────────┐
│              47                         │
│         Active Automations              │
│                                         │
│  ⓘ Temperature filter not applicable   │  ← Subtle indicator
│                                         │
└─────────────────────────────────────────┘
```

---

## Killer Metrics Pack

### Coverage Metrics (Quality Control)

| Metric | Formula | One-Click Add |
|--------|---------|---------------|
| Tag Coverage % | records_with_tags / records × 100 | ✅ |
| Motivation Coverage % | records_with_motivations / records × 100 | ✅ |
| Phone Coverage % | records_with_phones / records × 100 | ✅ |
| Email Coverage % | records_with_emails / records × 100 | ✅ |
| Assignment Coverage % | records_assigned / records × 100 | ✅ |

### Speed & Execution Metrics

| Metric | Formula | One-Click Add |
|--------|---------|---------------|
| Records Added per Day | records (today) | ✅ |
| Records Exported per Day | activity_exports (today) | ✅ |
| Tasks Completed per Assignee | tasks_completed GROUP BY assignee | ✅ |
| Avg Time to First Touch | AVG(first_activity - import_date) | ✅ |
| Avg Time in Status | AVG(status_change - status_set) | ✅ |

### Pipeline Metrics

| Metric | Formula | One-Click Add |
|--------|---------|---------------|
| Hot Records | records WHERE temperature = 'hot' | ✅ |
| Call Ready Records | records WHERE call_ready = true | ✅ |
| Overdue Tasks | tasks WHERE overdue = true | ✅ |
| Tasks Due Today | tasks WHERE due_date = today | ✅ |

---

## Drilldowns

### Drilldown Behavior

| Widget Type | Click Target | Opens |
|-------------|--------------|-------|
| KPI Number | Anywhere | Record/Task list with filters |
| Bar Chart | Bar segment | List filtered by dimension value |
| Pie Chart | Slice | List filtered by dimension value |
| Line Chart | Data point | List filtered by date |
| Table | Row | Single record/task detail |

### Drilldown UX

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                              │
│  ┌─────────────────────┐                                                │
│  │      1,247          │ ← Click                                        │
│  │   Hot Records       │                                                │
│  └─────────────────────┘                                                │
│                              ┌──────────────────────────────────────────┤
│                              │  Hot Records (1,247)           [✕ Close]│
│                              │──────────────────────────────────────────│
│                              │  ☐ Select All   [Assign] [Tasks] [Export]│
│                              │──────────────────────────────────────────│
│                              │  ☐ John Smith - 123 Main St              │
│                              │  ☐ Jane Doe - 456 Oak Ave                │
│                              │  ☐ Bob Wilson - 789 Pine Rd              │
│                              │  ... (1,244 more)                        │
│                              └──────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────────────┘
```

### Drilldown Quick Actions

| Action | Description | Entities |
|--------|-------------|----------|
| Assign | Bulk assign to team member | records, tasks |
| Create Tasks | Create task for each record | records |
| Add Tag | Bulk add tag | records |
| Export | Export to CSV | records |
| Complete | Mark as complete | tasks |
| Reschedule | Change due date | tasks |

---

## Stacks System

### What is a Stack?

A **Stack** is a saved filter configuration that can be reused across:
- Widget builder (as a preset)
- Global filter bar (as quick filter)
- Action Widgets (as data source)

### Stack Schema

```typescript
interface Stack {
  id: string
  name: string
  description?: string
  icon?: string                  // Lucide icon name
  color?: string                 // Hex color
  
  // Configuration
  entityKey: string              // 'records'
  segmentKey?: string            // 'hot'
  filters: FilterPredicate[]     // Additional filters
  
  // Sharing
  visibility: 'private' | 'team' | 'organization'
  createdById: string
  
  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

### Stack Examples

| Name | Entity | Segment | Filters | Use Case |
|------|--------|---------|---------|----------|
| Vacant Hot | records | hot | structureType = 'vacant' | Wholesaler focus list |
| Call Now | records | call_ready | temperature IN ['hot', 'warm'] | Daily calling list |
| My Overdue | tasks | overdue | assignedToId = currentUser | Personal task list |
| Untagged Hot | records | hot | tags.count = 0 | Data cleanup |

### Stack UI Locations

1. **Builder Step 2**: "Use Stack instead of Data Set"
2. **Global Filter Bar**: Quick preset buttons
3. **Action Widgets**: Data source selection
4. **Stack Manager**: `/dashboard/stacks` - CRUD interface

---

## Action Widgets

### What is an Action Widget?

An **Action Widget** is a special dock type that combines:
- A count/summary from a Stack
- Quick action buttons
- Command-tile visual style

### Action Widget Schema

```typescript
interface ActionWidgetConfig {
  type: 'action'
  
  // Data source (one of these)
  stackId?: string               // Reference saved stack
  // OR inline:
  entityKey?: string
  segmentKey?: string
  filters?: FilterPredicate[]
  
  // Display
  title: string
  subtitle?: string              // Auto-generated or custom
  icon?: string
  color?: string
  
  // Actions
  actions: ActionType[]
}

type ActionType = 'openList' | 'assign' | 'createTasks' | 'export' | 'complete'
```

### Action Widget Visual

```
┌─────────────────────────────────────────┐
│  📞 Call Now: Vacant Hot                │  ← Title
│  Hot + has phone + not DNC + 14d        │  ← Auto-generated subtitle
│                                         │
│              128                        │  ← Big number
│            records                      │
│                                         │
│  [Open List] [Assign] [Create Tasks]    │  ← Action buttons
└─────────────────────────────────────────┘
```

### Action Widget vs Regular KPI

| Aspect | Regular KPI | Action Widget |
|--------|-------------|---------------|
| Purpose | Display metric | Drive action |
| Visual | Clean number | Command tile |
| Actions | View list only | Multiple actions |
| Data source | Entity + config | Stack reference |
| Subtitle | Optional | Auto-generated from filters |

---

## System Dashboards

### Overview

System Dashboards are:
- **Locked** (not editable)
- **Not deletable**
- **Duplicatable** ("Duplicate & Customize")
- **Auto-created** for new users

### Dashboard 1: Data Health

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Data Health                                              [System]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   12,456    │ │    78%      │ │    65%      │ │    82%      │       │
│  │Total Records│ │Tag Coverage │ │Motiv. Cover.│ │Phone Cover. │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌─────────────────────────┐ ┌─────────────────────────────────────┐   │
│  │   Records by Temp       │ │   New Records (Last 30 Days)        │   │
│  │   🔴 Hot: 2,345         │ │   📈 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~   │   │
│  │   🟡 Warm: 4,567        │ │                                     │   │
│  │   🔵 Cold: 5,544        │ │                                     │   │
│  └─────────────────────────┘ └─────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────┐ ┌─────────────────────────────────────┐   │
│  │   Top 10 Tags           │ │   Top 10 Motivations                │   │
│  │   ████████████ Vacant   │ │   ████████████ Probate              │   │
│  │   ██████████ Absentee   │ │   ██████████ Divorce                │   │
│  │   ████████ Pre-Forecl.  │ │   ████████ Tax Lien                 │   │
│  └─────────────────────────┘ └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dashboard 2: Execution

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎯 Execution                                                [System]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐ ┌─────────────────────────────┐   │
│  │  📞 Call Ready                  │ │  ⚠️ Overdue Tasks           │   │
│  │  Hot + phone + not DNC          │ │  Past due, not completed    │   │
│  │           847                   │ │           23                │   │
│  │  [Open] [Assign] [Tasks]        │ │  [Open] [Reschedule]        │   │
│  └─────────────────────────────────┘ └─────────────────────────────┘   │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │     12      │ │     45      │ │     89      │ │    156      │       │
│  │ Due Today   │ │ Due Week    │ │ Completed   │ │ Unassigned  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Tasks Completed This Week (by Assignee)                       │   │
│  │   John  ████████████████████████████ 45                         │   │
│  │   Jane  ██████████████████████ 34                               │   │
│  │   Bob   ████████████████ 28                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Assigned vs Unassigned Records                                │   │
│  │   🟢 Assigned: 8,234 (66%)  🔴 Unassigned: 4,222 (34%)          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dashboard 3: Stack Performance (Future)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📚 Stack Performance                                        [System]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Top Stacks by Count                                           │   │
│  │   1. 🏆 Vacant Hot .......................... 2,345 records     │   │
│  │   2. 🥈 Call Now ............................. 847 records      │   │
│  │   3. 🥉 Absentee Warm ........................ 567 records      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Stack Coverage Comparison                                     │   │
│  │   Stack          │ Records │ Phone % │ Tag % │ Assigned %       │   │
│  │   ───────────────┼─────────┼─────────┼───────┼──────────────    │   │
│  │   Vacant Hot     │  2,345  │   92%   │  87%  │    78%           │   │
│  │   Call Now       │    847  │  100%   │  65%  │    45%           │   │
│  │   Absentee Warm  │    567  │   78%   │  90%  │    89%           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Insights Layer

### Rule-Based Insights

Start with simple rule-based insights (no AI required):

| Rule | Trigger | Message |
|------|---------|---------|
| Hot without tasks | hot_records WHERE tasks.count = 0 | "⚠️ {count} Hot records have no tasks" |
| Call ready drop | call_ready < call_ready_last_week | "📉 Call-ready dropped {pct}% vs last week" |
| Untouched records | records WHERE last_activity > 72h | "⏱ {count} records untouched for 72h" |
| Overdue spike | overdue_tasks > overdue_tasks_yesterday * 1.2 | "🚨 Overdue tasks up 20% from yesterday" |
| Coverage drop | phone_coverage < 80% | "📞 Phone coverage below 80%" |

### Insights Strip UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💡 Insights                                                   [Hide]  │
│  ⚠️ 37 Hot records have no tasks  [View]                               │
│  📉 Call-ready dropped 12% vs last week  [View]                        │
│  ⏱ 19 records untouched for 72h  [View]                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Insight Click Behavior

Clicking an insight opens the drilldown with the matching filter applied.

---

## UI/UX Guidelines

### Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header + Navigation                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Global Filter Bar (sticky)                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Insights Strip (small, dismissible)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Dashboard Grid (react-grid-layout)                                     │
│                                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │  Dock   │ │  Dock   │ │  Dock   │ │  Dock   │                       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                       │
│                                                                         │
│  ┌───────────────────────┐ ┌───────────────────────┐                   │
│  │        Dock           │ │        Dock           │                   │
│  └───────────────────────┘ └───────────────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Widget Chrome

Every dock should have:

```
┌─────────────────────────────────────────┐
│  Title                           ⋮ Menu │  ← 3-dot menu
│  Subtitle (optional)                    │
├─────────────────────────────────────────┤
│                                         │
│           Widget Content                │
│                                         │
├─────────────────────────────────────────┤
│  [View List]              ▲ 12% vs prev │  ← Footer (optional)
└─────────────────────────────────────────┘
```

### 3-Dot Menu Options

| Option | Description |
|--------|-------------|
| Edit | Open config panel |
| Duplicate | Create copy |
| Save as Stack | Save config as reusable Stack |
| Remove | Delete from dashboard |

### Loading States

```
┌─────────────────────────────────────────┐
│  Title                                  │
│                                         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Skeleton
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                         │
└─────────────────────────────────────────┘
```

### Error States

```
┌─────────────────────────────────────────┐
│  Title                                  │
│                                         │
│  ⚠️ Failed to load data                 │
│                                         │
│  [Retry]                                │
│                                         │
└─────────────────────────────────────────┘
```

### Empty States

| Scenario | Message | Action |
|----------|---------|--------|
| No dashboards | "Start with System Dashboard" | [Create Dashboard] |
| No data | "Import records to unlock insights" | [Import Records] |
| Filters return zero | "No matches. Clear filters." | [Clear Filters] |

### Mobile Behavior

| Feature | Mobile Behavior |
|---------|-----------------|
| Layout | Single column, KPI Mode only |
| Editing | Disabled (view-only) |
| Drilldowns | Full screen list |
| Global filters | Collapsed, expandable |

---

## Execution Phases

### Phase A: Foundation (2-3 weeks)

**Goal:** Registry system + backward compatibility

#### Tasks

1. **Create registry files**
   - `src/lib/analytics/registries/entities.ts`
   - `src/lib/analytics/registries/segments.ts`
   - `src/lib/analytics/registries/metrics.ts`
   - `src/lib/analytics/registries/dimensions.ts`
   - `src/lib/analytics/registries/index.ts`

2. **Create migration adapter**
   - `src/lib/analytics/migration.ts`
   - Map old `dataSource` → `entity + segment`
   - Keep old config format working

3. **Refactor API**
   - Update `src/app/api/analytics-data/route.ts`
   - Use registries instead of switch statements
   - Add validation layer

4. **Add compatibility validator**
   - Prevent invalid entity+metric+dimension combos
   - Return helpful error messages

#### Acceptance Criteria

- [ ] All existing dashboards render unchanged
- [ ] New registry-based API works alongside old format
- [ ] Invalid configs return clear error messages
- [ ] Unit tests for registry lookups

---

### Phase B: Builder UX + Rate + Drilldowns (2 weeks)

**Goal:** User-facing improvements

#### Tasks

1. **New Builder UI**
   - Replace "Data Source" with Entity + Segment pickers
   - Step-by-step wizard flow
   - Collapsible "Advanced" sections

2. **Rate metric (fast path)**
   - Add preset rates as one-click options
   - Keep formula builder as "Advanced"

3. **KPI Mode / Builder Mode toggle**
   - Add toggle to dashboard header
   - Hide edit controls in KPI Mode

4. **Drilldown implementation**
   - Click KPI → open drawer with filtered list
   - Click chart segment → same with dimension filter
   - Quick actions in drilldown

#### Acceptance Criteria

- [ ] Create a KPI dock in under 30 seconds
- [ ] Drill into exact record/task list from any widget
- [ ] Rate metrics work with one click
- [ ] KPI Mode hides all edit controls

---

### Phase C: Global Filters + Stacks (2 weeks)

**Goal:** Dashboard-wide control

#### Tasks

1. **Global Filter Bar**
   - Date range (required)
   - Market, Assignee, Temperature
   - Tags/Motivations include/exclude
   - Call-Ready toggle
   - Board/column

2. **Filter applicability**
   - Show "Not applicable" indicator
   - Don't silently ignore filters

3. **Stacks CRUD**
   - Create stack from widget config
   - Stack picker in builder
   - Stack Manager page (`/dashboard/stacks`)

4. **Database schema**
   - Add `Stack` model to Prisma

#### Acceptance Criteria

- [ ] Change one filter, all applicable docks update
- [ ] Non-applicable filters show indicator
- [ ] Stacks can be created, edited, deleted
- [ ] Stacks appear in builder as presets

---

### Phase D: Action Widgets + System Dashboards (1-2 weeks)

**Goal:** Operations console feel

#### Tasks

1. **Action Widget type**
   - New widget type: `action`
   - References Stack or inline config
   - Command-tile visual style
   - Action buttons row

2. **System Dashboards**
   - Data Health dashboard
   - Execution dashboard
   - Mark as `isSystem: true`
   - Prevent edit/delete

3. **"Add from Library" panel**
   - Prebuilt KPI cards
   - One-click add to dashboard

#### Acceptance Criteria

- [ ] Action Widgets display count + action buttons
- [ ] System Dashboards auto-created for new users
- [ ] System Dashboards can be duplicated
- [ ] Library panel shows prebuilt options

---

### Phase E: Insights + Polish (1 week)

**Goal:** Proactive intelligence + polish

#### Tasks

1. **Rule-based insights engine**
   - Define insight rules
   - Calculate on dashboard load
   - Cache results

2. **Insights strip UI**
   - Above dashboard grid
   - Dismissible
   - Click to drilldown

3. **Polish**
   - Loading skeletons
   - Error states with retry
   - Empty states with actions
   - Mobile view-only mode

4. **Future: Alerts**
   - Daily digest email
   - Alert rules ("ping me if X > Y")

#### Acceptance Criteria

- [ ] Insights show relevant warnings
- [ ] Click insight opens drilldown
- [ ] All loading/error/empty states implemented
- [ ] Mobile renders correctly

---

## Technical Specifications

### New Database Models

```prisma
// Add to schema.prisma

model Stack {
  id          String   @id @default(cuid())
  name        String
  description String?
  icon        String?
  color       String?
  
  entityKey   String
  segmentKey  String?
  filters     Json     // FilterPredicate[]
  
  visibility  String   @default("private") // private | team | organization
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([createdById])
}

// Update Dashboard model
model Dashboard {
  id          String   @id @default(cuid())
  name        String
  description String?
  isSystem    Boolean  @default(false)  // NEW: System dashboard flag
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  widgets     Widget[]
  
  createdBy   User     @relation(fields: [createdById], references: [id])
}
```

### New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stacks` | GET | List user's stacks |
| `/api/stacks` | POST | Create stack |
| `/api/stacks/[id]` | GET | Get stack |
| `/api/stacks/[id]` | PUT | Update stack |
| `/api/stacks/[id]` | DELETE | Delete stack |
| `/api/analytics-data/drilldown` | POST | Get drilldown list |
| `/api/insights` | GET | Get dashboard insights |

### File Structure

```
src/
├── lib/
│   └── analytics/
│       ├── registries/
│       │   ├── entities.ts
│       │   ├── segments.ts
│       │   ├── metrics.ts
│       │   ├── dimensions.ts
│       │   └── index.ts
│       ├── migration.ts
│       ├── validator.ts
│       └── insights.ts
├── components/
│   └── analytics/
│       ├── GlobalFilterBar.tsx
│       ├── InsightsStrip.tsx
│       ├── ActionWidget.tsx
│       ├── DrilldownDrawer.tsx
│       ├── StackPicker.tsx
│       ├── EntityPicker.tsx
│       ├── SegmentPicker.tsx
│       └── MetricPicker.tsx
└── app/
    └── dashboard/
        └── stacks/
            └── page.tsx
```

---

## Migration Mapping

### Old dataSource → New entity + segment

```typescript
const DATA_SOURCE_MIGRATION: Record<string, { entity: string; segment?: string }> = {
  // Records
  'records': { entity: 'records' },
  'records_hot': { entity: 'records', segment: 'hot' },
  'records_warm': { entity: 'records', segment: 'warm' },
  'records_cold': { entity: 'records', segment: 'cold' },
  'records_new': { entity: 'records', segment: 'new_7_days' },
  'records_assigned': { entity: 'records', segment: 'assigned' },
  'records_unassigned': { entity: 'records', segment: 'unassigned' },
  'records_with_tags': { entity: 'records', segment: 'has_tags' },
  'records_without_tags': { entity: 'records', segment: 'no_tags' },
  'records_multiple_tags': { entity: 'records', segment: 'multiple_tags' },
  'records_with_motivations': { entity: 'records', segment: 'has_motivations' },
  'records_without_motivations': { entity: 'records', segment: 'no_motivations' },
  'records_with_phones': { entity: 'records', segment: 'has_phones' },
  'records_without_phones': { entity: 'records', segment: 'no_phones' },
  'records_multiple_phones': { entity: 'records', segment: 'multiple_phones' },
  'records_with_emails': { entity: 'records', segment: 'has_emails' },
  'records_without_emails': { entity: 'records', segment: 'no_emails' },
  'records_multiple_emails': { entity: 'records', segment: 'multiple_emails' },
  'records_on_boards': { entity: 'records', segment: 'on_boards' },
  'records_not_on_boards': { entity: 'records', segment: 'not_on_boards' },
  
  // Tasks
  'tasks': { entity: 'tasks' },
  'tasks_pending': { entity: 'tasks', segment: 'pending' },
  'tasks_in_progress': { entity: 'tasks', segment: 'in_progress' },
  'tasks_completed': { entity: 'tasks', segment: 'completed' },
  'tasks_overdue': { entity: 'tasks', segment: 'overdue' },
  'tasks_due_today': { entity: 'tasks', segment: 'due_today' },
  'tasks_due_this_week': { entity: 'tasks', segment: 'due_this_week' },
  'tasks_unassigned': { entity: 'tasks', segment: 'unassigned' },
  'tasks_recurring': { entity: 'tasks', segment: 'recurring' },
  
  // Tags
  'tags': { entity: 'tags' },
  'tags_most_used': { entity: 'tags', segment: 'most_used' },
  'tags_least_used': { entity: 'tags', segment: 'least_used' },
  'tags_unused': { entity: 'tags', segment: 'unused' },
  
  // Motivations
  'motivations': { entity: 'motivations' },
  'motivations_most_used': { entity: 'motivations', segment: 'most_used' },
  'motivations_least_used': { entity: 'motivations', segment: 'least_used' },
  'motivations_unused': { entity: 'motivations', segment: 'unused' },
  
  // Statuses
  'statuses': { entity: 'statuses' },
  'statuses_most_used': { entity: 'statuses', segment: 'most_used' },
  
  // Phones
  'phones': { entity: 'phones' },
  'phones_mobile': { entity: 'phones', segment: 'mobile' },
  'phones_landline': { entity: 'phones', segment: 'landline' },
  'phones_dnc': { entity: 'phones', segment: 'dnc' },
  
  // Emails
  'emails': { entity: 'emails' },
  'emails_valid': { entity: 'emails', segment: 'valid' },
  'emails_invalid': { entity: 'emails', segment: 'invalid' },
  
  // Boards
  'boards': { entity: 'boards' },
  'board_columns': { entity: 'boards', segment: 'columns' },
  
  // Automations
  'automations': { entity: 'automations' },
  'automations_active': { entity: 'automations', segment: 'active' },
  'automations_inactive': { entity: 'automations', segment: 'inactive' },
  
  // Team
  'team': { entity: 'team' },
  'team_active': { entity: 'team', segment: 'active' },
  
  // Activity
  'activity': { entity: 'activity' },
  'activity_imports': { entity: 'activity', segment: 'imports' },
  'activity_exports': { entity: 'activity', segment: 'exports' },
  
  // Custom Fields
  'custom_fields': { entity: 'custom_fields' },
  'custom_field_values': { entity: 'custom_fields', segment: 'values' },
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to create KPI | < 30 seconds | User testing |
| Drilldown usage | > 50% of clicks | Analytics |
| Action Widget adoption | > 3 per user | Database query |
| Global filter usage | > 80% of sessions | Analytics |
| Stack creation | > 5 per power user | Database query |

---

## Appendix: Component Props

### GlobalFilterBar

```typescript
interface GlobalFilterBarProps {
  filters: GlobalFilters
  onChange: (filters: GlobalFilters) => void
  applicability: Record<string, string[]>
}

interface GlobalFilters {
  dateRange: { start: Date; end: Date } | string
  market?: { states?: string[]; cities?: string[] }
  assignees?: string[]
  temperature?: ('hot' | 'warm' | 'cold')[]
  tags?: { include?: string[]; exclude?: string[] }
  motivations?: { include?: string[]; exclude?: string[] }
  callReady?: boolean
  board?: { boardId?: string; columnId?: string }
}
```

### DrilldownDrawer

```typescript
interface DrilldownDrawerProps {
  isOpen: boolean
  onClose: () => void
  entity: string
  segment?: string
  filters: FilterPredicate[]
  dimension?: { key: string; value: string }
  title: string
  quickActions: ActionType[]
}
```

### ActionWidget

```typescript
interface ActionWidgetProps {
  config: ActionWidgetConfig
  globalFilters: GlobalFilters
  onAction: (action: ActionType, records: string[]) => void
}
```

---

*Document Version: 2.0*
*Last Updated: December 26, 2025*
*Author: PropSift Development Team*
