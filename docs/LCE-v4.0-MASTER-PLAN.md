# LCE v4.0 Master Plan
## Lead Cadence Engine - The Brain of PropSift

> **"The brain that tells you exactly what to do, when to do it, and why."**

**Version:** 4.0  
**Created:** January 24, 2026  
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Current System Analysis](#3-current-system-analysis)
4. [LCE v4.0 Architecture](#4-lce-v40-architecture)
5. [The 4 Pillars](#5-the-4-pillars)
6. [Implementation Phases](#6-implementation-phases)
7. [Database Schema Changes](#7-database-schema-changes)
8. [API Specifications](#8-api-specifications)
9. [UI Enhancements](#9-ui-enhancements)
10. [Cron Jobs & Automation](#10-cron-jobs--automation)
11. [Testing Strategy](#11-testing-strategy)
12. [Migration Plan](#12-migration-plan)

---

## 1. Executive Summary

LCE v4.0 is a complete overhaul of the Lead Cadence Engine, unifying the best aspects of:
- **v2.2 Scoring Engine** - Priority scoring based on temperature, motivations, engagement
- **v2.3.1 Temperature Cadences** - Structured follow-up sequences (HOT, WARM, COLD, ICE)
- **v3.0 First-to-Market** - Blitz phases for new leads, aggressive initial contact

### Goals
1. **Unified System** - One coherent engine instead of competing versions
2. **Mistake-Proof** - Clear state machine, no orphaned leads
3. **Automated** - Cron jobs for re-enrollment, snooze expiration, stale detection
4. **Transparent** - User always knows WHY a lead is shown and WHAT to do next

---

## 2. The Problem We're Solving

### Wholesale Real Estate Data Challenges

| Problem | Impact | LCE v4.0 Solution |
|---------|--------|-------------------|
| **Data Overload** | 5,000+ records, no idea who to call first | Priority scoring + queue tiers |
| **Stale Data** | Phone numbers go bad, situations change | Phone rotation + exhaustion detection |
| **Timing is Everything** | First to call often wins the deal | Blitz phase for new leads |
| **No System** | Calling randomly = wasted time | Structured cadences by temperature |
| **Follow-up Failure** | Forgetting to call back interested leads | Callback priority + due dates |
| **Phone Exhaustion** | Calling same bad numbers repeatedly | Smart phone rotation |
| **Motivation Decay** | Hot leads go cold if not worked quickly | Temperature-based urgency |

### What Wholesalers Need

| Need | LCE v4.0 Answer |
|------|-----------------|
| "Who do I call RIGHT NOW?" | Queue with priority tiers |
| "When do I call them again?" | `nextActionDue` with cadence steps |
| "This number is bad, try another" | Phone rotation with status tracking |
| "I need new numbers for these" | GET NUMBERS bucket + exhaustion flag |
| "They said call back Tuesday" | Callback scheduling with top priority |
| "I've called 10 times, stop showing them" | Fatigue exit + re-enrollment queue |

---

## 3. Current System Analysis

### What's Working ✅

| Feature | Status | Location |
|---------|--------|----------|
| 6 Buckets UI | ✅ Working | `dashboard/page.tsx` |
| Score Display | ✅ Working | `scoring.ts` |
| "Why This Lead" | ✅ Working | `computePriority()` |
| Phone Buttons | ✅ Working | NextUpCard |
| Snooze | ✅ Working | `log-action/route.ts` |
| Pause/Skip | ✅ Working | `log-action/route.ts` |
| Queue List | ✅ Working | `queue/route.ts` |
| Stats Sidebar | ✅ Working | Dashboard |

### What's Broken/Missing ❌

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Two LCE versions competing | Confusion | v2.3.1 cadence unused, v3.0 phases active |
| No cadence progress indicator | User blind | UI doesn't show step X of Y |
| No auto re-enrollment | Leads fall off | Missing cron job |
| No snooze expiration job | Snoozed leads stuck | Missing cron job |
| Result type not integrated | Call results don't drive cadence | `result-type-handler.ts` not called |
| Phone rotation not visible | User doesn't know which phone | Priority not shown |
| No "exhausted" indicator | Bad leads keep showing | Should auto-move to Get Numbers |

### Current Code Structure

```
src/lib/lce/
├── index.ts              # Main exports (both v2.3.1 and v3.0)
├── types.ts              # Core types, constants
├── scoring.ts            # v2.2 priority scoring
├── first-to-market.ts    # v3.0 blitz phases (ACTIVE)
├── cadence.ts            # v2.3.1 temperature cadences (UNUSED)
├── state-machine.ts      # v2.3.1 state transitions (UNUSED)
├── result-type-handler.ts # v2.4 call result processing (UNUSED)
├── service.ts            # Database integration layer
├── phone-rotation.ts     # Phone priority & rotation
├── workability.ts        # Workability gate & queue sections
├── reenrollment.ts       # Re-enrollment logic
├── call-handler.ts       # Call attempt logging
├── call-outcome-handler.ts # v3.0 outcome processing
├── queue-builder.ts      # Queue construction
├── reconciliation.ts     # Daily reconciliation
└── auto-enroll.ts        # Auto-enrollment for new leads
```

---

## 4. LCE v4.0 Architecture

### The Unified Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        LCE v4.0 BRAIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   SCORING    │───▶│   CADENCE    │───▶│    QUEUE     │      │
│  │   ENGINE     │    │   ENGINE     │    │   BUILDER    │      │
│  │  (WHO)       │    │  (WHEN)      │    │  (ORDER)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    RECORD STATE                           │  │
│  │  • priorityScore    • cadencePhase    • queueBucket       │  │
│  │  • temperatureBand  • cadenceStep     • queuePosition     │  │
│  │  • confidenceLevel  • nextActionDue   • queueReason       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Flow Diagram

```
                              NEW LEAD IMPORTED
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      AUTO-ENROLL      │
                         │   Score + Assign Band │
                         └───────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           BLITZ PHASE                                  │
│  ┌─────────────┐                                                       │
│  │   BLITZ_1   │  Day 1: Call → Day 2: Call → Day 3: Call             │
│  └─────────────┘                                                       │
│        │                                                               │
│        ├── ANSWERED ──────────────────────────────────────▶ ENGAGED   │
│        │                                                               │
│        └── NO ANSWER (3x) ──▶ DEEP_PROSPECT (Get Numbers)             │
│                                      │                                 │
│                                      │ (New phone added)               │
│                                      ▼                                 │
│  ┌─────────────┐                                                       │
│  │   BLITZ_2   │  Day 1: Call new # → Day 2: Call                     │
│  └─────────────┘                                                       │
│        │                                                               │
│        ├── ANSWERED ──────────────────────────────────────▶ ENGAGED   │
│        │                                                               │
│        └── NO ANSWER (2x) ──────────────────────────────────┐         │
│                                                              │         │
└──────────────────────────────────────────────────────────────┼─────────┘
                                                               │
                                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      TEMPERATURE CADENCE                               │
│                                                                        │
│  HOT:   Day 0 → 1 → 2 → 4 → 6 → 9 → 14    (7 touches)                │
│  WARM:  Day 0 → 3 → 7 → 14 → 21           (5 touches)                 │
│  COLD:  Day 0 → 14 → 45                   (3 touches)                 │
│  ICE:   Day 0 → 90                        (2 touches)                 │
│                                                                        │
│        │                                                               │
│        ├── ANSWERED ──────────────────────────────────────▶ ENGAGED   │
│        │                                                               │
│        └── COMPLETED (all steps done) ───────────────────────┐        │
│                                                               │        │
└───────────────────────────────────────────────────────────────┼────────┘
                                                                │
                                                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        RE-ENROLLMENT QUEUE                             │
│                                                                        │
│  Wait Period (based on temperature + score):                          │
│  • HOT:  15 days                                                       │
│  • WARM: 30 days                                                       │
│  • COLD: 45 days                                                       │
│  • ICE:  90 days                                                       │
│                                                                        │
│  After wait → Re-enroll into TEMPERATURE CADENCE                      │
│  Max 6 cycles → LONG_TERM_NURTURE (annual contact only)               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                              EXIT STATES
┌────────────────────────────────────────────────────────────────────────┐
│  ENGAGED          │ Conversation happened, follow user's workflow      │
│  EXITED_DNC       │ Do Not Call requested - NEVER re-enroll           │
│  EXITED_DEAD      │ Person deceased - NEVER re-enroll                 │
│  EXITED_CLOSED    │ Deal closed (won or lost) - NEVER re-enroll       │
│  LONG_TERM_NURTURE│ Max cycles reached - annual check only            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. The 4 Pillars

### Pillar 1: Unified Scoring Engine

Keep the v2.2 scoring logic with these components:

```typescript
interface ScoreBreakdown {
  // Base Score (0-40)
  temperatureScore: number      // HOT=40, WARM=25, COLD=10, ICE=0
  
  // Motivation Bonuses (0-30)
  motivationScore: number       // Based on motivation tiers + synergy
  
  // Engagement Factors (-20 to +20)
  contactRecencyScore: number   // Recent contact = bonus
  engagementScore: number       // Has engaged = bonus
  fatigueScore: number          // High no-response = penalty
  
  // Data Quality (0-15)
  dataQualityScore: number      // Phones, emails, completeness
  
  // Task Urgency (0-15)
  taskUrgencyScore: number      // Overdue/due today tasks
  
  // Property Factors (0-10)
  propertyScore: number         // Value, age, type
}

// Final score = sum of all components (typically 0-100+)
```

### Pillar 2: Adaptive Cadence Engine

Merge v2.3.1 temperature cadences with v3.0 blitz phases:

```typescript
// Cadence Phases (unified)
type CadencePhase = 
  | 'NEW'           // Just imported, not yet enrolled
  | 'BLITZ_1'       // Initial aggressive contact (3 calls)
  | 'DEEP_PROSPECT' // Waiting for new phone numbers
  | 'BLITZ_2'       // Second blitz after new phone added
  | 'TEMPERATURE'   // Following temperature-based cadence
  | 'COMPLETED'     // Cadence finished, awaiting re-enrollment
  | 'ENGAGED'       // Contact made, user-driven follow-up
  | 'NURTURE'       // Long-term, annual contact only

// Cadence States (for state machine)
type CadenceState = 
  | 'NOT_ENROLLED'
  | 'ACTIVE'
  | 'SNOOZED'
  | 'PAUSED'
  | 'COMPLETED_NO_CONTACT'
  | 'EXITED_ENGAGED'
  | 'EXITED_DNC'
  | 'EXITED_DEAD'
  | 'EXITED_CLOSED'
  | 'STALE_ENGAGED'
  | 'LONG_TERM_NURTURE'
```

**Temperature Cadence Templates:**

| Temperature | Steps | Schedule | Total Days |
|-------------|-------|----------|------------|
| HOT | 7 | Day 0, 1, 2, 4, 6, 9, 14 | 14 |
| WARM | 5 | Day 0, 3, 7, 14, 21 | 21 |
| COLD | 3 | Day 0, 14, 45 | 45 |
| ICE | 2 | Day 0, 90 | 90 |
| GENTLE | 4 | Day 0, 7, 21, 45 | 45 |
| ANNUAL | 1 | Day 0 (yearly) | 365 |

### Pillar 3: Smart Phone Rotation

```typescript
// Phone Priority Order
const PHONE_PRIORITY = [
  { status: 'VALID', type: 'MOBILE', isPrimary: true },   // 1st
  { status: 'VALID', type: 'MOBILE', isPrimary: false },  // 2nd
  { status: 'UNVERIFIED', type: 'MOBILE' },               // 3rd
  { status: 'VALID', type: 'LANDLINE' },                  // 4th
  { status: 'UNVERIFIED', type: 'LANDLINE' },             // 5th
]

// Rotation Rules
const ROTATION_RULES = {
  consecutiveNoAnswer: 2,    // Rotate after 2 no-answers
  wrongNumber: 'immediate',  // Rotate immediately, mark bad
  disconnected: 'immediate', // Rotate immediately, mark bad
  dnc: 'immediate',          // Rotate immediately, mark DNC
}

// Exhaustion Detection
function isPhoneExhausted(phones: Phone[]): boolean {
  return phones.every(p => 
    p.status === 'WRONG' || 
    p.status === 'DISCONNECTED' || 
    p.status === 'DNC'
  )
}
```

### Pillar 4: Intelligent Queue Builder

```typescript
// Queue Tiers (Priority Order)
const QUEUE_TIERS = [
  { tier: 1, name: 'CALLBACKS_DUE',    icon: '🔔', color: 'red' },
  { tier: 2, name: 'NEW_LEADS',        icon: '⚡', color: 'yellow' },
  { tier: 3, name: 'BLITZ_FOLLOWUPS',  icon: '🔥', color: 'orange' },
  { tier: 4, name: 'TASKS_DUE',        icon: '✅', color: 'blue' },
  { tier: 5, name: 'CADENCE_DUE',      icon: '📞', color: 'green' },
  { tier: 6, name: 'CALL_QUEUE',       icon: '📋', color: 'gray' },
  { tier: 7, name: 'VERIFY_FIRST',     icon: '🔍', color: 'purple' },
  { tier: 8, name: 'GET_NUMBERS',      icon: '📱', color: 'pink' },
  { tier: 9, name: 'NURTURE',          icon: '🌱', color: 'teal' },
]

// Bucket Mapping (UI)
const BUCKET_MAP = {
  'call-now':        [1, 2, 3],      // Callbacks + New + Blitz
  'follow-up-today': [4, 5],         // Tasks + Cadence due
  'call-queue':      [6],            // Score-based queue
  'verify-first':    [7],            // High score, low confidence
  'get-numbers':     [8],            // No valid phones
  'nurture':         [9],            // Long-term
}
```

---

## 6. Implementation Phases

### Phase 1: Backend Unification (Week 1-2)

**Goal:** Create single unified LCE service

**Tasks:**
- [ ] Create `src/lib/lce/v4/engine.ts` - Main unified engine
- [ ] Create `src/lib/lce/v4/phase-manager.ts` - Phase transitions
- [ ] Create `src/lib/lce/v4/cadence-manager.ts` - Cadence step logic
- [ ] Create `src/lib/lce/v4/queue-manager.ts` - Queue building
- [ ] Integrate `result-type-handler.ts` into call flow
- [ ] Add phone exhaustion detection
- [ ] Write unit tests for all new modules

**Files to Create:**
```
src/lib/lce/v4/
├── engine.ts           # Main LCE v4.0 entry point
├── phase-manager.ts    # Blitz → Temperature → Re-enrollment
├── cadence-manager.ts  # Step advancement, due dates
├── queue-manager.ts    # Queue tier assignment
├── phone-manager.ts    # Phone rotation & exhaustion
├── types.ts            # v4.0 specific types
└── index.ts            # Exports
```

### Phase 2: API Updates (Week 2-3)

**Goal:** Update all API endpoints to use unified LCE

**Tasks:**
- [ ] Update `/api/dockinsight/log-action` - Use v4 engine
- [ ] Update `/api/dockinsight/queue` - Use v4 queue builder
- [ ] Create `/api/lce/status/[recordId]` - Get cadence status
- [ ] Create `/api/lce/enroll` - Manual enrollment
- [ ] Create `/api/lce/advance` - Manual step advance
- [ ] Create `/api/cron/lce-maintenance` - Cron endpoint

**API Specifications:**

```typescript
// POST /api/dockinsight/log-action
interface LogActionRequest {
  recordId: string
  action: 'call' | 'skip' | 'snooze' | 'pause' | 'resume' | 'complete'
  callResultId?: string    // For 'call' action
  phoneId?: string         // Which phone was called
  snoozeHours?: number     // For 'snooze' action
  notes?: string
}

interface LogActionResponse {
  success: boolean
  record: {
    id: string
    cadencePhase: string
    cadenceStep: number
    cadenceProgress: string  // "3/7"
    nextActionDue: Date
    nextPhoneToCall: Phone
    queueBucket: string
  }
  nextRecord?: Record       // Auto-advance to next
}

// GET /api/lce/status/[recordId]
interface LCEStatusResponse {
  recordId: string
  phase: CadencePhase
  state: CadenceState
  step: number
  totalSteps: number
  progress: string          // "3/7"
  nextActionDue: Date
  nextActionType: string
  enrollmentCount: number
  reEnrollmentDate?: Date
  phones: {
    total: number
    valid: number
    exhausted: boolean
    nextToCall: Phone
  }
  history: CadenceLogEntry[]
}
```

### Phase 3: Cron Jobs (Week 3)

**Goal:** Automate maintenance tasks

**Tasks:**
- [ ] Snooze expiration (every 15 min)
- [ ] Re-enrollment check (daily at 6am)
- [ ] Stale engaged detection (daily at 6am)
- [ ] Score recalculation (daily at 5am)
- [ ] Phone exhaustion check (daily at 5am)

**Vercel Cron Configuration:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/lce-maintenance?task=snooze",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/lce-maintenance?task=reenroll",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/lce-maintenance?task=stale",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/lce-maintenance?task=scores",
      "schedule": "0 5 * * *"
    }
  ]
}
```

### Phase 4: UI Enhancements (Week 4)

**Goal:** Add LCE visibility to existing UI (DO NOT replace UI)

**Tasks:**
- [ ] Add cadence progress bar to NextUpCard
- [ ] Add phase badge (BLITZ_1, TEMPERATURE, etc.)
- [ ] Highlight recommended phone to call
- [ ] Add "exhausted" indicator
- [ ] Improve snooze dropdown with return date
- [ ] Add cadence history panel (collapsible)

**UI Mockup:**

```
┌─────────────────────────────────────────────────────────────┐
│  John Smith                           [BLITZ_1] [Score: 72] │
│  123 Main St, Dallas TX                                     │
├─────────────────────────────────────────────────────────────┤
│  Cadence Progress: ████░░░ Step 2/3 (Blitz)                │
│  Next Action: CALL due TODAY                                │
├─────────────────────────────────────────────────────────────┤
│  📱 (214) 555-1234  [MOBILE] [VALID] ← CALL THIS           │
│  📞 (972) 555-5678  [LANDLINE] [UNVERIFIED]                │
│  ❌ (469) 555-9999  [MOBILE] [WRONG]                        │
├─────────────────────────────────────────────────────────────┤
│  Why This Lead:                                             │
│  • Hot Lead (+40)                                           │
│  • Code Violation (+10)                                     │
│  • Blitz Phase - Day 2 (+15)                               │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: Testing & Polish (Week 5)

**Goal:** Ensure reliability and edge case handling

**Tasks:**
- [ ] Integration tests for full call flow
- [ ] Edge case testing (no phones, all DNC, etc.)
- [ ] Performance testing (1000+ records)
- [ ] Manual override testing
- [ ] Migration testing with existing data
- [ ] Documentation update

---

## 7. Database Schema Changes

### New Fields on Record Model

```prisma
model Record {
  // ... existing fields ...

  // LCE v4.0 Fields
  cadencePhase        String    @default("NEW")  // NEW, BLITZ_1, DEEP_PROSPECT, BLITZ_2, TEMPERATURE, COMPLETED, ENGAGED, NURTURE
  cadenceProgress     String?   // "3/7" - human readable progress
  lastPhoneCalledId   String?   // Track phone rotation
  phoneExhaustedAt    DateTime? // When all phones went bad
  blitzStartedAt      DateTime? // When blitz phase started
  temperatureStartedAt DateTime? // When temperature cadence started
  
  // Indexes
  @@index([createdById, cadencePhase])
  @@index([createdById, phoneExhaustedAt])
}
```

### New CadenceLog Fields

```prisma
model CadenceLog {
  // ... existing fields ...
  
  // LCE v4.0 Fields
  phaseAtTime       String?   // Phase when action occurred
  stepAtTime        Int?      // Step when action occurred
  phoneCalledId     String?   // Which phone was called
  phoneCalledNumber String?   // Phone number (denormalized)
  transitionReason  String?   // Why phase/state changed
}
```

---

## 8. API Specifications

### Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dockinsight/queue` | GET | Get queue with LCE data |
| `/api/dockinsight/log-action` | POST | Log call/skip/snooze/etc |
| `/api/lce/status/[id]` | GET | Get LCE status for record |
| `/api/lce/enroll` | POST | Manual enrollment |
| `/api/lce/advance` | POST | Manual step advance |
| `/api/lce/reenroll` | POST | Force re-enrollment |
| `/api/cron/lce-maintenance` | GET | Cron maintenance tasks |

### Response Formats

```typescript
// Standard LCE Record Response
interface LCERecordResponse {
  id: string
  ownerFullName: string
  propertyStreet: string
  
  // Scoring
  priorityScore: number
  temperatureBand: 'HOT' | 'WARM' | 'COLD' | 'ICE'
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  scoreBreakdown: ScoreBreakdown
  
  // Cadence
  cadencePhase: CadencePhase
  cadenceState: CadenceState
  cadenceStep: number
  cadenceProgress: string      // "3/7"
  nextActionType: string
  nextActionDue: Date
  
  // Phone
  phones: Phone[]
  nextPhoneToCall: Phone | null
  phoneExhausted: boolean
  
  // Queue
  queueBucket: string
  queueTier: number
  queueReason: string
  
  // Meta
  enrollmentCount: number
  reEnrollmentDate: Date | null
}
```

---

## 9. UI Enhancements

### Components to Update

| Component | Enhancement |
|-----------|-------------|
| `NextUpCard` | Add cadence progress bar, phase badge |
| `PhoneButtons` | Highlight recommended phone |
| `BucketSelector` | Show tier breakdown in counts |
| `QueueList` | Add phase/step columns |
| `SnoozeDropdown` | Show return date/time |

### New Components to Create

| Component | Purpose |
|-----------|---------|
| `CadenceProgressBar` | Visual step progress |
| `PhaseBadge` | Show current phase |
| `PhoneExhaustedAlert` | Alert when no phones left |
| `CadenceHistoryPanel` | Collapsible history log |

---

## 10. Cron Jobs & Automation

### Job Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Snooze Expiration | Every 15 min | Un-snooze records where `snoozedUntil < now` |
| Re-enrollment | Daily 6am | Re-enroll records where `reEnrollmentDate < now` |
| Stale Detection | Daily 6am | Mark engaged records stale after 21 days |
| Score Refresh | Daily 5am | Recalculate scores for active records |
| Phone Exhaustion | Daily 5am | Check for newly exhausted phone lists |

### Job Implementation

```typescript
// /api/cron/lce-maintenance/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const task = searchParams.get('task')
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  switch (task) {
    case 'snooze':
      return await processSnoozeExpiration()
    case 'reenroll':
      return await processReEnrollment()
    case 'stale':
      return await processStaleDetection()
    case 'scores':
      return await processScoreRefresh()
    default:
      return Response.json({ error: 'Unknown task' }, { status: 400 })
  }
}
```

---

## 11. Testing Strategy

### Unit Tests

| Module | Test Cases |
|--------|------------|
| `phase-manager` | Phase transitions, edge cases |
| `cadence-manager` | Step advancement, due dates |
| `queue-manager` | Tier assignment, sorting |
| `phone-manager` | Rotation, exhaustion |
| `scoring` | Score calculation, breakdown |

### Integration Tests

| Flow | Test Cases |
|------|------------|
| New Lead | Import → Auto-enroll → Blitz |
| Call Flow | Call → Result → Phase transition |
| Phone Rotation | No answer → Rotate → Exhaustion |
| Re-enrollment | Complete → Wait → Re-enroll |
| Snooze | Snooze → Expire → Return to queue |

### Edge Cases

- Record with no phones
- Record with all DNC phones
- Record at max enrollment cycles
- Callback scheduled for past date
- Concurrent calls to same record

---

## 12. Migration Plan

### Step 1: Deploy Schema Changes
```bash
npx prisma migrate dev --name lce_v4_fields
npx prisma db push
```

### Step 2: Backfill Existing Records
```typescript
// Migration script
async function migrateToV4() {
  const records = await prisma.record.findMany({
    where: { cadencePhase: null }
  })
  
  for (const record of records) {
    // Determine phase from current state
    const phase = determinePhaseFromState(record)
    const progress = calculateProgress(record)
    
    await prisma.record.update({
      where: { id: record.id },
      data: {
        cadencePhase: phase,
        cadenceProgress: progress,
      }
    })
  }
}
```

### Step 3: Deploy New Code
1. Deploy backend changes (Phase 1-2)
2. Deploy cron jobs (Phase 3)
3. Deploy UI changes (Phase 4)

### Step 4: Monitor & Adjust
- Monitor cron job execution
- Check queue accuracy
- Verify phase transitions
- Gather user feedback

---

## Appendix A: Call Result to Phase Transition Map

| Call Result | Result Type | Phase Transition | State Transition |
|-------------|-------------|------------------|------------------|
| Answered - Interested | CONTACT_MADE | → ENGAGED | → EXITED_ENGAGED |
| Answered - Callback | CONTACT_MADE | → ENGAGED | → EXITED_ENGAGED |
| Answered - Not Interested | TERMINAL | → ENGAGED | → EXITED_CLOSED |
| Voicemail | NO_CONTACT | Stay in phase | Advance step |
| No Answer | NO_CONTACT | Stay in phase | Advance step |
| Busy | RETRY | Stay in phase | No advance |
| Wrong Number | BAD_DATA | Stay in phase | Mark phone bad |
| Disconnected | BAD_DATA | Stay in phase | Mark phone bad |
| DNC | TERMINAL | → EXIT | → EXITED_DNC |

---

## Appendix B: Queue Tier Logic

```typescript
function getQueueTier(record: Record): number {
  const now = new Date()
  
  // Tier 1: Callbacks due
  if (record.callbackScheduledFor && record.callbackScheduledFor <= now) {
    return 1
  }
  
  // Tier 2: New leads (never called)
  if (record.cadencePhase === 'NEW' && record.callAttempts === 0) {
    return 2
  }
  
  // Tier 3: Blitz follow-ups due today
  if (['BLITZ_1', 'BLITZ_2'].includes(record.cadencePhase) && isDueToday(record.nextActionDue)) {
    return 3
  }
  
  // Tier 4: Tasks due
  if (record.hasOverdueTask || record.hasDueTodayTask) {
    return 4
  }
  
  // Tier 5: Cadence steps due
  if (record.cadencePhase === 'TEMPERATURE' && isDueToday(record.nextActionDue)) {
    return 5
  }
  
  // Tier 6: General call queue
  if (record.cadenceState === 'ACTIVE' && isDueToday(record.nextActionDue)) {
    return 6
  }
  
  // Tier 7: Verify first (high score, low confidence)
  if (record.confidenceLevel === 'LOW' && record.priorityScore >= 60) {
    return 7
  }
  
  // Tier 8: Get numbers (phone exhausted)
  if (record.phoneExhausted || record.phoneCount === 0) {
    return 8
  }
  
  // Tier 9: Nurture
  return 9
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Blitz** | Aggressive initial contact phase (3 calls in 3 days) |
| **Cadence** | Structured sequence of contact attempts |
| **Phase** | Current stage in the LCE lifecycle |
| **State** | Current status (ACTIVE, SNOOZED, PAUSED, etc.) |
| **Step** | Current position within a cadence |
| **Temperature** | Lead priority classification (HOT, WARM, COLD, ICE) |
| **Tier** | Queue priority level (1-9) |
| **Exhausted** | All phone numbers marked as bad |
| **Re-enrollment** | Automatic restart of cadence after wait period |

---

**END OF LCE v4.0 MASTER PLAN**
