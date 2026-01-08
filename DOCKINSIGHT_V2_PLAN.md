# DockInsight v2 — Implementation Plan

## Overview

DockInsight v2 is a complete rebuild of the analytics dashboard with **priority scoring**, **action queues**, and **explainable AI recommendations** to help users focus on the leads that matter most.

---

## Current State

### What We Have
- **React 18** + **Next.js 14** (App Router)
- **TailwindCSS** for styling
- **Prisma** + PostgreSQL database
- **Recharts** for charts (already installed)
- **Lucide React** for icons
- **Left sidebar navigation** (existing)

### What We Need to Add
- **shadcn/ui** — Modern component library (Card, Badge, Button, Select, Tabs, Sheet, etc.)
- **Framer Motion** — Animations
- **Scoring Engine** — Priority calculation logic

---

## Architecture

### File Structure
```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Main DockInsight v2 page
│   └── api/
│       └── dockinsight/
│           ├── overview/route.ts       # KPIs, charts, action cards
│           ├── queue/route.ts          # Call queue with scoring
│           ├── tasks/route.ts          # Task queue
│           └── record/[id]/route.ts    # Single record with score
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   └── tabs.tsx
│   └── dockinsight/
│       ├── DockInsightPage.tsx         # Main layout with tabs
│       ├── KPICard.tsx                 # KPI display card
│       ├── PlanCard.tsx                # Today's plan action card
│       ├── QueueCard.tsx               # Call queue table
│       ├── SmallQueueCard.tsx          # Compact queue (skiptrace, stale)
│       ├── RecordDrawer.tsx            # Slide-out record details
│       ├── GlobalFilters.tsx           # Filter bar
│       └── charts/
│           ├── TemperatureChart.tsx
│           ├── RecordsOverTimeChart.tsx
│           ├── TopTagsChart.tsx
│           └── TopMotivationsChart.tsx
└── lib/
    └── scoring.ts                      # Priority scoring engine
```

---

## Phase 1: Setup shadcn/ui

### Install Dependencies
```bash
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-scroll-area @radix-ui/react-separator
npm install framer-motion
```

### Create Utility
```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Add shadcn/ui Components
Create the following components in `src/components/ui/`:
- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `input.tsx`
- `select.tsx`
- `tabs.tsx`
- `dropdown-menu.tsx`
- `sheet.tsx`
- `scroll-area.tsx`
- `separator.tsx`

---

## Phase 2: Scoring Engine

### Priority Score (0-100)

The scoring algorithm evaluates each record and produces:
1. **Score** (0-100) — Overall priority
2. **Next Action** — What to do with this lead
3. **Confidence** — Data quality indicator
4. **Reasons** — Explainable factors

### Scoring Factors

| Factor | Points | Description |
|--------|--------|-------------|
| **Temperature** | +5 to +25 | Hot=25, Warm=15, Cold=5 |
| **Motivations** | +5 to +10 each | Probate/Pre-Foreclosure=10, Divorce/Tax Lien=8, etc. |
| **Overdue Task** | +20 | Has overdue task |
| **Task Due Today** | +10 | Has task due today |
| **Fresh Skiptrace** | +8 | Skiptraced within 2 days |
| **Stale Lead** | +7 to +15 | No activity 7+ days (needs attention) |
| **Never Contacted** | +15 | Never made contact |
| **Recently Contacted** | -25 | Contacted <24h ago (cooldown) |
| **High Call Attempts** | -4 to -24 | Fatigue penalty after 3+ calls |
| **Landline Only** | -4 | Lower quality contact |

### Next Action Classification

| Action | Condition |
|--------|-----------|
| **Call Now** | Score ≥70, has valid phone |
| **Call Soon** | Score 50-69 |
| **Follow Up Today** | Has task due/overdue |
| **Needs Skiptrace** | No phone numbers |
| **Fix Data** | Has phones but all invalid |
| **Nurture** | Score <50 |
| **Closed** | Dead/Under Contract/DNC |

### Confidence Level

Data quality indicator based on completeness:
- Has motivations (+25)
- Has tags (+15)
- Has mobile phone (+25) or landline (+10)
- Has skiptrace date (+15)
- Has activity data (+10)
- Has owner name (+10)

**High** = 75+, **Medium** = 50-74, **Low** = <50

### Implementation

```typescript
// src/lib/scoring.ts

export type NextAction = 
  | 'Call Now' 
  | 'Call Soon' 
  | 'Follow Up Today' 
  | 'Needs Skiptrace' 
  | 'Fix Data' 
  | 'Nurture' 
  | 'Closed'

export type Confidence = 'High' | 'Medium' | 'Low'

export interface PriorityResult {
  score: number
  nextAction: NextAction
  confidence: Confidence
  reasons: Array<{ label: string; delta: number }>
  flags: {
    hasValidPhone: boolean
    hasDnc: boolean
    activePipeline: boolean
  }
}

export function computePriority(record: RecordWithRelations): PriorityResult {
  // Implementation...
}
```

---

## Phase 3: API Routes

### GET /api/dockinsight/overview

Returns dashboard data:
```typescript
{
  kpis: {
    totalRecords: number
    hotLeads: number
    callReady: number
    tasksDue: number
    unassignedHot: number
  },
  charts: {
    temperature: { name: string, value: number }[]
    recordsOverTime: { day: string, value: number }[]
    topTags: { name: string, value: number }[]
    topMotivations: { name: string, value: number }[]
  },
  actionCards: {
    callNow: number
    followUp: number
    fixData: number
    staleHot: number
  }
}
```

### GET /api/dockinsight/queue

Returns prioritized records:
```typescript
{
  callNow: RecordWithScore[]      // Top 50, score ≥70
  callSoon: RecordWithScore[]     // Score 50-69
  needsSkiptrace: RecordWithScore[]
  fixData: RecordWithScore[]
  staleHot: RecordWithScore[]     // Hot + 30+ days inactive
}
```

### GET /api/dockinsight/tasks

Returns task queue:
```typescript
{
  overdue: TaskWithRecord[]
  dueToday: TaskWithRecord[]
  upcoming: TaskWithRecord[]
}
```

### GET /api/dockinsight/record/[id]

Returns single record with full scoring details:
```typescript
{
  record: Record
  priority: PriorityResult
  phones: RecordPhoneNumber[]
  emails: RecordEmail[]
  tags: Tag[]
  motivations: Motivation[]
  recentActivity: RecordActivityLog[]
}
```

---

## Phase 4: UI Components

### Main Layout (DockInsightPage.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│ [Search] [Date Range ▼] [Temp ▼] [Status ▼] [Assignee ▼]   │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Call Queue] [Tasks] [Pipeline] [Activity] [Team]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ KPI │ │ KPI │ │ KPI │ │ KPI │ │ KPI │  ← KPI Cards      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │ Today's Plan                            │               │
│  │ [Call Now: 25] [Follow Up: 12] [Fix: 8] │  ← Plan Cards │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────┐              │
│  │ Call Now Queue          │  │ Temp Chart  │              │
│  │ ┌─────────────────────┐ │  ├─────────────┤              │
│  │ │ 85 │ 123 Main St    │ │  │ Over Time   │              │
│  │ │ 78 │ 456 Oak Ave    │ │  ├─────────────┤              │
│  │ │ 72 │ 789 Pine Rd    │ │  │ Top Tags    │  ← Charts    │
│  │ └─────────────────────┘ │  ├─────────────┤              │
│  └─────────────────────────┘  │ Motivations │              │
│                               └─────────────┘              │
│  ┌───────────────┐ ┌───────────────┐                       │
│  │ Needs Skip    │ │ Stale Hot     │  ← Small Queues       │
│  └───────────────┘ └───────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Record Drawer (Sheet)

Slides in from right when clicking a record:
- Property address, owner name
- Priority score (large number)
- Next action badge
- Confidence badge
- Scoring reasons (explainable)
- Phone numbers with call buttons
- Tags & motivations
- Quick actions: Create Task, Change Status, Assign
- Recent activity preview

---

## Phase 5: Database Changes (Optional)

### Add Score to Record Model

If we want to sort/filter by score in the database:

```prisma
model Record {
  // ... existing fields
  
  // DockInsight v2: Priority scoring
  priorityScore     Int?      // 0-100
  nextAction        String?   // Call Now, Call Soon, etc.
  confidence        String?   // High, Medium, Low
  scoreUpdatedAt    DateTime?
}
```

**Alternative**: Compute score on-the-fly (simpler, always fresh, but slower for large datasets)

**Recommendation**: Start with on-the-fly, add database storage later if performance is an issue.

---

## Implementation Order

### Week 1: Foundation
1. ✅ Remove old DockInsight code
2. [ ] Install shadcn/ui dependencies
3. [ ] Create utility functions (`cn`, etc.)
4. [ ] Add shadcn/ui components
5. [ ] Create scoring engine (`src/lib/scoring.ts`)

### Week 2: Backend
6. [ ] Create `/api/dockinsight/overview` route
7. [ ] Create `/api/dockinsight/queue` route
8. [ ] Create `/api/dockinsight/tasks` route
9. [ ] Create `/api/dockinsight/record/[id]` route

### Week 3: Frontend
10. [ ] Create DockInsightPage layout with tabs
11. [ ] Build KPI cards
12. [ ] Build Today's Plan cards
13. [ ] Build Call Queue table
14. [ ] Build charts (reuse Recharts)
15. [ ] Build Record Drawer

### Week 4: Polish
16. [ ] Add animations (Framer Motion)
17. [ ] Mobile responsiveness
18. [ ] Performance optimization
19. [ ] Testing & bug fixes

---

## Data Flow

```
User opens /dashboard
        │
        ▼
┌───────────────────┐
│ Fetch /api/       │
│ dockinsight/      │
│ overview          │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Server fetches    │
│ records from DB   │
│ with relations    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ computePriority() │
│ for each record   │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Aggregate into    │
│ KPIs, charts,     │
│ action cards      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Return JSON       │
│ to frontend       │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Render UI with    │
│ shadcn/ui         │
│ components        │
└───────────────────┘
```

---

## Motivation Weights

Used in scoring algorithm:

| Motivation | Weight |
|------------|--------|
| Probate | +10 |
| Pre-Foreclosure | +10 |
| Divorce | +8 |
| Tax Lien | +8 |
| Tired Landlord | +6 |
| Vacant | +6 |
| Absentee | +5 |
| Inherited | +5 |
| Code Violation | +5 |
| MLS Expired | +4 |
| High Equity | +4 |

---

## Questions to Decide

1. **Compute score server-side or client-side?**
   - Server: Faster queries, can sort by score
   - Client: Simpler, always fresh
   - **Recommendation**: Server-side for queue, client can re-compute for drawer

2. **Store score in database?**
   - Yes: Can sort/filter by score, faster queries
   - No: Always fresh, no schema changes
   - **Recommendation**: Start without, add later if needed

3. **How often to recalculate?**
   - On every page load (simplest)
   - On record change (via webhook/trigger)
   - Scheduled job (every hour)
   - **Recommendation**: On page load initially

---

## Success Metrics

After v2 launch, track:
- Time to first call (should decrease)
- Calls per day (should increase)
- Contact rate (should increase)
- User engagement with dashboard (time on page)

---

## Next Steps

1. **Approve this plan**
2. **Install shadcn/ui**
3. **Build scoring engine**
4. **Create API routes**
5. **Build UI components**
6. **Test & deploy**

---

*Last updated: January 8, 2026*
