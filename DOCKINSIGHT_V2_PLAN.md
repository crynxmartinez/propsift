# DockInsight v2 — Implementation Plan

## Vision

**DockInsight is your Command Center.** It's not just analytics — it's the place where you look and instantly know **what to do next**.

When a wholesaler opens DockInsight, they should:
1. **See their next action immediately** — No thinking required
2. **Understand why** — Explainable recommendations
3. **Take action without leaving** — Call, task, update status
4. **Trust the system** — Data-driven prioritization

> "Open DockInsight. See who to call. Make the call. Close deals."

---

## Core Philosophy

### Action-First, Not Data-First

❌ **Old approach:** "Here's your data, figure out what to do"
✅ **DockInsight approach:** "Here's what you should do, here's why"

### The 5-Second Rule

A user should know their next action within 5 seconds of opening DockInsight:
- **Big, clear "Next Up" card** with the #1 priority lead
- **One-click actions** — Call, Skip, Snooze
- **Queue that auto-advances** — Finish one, next appears

### Explainable Intelligence

Every recommendation shows **why**:
- "🔥 Hot lead + Probate + No contact in 7 days = Call Now"
- "⏰ Task overdue: Follow up on 123 Main St"
- "📞 Fresh skiptrace yesterday — best time to reach"

---

## Current State

### What We Have
- **React 18** + **Next.js 14** (App Router)
- **TailwindCSS** + **shadcn/ui** (already installed)
- **Prisma** + PostgreSQL database
- **Recharts** for charts (already installed)
- **Lucide React** for icons
- **Left sidebar navigation** (existing)

### What We Need to Build
- **Scoring Engine** — Priority calculation logic
- **Action Queue System** — Smart lead ordering
- **Quick Action Panel** — Take action without leaving
- **Contact Tracking** — Last contact, engagement history

---

## Architecture

### File Structure
```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx                    # Main DockInsight page
│   └── api/
│       └── dockinsight/
│           ├── overview/route.ts       # KPIs and summary
│           ├── next-up/route.ts        # Single next action
│           ├── queue/route.ts          # Full action queue
│           ├── tasks/route.ts          # Task queue
│           └── record/[id]/route.ts    # Record details + score
├── components/
│   └── dockinsight/
│       ├── NextUpCard.tsx              # THE primary action card
│       ├── ActionQueue.tsx             # Scrollable queue
│       ├── QuickActions.tsx            # Call, Skip, Snooze, Task
│       ├── ScoreExplainer.tsx          # Why this score?
│       ├── TodaysPlan.tsx              # Action buckets
│       ├── KPIRow.tsx                  # Key metrics
│       ├── RecordDrawer.tsx            # Slide-out details
│       └── charts/
│           ├── TemperatureChart.tsx
│           ├── ActivityChart.tsx
│           └── ConversionFunnel.tsx
└── lib/
    └── scoring.ts                      # Priority scoring engine
```

---

## The Action System

### 5 Action Buckets

Every workable lead falls into exactly ONE bucket:

| Bucket | Icon | Description | Trigger |
|--------|------|-------------|---------|
| **🔥 Call Now** | Phone | High priority, ready to dial | Score ≥70 + has valid phone |
| **📋 Follow Up** | ClipboardCheck | Has task due today/overdue | Task due ≤ today |
| **📞 Get Numbers** | Search | Needs phone data | No valid phone numbers |
| **⏳ Nurture** | Clock | Keep warm, not urgent | Score <50, workable |
| **🚫 Not Workable** | Ban | Can't/shouldn't contact | DNC, Dead, Under Contract |

### Queue Priority Order

Within each bucket, leads are sorted by:
1. **Score** (highest first)
2. **Last Contact** (longest ago first)
3. **Temperature** (Hot > Warm > Cold)
4. **Task urgency** (Overdue > Due Today > Due Soon)

---

## Scoring Algorithm v2

### Priority Score (0-100)

The score answers: **"How urgently should I contact this lead?"**

### Base Score by Temperature

| Temperature | Base Score | Rationale |
|-------------|------------|-----------|
| 🔥 Hot | 40 | Already interested |
| 🌡️ Warm | 25 | Showing signs |
| ❄️ Cold | 10 | Needs warming up |

### Motivation Bonuses (Capped at +30)

| Urgency | Motivations | Bonus |
|---------|-------------|-------|
| **🔴 Urgent** | Pre-Foreclosure, Tax Lien, Probate | +12 each |
| **🟠 High** | Divorce, Tired Landlord, Code Violation | +8 each |
| **🟡 Medium** | Vacant, Absentee, Inherited | +5 each |
| **🟢 Low** | High Equity, MLS Expired | +3 each |

### Task Urgency Bonuses

| Condition | Bonus | Rationale |
|-----------|-------|-----------|
| Task overdue | +25 | Urgent action needed |
| Task due today | +15 | Time-sensitive |
| Task due tomorrow | +5 | Plan ahead |

### Contact Recency Modifiers

| Last Contact | Modifier | Rationale |
|--------------|----------|-----------|
| Never contacted | +20 | Fresh opportunity |
| 7+ days ago | +15 | Time for follow-up |
| 3-7 days ago | +5 | Reasonable gap |
| 1-3 days ago | -10 | Recent, give space |
| <24 hours ago | -30 | Cooldown period |

### Engagement Bonuses

| Condition | Bonus | Rationale |
|-----------|-------|-----------|
| Has engaged before (answered, responded) | +15 | Warm relationship |
| Fresh skiptrace (<3 days) | +10 | Best time to reach |
| Has mobile phone | +5 | Better contact rate |

### Fatigue Penalties

| Call Attempts | Penalty | Rationale |
|---------------|---------|-----------|
| 3-4 attempts | -5 | Getting harder |
| 5-6 attempts | -10 | Diminishing returns |
| 7-9 attempts | -15 | Consider other channels |
| 10+ attempts | -25 | Move to nurture |

### Exclusions (Score = 0, Hidden by Default)

- Status: Dead, DNC, Under Contract, Sold
- No valid contact method AND no address for mail

### Score Calculation Example

```
Lead: 123 Main St
- Temperature: Hot (+40)
- Motivation: Pre-Foreclosure (+12)
- Motivation: Tax Lien (+12) → capped, total +24
- Last Contact: 8 days ago (+15)
- Task: Overdue follow-up (+25)
- Call Attempts: 2 (no penalty)
- Has Mobile: Yes (+5)

Total: 40 + 24 + 15 + 25 + 5 = 109 → Capped at 100
Next Action: 🔥 Call Now
```

---

## Schema Additions

```prisma
model Record {
  // ... existing fields
  
  // DockInsight v2: Contact Tracking
  lastContactedAt    DateTime?  // When was last outreach?
  lastContactType    String?    // CALL, SMS, MAIL, RVM, EMAIL
  lastContactResult  String?    // ANSWERED, VOICEMAIL, NO_ANSWER, WRONG_NUMBER
  hasEngaged         Boolean    @default(false)  // Ever had a conversation?
  
  // DockInsight v2: Computed (optional, for performance)
  priorityScore      Int?       // 0-100, computed
  nextAction         String?    // Call Now, Follow Up, etc.
  scoreUpdatedAt     DateTime?
  
  @@index([lastContactedAt])
  @@index([priorityScore])
}
```

---

## UI Design

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  DockInsight                              [My Queue ▼] [⚙️]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔥 NEXT UP                                    Score: 94 │   │
│  │                                                          │   │
│  │  123 Main Street, Houston TX 77001                      │   │
│  │  John Smith • Pre-Foreclosure • Hot                     │   │
│  │                                                          │   │
│  │  📞 (713) 555-1234  Mobile                    [CALL]    │   │
│  │                                                          │   │
│  │  Why: Hot lead + Pre-Foreclosure + No contact 8 days    │   │
│  │                                                          │   │
│  │  [📞 Call] [⏭️ Skip] [⏰ Snooze] [✅ Complete Task]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 🔥 Call  │ │ 📋 Follow│ │ 📞 Get   │ │ ⏳ Nurture│          │
│  │   Now    │ │    Up    │ │  Numbers │ │          │          │
│  │    47    │ │    12    │ │    89    │ │   234    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Queue (47 leads)                          [Filter ▼]   │   │
│  │  ┌─────┬────────────────────────────┬──────┬─────────┐  │   │
│  │  │ 94  │ 123 Main St • John Smith   │ 🔥   │ [Call]  │  │   │
│  │  │ 89  │ 456 Oak Ave • Jane Doe     │ 🔥   │ [Call]  │  │   │
│  │  │ 85  │ 789 Pine Rd • Bob Wilson   │ 🌡️   │ [Call]  │  │   │
│  │  │ 82  │ 321 Elm St • Mary Johnson  │ 🔥   │ [Call]  │  │   │
│  │  │ ...                                              │  │   │
│  │  └─────┴────────────────────────────┴──────┴─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │ Today's Activity    │  │ Temperature Distribution        │  │
│  │ • 12 calls made     │  │ [====🔥====][==🌡️==][=❄️=]      │  │
│  │ • 3 contacts        │  │  Hot: 89  Warm: 156  Cold: 412  │  │
│  │ • 1 appointment     │  │                                 │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Actions (Always Visible)

| Action | What it does |
|--------|--------------|
| **📞 Call** | Opens dialer, logs attempt, starts timer |
| **⏭️ Skip** | Move to next lead (logs skip reason) |
| **⏰ Snooze** | Hide for X hours/days |
| **✅ Complete** | Mark task done, move to next |
| **🔥/🌡️/❄️** | Quick temperature change |
| **📝 Note** | Add quick note |
| **📋 Task** | Create follow-up task |

### Record Drawer (Click any lead)

Slides in from right with full details:
- **Score breakdown** — See exactly why this score
- **Contact history** — All calls, SMS, mail attempts
- **Phone numbers** — With status (valid, wrong, disconnected)
- **Owner info** — Name, mailing address
- **Property details** — Address, beds, baths, value
- **Tags & Motivations** — Visual badges
- **Tasks** — Related tasks
- **Activity log** — Recent changes

---

## API Routes

### GET /api/dockinsight/next-up

Returns the single highest priority lead:
```typescript
{
  record: RecordWithDetails
  score: number
  nextAction: 'Call Now' | 'Follow Up' | ...
  reasons: [
    { label: 'Hot Lead', delta: +40 },
    { label: 'Pre-Foreclosure', delta: +12 },
    { label: 'No contact 8 days', delta: +15 },
  ]
  phones: PhoneNumber[]
  pendingTask: Task | null
}
```

### GET /api/dockinsight/queue?bucket=call-now&limit=50

Returns prioritized queue:
```typescript
{
  bucket: 'call-now' | 'follow-up' | 'get-numbers' | 'nurture'
  total: number
  records: Array<{
    id: string
    address: string
    ownerName: string
    temperature: string
    score: number
    nextAction: string
    lastContactedAt: string | null
    topReason: string
  }>
}
```

### GET /api/dockinsight/overview

Returns dashboard summary:
```typescript
{
  buckets: {
    callNow: number
    followUp: number
    getNumbers: number
    nurture: number
  }
  today: {
    callsMade: number
    contacts: number
    appointments: number
    tasksCompleted: number
  }
  temperature: {
    hot: number
    warm: number
    cold: number
  }
  trends: {
    recordsThisWeek: number
    recordsLastWeek: number
    contactRateThisWeek: number
  }
}
```

### POST /api/dockinsight/log-action

Logs user action and advances queue:
```typescript
// Request
{
  recordId: string
  action: 'call' | 'skip' | 'snooze' | 'complete'
  result?: 'answered' | 'voicemail' | 'no_answer' | 'wrong_number'
  notes?: string
  snoozeDuration?: number // minutes
}

// Response
{
  success: true
  nextUp: RecordWithScore // Next lead in queue
}
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. [ ] Add schema fields (lastContactedAt, hasEngaged, etc.)
2. [ ] Create scoring engine (`src/lib/scoring.ts`)
3. [ ] Create `/api/dockinsight/next-up` route
4. [ ] Create `/api/dockinsight/queue` route

### Phase 2: Core UI (Week 2)
5. [ ] Build NextUpCard component
6. [ ] Build ActionQueue component
7. [ ] Build QuickActions component
8. [ ] Build TodaysPlan buckets

### Phase 3: Details & Actions (Week 3)
9. [ ] Build RecordDrawer with score breakdown
10. [ ] Build ScoreExplainer component
11. [ ] Create `/api/dockinsight/log-action` route
12. [ ] Implement Skip/Snooze/Complete actions

### Phase 4: Polish (Week 4)
13. [ ] Add keyboard shortcuts (N = next, C = call, S = skip)
14. [ ] Add sound effects for actions (optional)
15. [ ] Mobile responsiveness
16. [ ] Performance optimization
17. [ ] Testing & bug fixes

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Call current lead |
| `N` or `→` | Skip to next |
| `S` | Snooze current lead |
| `T` | Create task |
| `1` | Mark as Hot |
| `2` | Mark as Warm |
| `3` | Mark as Cold |
| `Enter` | Open record drawer |
| `Esc` | Close drawer |

---

## Success Metrics

### User Behavior
- **Time to first action** — Should be <10 seconds
- **Actions per session** — Should increase
- **Queue completion rate** — % of daily queue worked

### Business Outcomes
- **Calls per day** — Should increase 2x
- **Contact rate** — Should improve with better timing
- **Deals closed** — Ultimate measure

---

## Future Enhancements

### v2.1: Smart Timing
- Best time to call based on past answer rates
- Timezone-aware scheduling
- "Call Window" indicator

### v2.2: Team Features
- Team leaderboard
- Round-robin queue distribution
- Manager oversight view

### v2.3: Integrations
- Click-to-call with dialer
- Auto-log from phone system
- SMS templates

### v2.4: AI Enhancements
- Predict likelihood to answer
- Suggest best contact method
- Auto-categorize call outcomes

---

*Last updated: January 9, 2026*
