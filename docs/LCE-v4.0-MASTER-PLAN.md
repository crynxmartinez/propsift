# LCE v4.0 Master Plan
## Lead Cadence Engine - The Brain of PropSift

> **"The brain that tells you exactly what to do, when to do it, and why."**

**Version:** 4.0  
**Created:** January 24, 2026  
**Status:** Planning Phase  
**Last Updated:** January 24, 2026

---

## Table of Contents

### Part A: Overview
1. [Executive Summary](#1-executive-summary)
2. [The Problem We're Solving](#2-the-problem-were-solving)
3. [Current System Analysis](#3-current-system-analysis)
4. [LCE v4.0 Architecture](#4-lce-v40-architecture)
5. [The 4 Pillars](#5-the-4-pillars)

### Part B: Backend Implementation
6. [Phase 1: Backend Core Engine](#6-phase-1-backend-core-engine)
7. [Phase 2: API Layer](#7-phase-2-api-layer)
8. [Phase 3: Cron Jobs & Automation](#8-phase-3-cron-jobs--automation)
9. [Database Schema Changes](#9-database-schema-changes)

### Part C: Frontend Implementation
10. [Phase 4: UI Components](#10-phase-4-ui-components)
11. [Phase 5: UI Integration](#11-phase-5-ui-integration)
12. [Component Specifications](#12-component-specifications)

### Part D: Deployment
13. [Testing Strategy](#13-testing-strategy)
14. [Migration Plan](#14-migration-plan)
15. [Rollout Checklist](#15-rollout-checklist)

---

# PART A: OVERVIEW

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
| 6 Buckets UI | ✅ Working | `BucketSelector.tsx` |
| Score Display | ✅ Working | `scoring.ts` |
| "Why This Lead" | ✅ Working | `computePriority()` |
| Phone Buttons | ✅ Working | `NextUpCard.tsx` |
| Snooze | ✅ Working | `log-action/route.ts` |
| Pause/Skip | ✅ Working | `log-action/route.ts` |
| Queue List | ✅ Working | `QueueList.tsx` |
| Stats Sidebar | ✅ Working | Dashboard |
| Cadence Progress Bar | ✅ Working | `NextUpCard.tsx` |
| State Badges | ✅ Working | `NextUpCard.tsx` |

### What's Broken/Missing ❌

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Two LCE versions competing | Confusion | v2.3.1 cadence unused, v3.0 phases active |
| No phase badge | User doesn't know BLITZ vs TEMPERATURE | UI missing |
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
└── ...
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
│  │  • temperatureBand  • cadenceStep     • queueTier         │  │
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
  temperatureScore: number      // HOT=40, WARM=25, COLD=10, ICE=0
  motivationScore: number       // Based on motivation tiers + synergy
  contactRecencyScore: number   // Recent contact = bonus
  engagementScore: number       // Has engaged = bonus
  fatigueScore: number          // High no-response = penalty
  dataQualityScore: number      // Phones, emails, completeness
  taskUrgencyScore: number      // Overdue/due today tasks
  propertyScore: number         // Value, age, type
}
// Final score = sum of all components (typically 0-100+)
```

### Pillar 2: Adaptive Cadence Engine

```typescript
type CadencePhase = 
  | 'NEW'           // Just imported, not yet enrolled
  | 'BLITZ_1'       // Initial aggressive contact (3 calls)
  | 'DEEP_PROSPECT' // Waiting for new phone numbers
  | 'BLITZ_2'       // Second blitz after new phone added
  | 'TEMPERATURE'   // Following temperature-based cadence
  | 'COMPLETED'     // Cadence finished, awaiting re-enrollment
  | 'ENGAGED'       // Contact made, user-driven follow-up
  | 'NURTURE'       // Long-term, annual contact only

type CadenceState = 
  | 'NOT_ENROLLED' | 'ACTIVE' | 'SNOOZED' | 'PAUSED'
  | 'COMPLETED_NO_CONTACT' | 'EXITED_ENGAGED' | 'EXITED_DNC'
  | 'EXITED_DEAD' | 'EXITED_CLOSED' | 'STALE_ENGAGED' | 'LONG_TERM_NURTURE'
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
| BLITZ | 3 | Day 0, 1, 2 | 3 |

### Pillar 3: Smart Phone Rotation

```typescript
// Phone Priority Order
const PHONE_PRIORITY = [
  { status: 'VALID', type: 'MOBILE', isPrimary: true },
  { status: 'VALID', type: 'MOBILE', isPrimary: false },
  { status: 'UNVERIFIED', type: 'MOBILE' },
  { status: 'VALID', type: 'LANDLINE' },
  { status: 'UNVERIFIED', type: 'LANDLINE' },
]

// Rotation Rules
- 2 consecutive no-answers → rotate to next phone
- Wrong number → mark bad, rotate immediately
- Disconnected → mark bad, rotate immediately
- DNC → mark DNC, rotate immediately
- All phones bad → move to GET_NUMBERS bucket
```

### Pillar 4: Intelligent Queue Builder

```typescript
// Queue Tiers (Priority Order)
const QUEUE_TIERS = [
  { tier: 1, name: 'CALLBACKS_DUE',    icon: '🔔', bucket: 'call-now' },
  { tier: 2, name: 'NEW_LEADS',        icon: '⚡', bucket: 'call-now' },
  { tier: 3, name: 'BLITZ_FOLLOWUPS',  icon: '🔥', bucket: 'call-now' },
  { tier: 4, name: 'TASKS_DUE',        icon: '✅', bucket: 'follow-up-today' },
  { tier: 5, name: 'CADENCE_DUE',      icon: '📞', bucket: 'follow-up-today' },
  { tier: 6, name: 'CALL_QUEUE',       icon: '📋', bucket: 'call-queue' },
  { tier: 7, name: 'VERIFY_FIRST',     icon: '🔍', bucket: 'verify-first' },
  { tier: 8, name: 'GET_NUMBERS',      icon: '📱', bucket: 'get-numbers' },
  { tier: 9, name: 'NURTURE',          icon: '🌱', bucket: 'nurture' },
]
```

---

# PART B: BACKEND IMPLEMENTATION

---

## 6. Phase 1: Backend Core Engine

**Timeline:** Week 1-2  
**Goal:** Create single unified LCE v4.0 service

### 6.1 Files to Create

```
src/lib/lce/v4/
├── index.ts            # Main exports
├── types.ts            # v4.0 specific types
├── engine.ts           # Main LCE v4.0 entry point
├── phase-manager.ts    # Blitz → Temperature → Re-enrollment
├── cadence-manager.ts  # Step advancement, due dates
├── queue-manager.ts    # Queue tier assignment
├── phone-manager.ts    # Phone rotation & exhaustion
├── result-handler.ts   # Call result processing
└── constants.ts        # Configuration constants
```

### 6.2 Task Checklist

#### 6.2.1 Core Types (`types.ts`)
- [ ] Define `CadencePhase` enum
- [ ] Define `CadenceState` enum
- [ ] Define `QueueTier` enum (1-9)
- [ ] Define `PhoneStatus` enum
- [ ] Define `ResultType` enum
- [ ] Create `LCERecord` interface
- [ ] Create `PhaseTransitionResult` interface
- [ ] Create `QueueAssignment` interface

#### 6.2.2 Phase Manager (`phase-manager.ts`)
- [ ] `enrollNewLead(record)` - Auto-enroll into BLITZ_1
- [ ] `calculatePhaseTransition(record, callResult)` - Determine next phase
- [ ] `transitionToBlitz1(record)` - Start initial blitz
- [ ] `transitionToDeepProspect(record)` - Move to get numbers
- [ ] `transitionToBlitz2(record)` - Start second blitz
- [ ] `transitionToTemperature(record)` - Start temperature cadence
- [ ] `transitionToCompleted(record)` - Mark cadence complete
- [ ] `transitionToEngaged(record)` - Contact made
- [ ] `transitionToNurture(record)` - Long-term annual
- [ ] `handleNewPhoneAdded(record)` - Trigger BLITZ_2

#### 6.2.3 Cadence Manager (`cadence-manager.ts`)
- [ ] `getCadenceTemplate(temperatureBand)` - Get step schedule
- [ ] `getCurrentStep(record)` - Get current step info
- [ ] `advanceStep(record)` - Move to next step
- [ ] `calculateNextActionDue(record, step)` - Calculate due date
- [ ] `isStepDue(record)` - Check if action is due today
- [ ] `isStepOverdue(record)` - Check if action is overdue
- [ ] `getCadenceProgress(record)` - Return "3/7" format
- [ ] `getTotalSteps(cadenceType)` - Get total steps

#### 6.2.4 Queue Manager (`queue-manager.ts`)
- [ ] `assignQueueTier(record)` - Assign tier 1-9
- [ ] `assignQueueBucket(record)` - Map to UI bucket
- [ ] `buildQueue(records, bucket)` - Build sorted queue
- [ ] `getQueueCounts(records)` - Get counts per bucket
- [ ] `sortByPriority(records)` - Sort within tier by score

**Queue Tier Logic:**
```typescript
function assignQueueTier(record): number {
  // Tier 1: Callbacks due NOW
  if (record.callbackScheduledFor <= now) return 1
  
  // Tier 2: New leads (never called)
  if (record.cadencePhase === 'NEW' && record.callAttempts === 0) return 2
  
  // Tier 3: Blitz follow-ups due today
  if (['BLITZ_1', 'BLITZ_2'].includes(record.cadencePhase) && isDueToday(record)) return 3
  
  // Tier 4: Tasks due
  if (record.hasOverdueTask || record.hasDueTodayTask) return 4
  
  // Tier 5: Temperature cadence steps due
  if (record.cadencePhase === 'TEMPERATURE' && isDueToday(record)) return 5
  
  // Tier 6: General call queue
  if (record.cadenceState === 'ACTIVE' && isDueToday(record)) return 6
  
  // Tier 7: Verify first (high score, low confidence)
  if (record.confidenceLevel === 'LOW' && record.priorityScore >= 60) return 7
  
  // Tier 8: Get numbers (phone exhausted)
  if (record.phoneExhausted || record.phoneCount === 0) return 8
  
  // Tier 9: Nurture
  return 9
}
```

#### 6.2.5 Phone Manager (`phone-manager.ts`)
- [ ] `getNextPhoneToCall(phones)` - Get recommended phone
- [ ] `sortPhonesByPriority(phones)` - Priority ordering
- [ ] `updatePhoneStatus(phone, outcome)` - Update after call
- [ ] `isPhoneExhausted(phones)` - Check if all phones bad
- [ ] `markPhoneExhausted(record)` - Set exhaustion flag
- [ ] `shouldRotatePhone(phone)` - Check rotation rules
- [ ] `getPhoneSummary(phones)` - Get counts by status

#### 6.2.6 Result Handler (`result-handler.ts`)
- [ ] `processCallResult(record, callResult, phone)` - Main handler
- [ ] `mapResultToType(callResultName)` - Map to ResultType
- [ ] `getPhaseTransition(record, resultType)` - Get next phase
- [ ] `getStateTransition(record, resultType)` - Get next state
- [ ] `updateEngagement(record, resultType)` - Update engagement
- [ ] `updateFatigue(record, resultType)` - Update no-response streak

**Result Type Mapping:**
```typescript
const RESULT_TYPE_MAP = {
  'No Answer': 'NO_CONTACT',
  'Voicemail': 'NO_CONTACT',
  'Busy': 'RETRY',
  'Call Back': 'RETRY',
  'Answered - Interested': 'CONTACT_MADE',
  'Answered - Callback': 'CONTACT_MADE',
  'Answered - Not Now': 'CONTACT_MADE',
  'Wrong Number': 'BAD_DATA',
  'Disconnected': 'BAD_DATA',
  'DNC': 'TERMINAL',
  'Not Interested': 'TERMINAL',
}
```

#### 6.2.7 Main Engine (`engine.ts`)
- [ ] `processAction(record, action, params)` - Main entry point
- [ ] `handleCall(record, callResult, phoneId)` - Process call
- [ ] `handleSkip(record)` - Process skip
- [ ] `handleSnooze(record, hours)` - Process snooze
- [ ] `handlePause(record, reason)` - Process pause
- [ ] `handleResume(record)` - Process resume
- [ ] `handleComplete(record)` - Process complete
- [ ] `getRecordLCEStatus(record)` - Get full LCE status
- [ ] `enrollRecord(record)` - Manual enrollment
- [ ] `reEnrollRecord(record)` - Force re-enrollment

---

## 7. Phase 2: API Layer

**Timeline:** Week 2-3  
**Goal:** Update all API endpoints to use unified LCE v4.0

### 7.1 Endpoints to Update

#### 7.1.1 `/api/dockinsight/log-action/route.ts`
- [ ] Import LCE v4.0 engine
- [ ] Replace v3.0 logic with v4.0 `processAction`
- [ ] Add phone tracking to call logging
- [ ] Return enhanced response with LCE status

**Request:**
```typescript
interface LogActionRequest {
  recordId: string
  action: 'call' | 'skip' | 'snooze' | 'pause' | 'resume' | 'complete'
  callResultId?: string
  phoneId?: string
  snoozeHours?: number  // 1, 24, 72, 168
  notes?: string
}
```

**Response:**
```typescript
interface LogActionResponse {
  success: boolean
  record: {
    id: string
    cadencePhase: CadencePhase
    cadenceState: CadenceState
    cadenceStep: number
    cadenceProgress: string
    nextActionDue: Date | null
    queueTier: number
    queueBucket: string
  }
  phone?: {
    id: string
    newStatus: PhoneStatus
    shouldRotate: boolean
    nextPhone: Phone | null
  }
  nextRecord?: NextUpData
}
```

#### 7.1.2 `/api/dockinsight/queue/route.ts`
- [ ] Import LCE v4.0 queue manager
- [ ] Replace v2.2 scoring with v4.0 tier assignment
- [ ] Add phase and state to response
- [ ] Add phone summary to each record

#### 7.1.3 `/api/dockinsight/next-up/route.ts`
- [ ] Add LCE v4.0 status to response
- [ ] Add recommended phone highlight
- [ ] Add cadence history (last 5 entries)

### 7.2 New Endpoints to Create

#### 7.2.1 `/api/lce/status/[recordId]/route.ts` (NEW)
- [ ] GET endpoint for full LCE status
- [ ] Include cadence history
- [ ] Include phone summary

**Response:**
```typescript
interface LCEStatusResponse {
  recordId: string
  phase: CadencePhase
  state: CadenceState
  cadenceType: string | null
  step: number
  totalSteps: number
  progress: string
  nextActionDue: Date | null
  nextActionType: string
  enrollmentCount: number
  maxEnrollments: number
  reEnrollmentDate: Date | null
  phones: {
    total: number
    valid: number
    exhausted: boolean
    nextToCall: Phone | null
  }
  queueTier: number
  queueBucket: string
  history: CadenceLogEntry[]
}
```

#### 7.2.2 `/api/lce/enroll/route.ts` (NEW)
- [ ] POST endpoint for manual enrollment
- [ ] Validate record is enrollable

#### 7.2.3 `/api/lce/reenroll/route.ts` (NEW)
- [ ] POST endpoint for force re-enrollment
- [ ] Skip wait period

#### 7.2.4 `/api/lce/bulk/route.ts` (NEW)
- [ ] POST endpoint for bulk operations
- [ ] Support pause, resume, re-enroll, snooze

---

## 8. Phase 3: Cron Jobs & Automation

**Timeline:** Week 3  
**Goal:** Automate maintenance tasks

### 8.1 Cron Endpoint

#### `/api/cron/lce-maintenance/route.ts` (NEW)
- [ ] Create GET endpoint with task parameter
- [ ] Add CRON_SECRET verification
- [ ] Implement all maintenance tasks

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const task = searchParams.get('task')
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  switch (task) {
    case 'snooze': return await processSnoozeExpiration()
    case 'reenroll': return await processReEnrollment()
    case 'stale': return await processStaleDetection()
    case 'scores': return await processScoreRefresh()
    case 'exhausted': return await processPhoneExhaustion()
    default: return Response.json({ error: 'Unknown task' }, { status: 400 })
  }
}
```

### 8.2 Cron Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `snooze` | Every 15 min | Un-snooze records where `snoozedUntil < now` |
| `reenroll` | Daily 6am | Re-enroll records where `reEnrollmentDate < now` |
| `stale` | Daily 6am | Mark engaged records stale after 21 days |
| `scores` | Daily 5am | Recalculate scores for active records |
| `exhausted` | Daily 5am | Check for newly exhausted phone lists |

### 8.3 Vercel Cron Configuration

**File:** `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/lce-maintenance?task=snooze", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/lce-maintenance?task=reenroll", "schedule": "0 6 * * *" },
    { "path": "/api/cron/lce-maintenance?task=stale", "schedule": "0 6 * * *" },
    { "path": "/api/cron/lce-maintenance?task=scores", "schedule": "0 5 * * *" },
    { "path": "/api/cron/lce-maintenance?task=exhausted", "schedule": "0 5 * * *" }
  ]
}
```

---

## 9. Database Schema Changes

### 9.1 Record Model Updates

```prisma
model Record {
  // ... existing fields ...

  // LCE v4.0 New Fields
  cadencePhase        String    @default("NEW")
  cadenceProgress     String?
  lastPhoneCalledId   String?
  phoneExhaustedAt    DateTime?
  blitzStartedAt      DateTime?
  temperatureStartedAt DateTime?
  queueTier           Int       @default(9)
  
  // New Indexes
  @@index([createdById, cadencePhase])
  @@index([createdById, queueTier])
  @@index([createdById, phoneExhaustedAt])
  @@index([cadencePhase, nextActionDue])
}
```

### 9.2 CadenceLog Model Updates

```prisma
model CadenceLog {
  // ... existing fields ...
  
  // LCE v4.0 New Fields
  phaseAtTime       String?
  stepAtTime        Int?
  phoneCalledId     String?
  phoneCalledNumber String?
  transitionReason  String?
  tierAtTime        Int?
}
```

### 9.3 Migration Command

```bash
npx prisma migrate dev --name lce_v4_fields
npx prisma db push
```

---

# PART C: FRONTEND IMPLEMENTATION

---

## 10. Phase 4: UI Components

**Timeline:** Week 4  
**Goal:** Create new UI components for LCE v4.0 visibility

### 10.1 Components Overview

```
src/components/dockinsight/
├── PhaseBadge.tsx           # NEW - Shows current phase
├── CadenceProgressBar.tsx   # UPDATE - Enhanced progress bar
├── PhoneList.tsx            # UPDATE - With recommendation highlight
├── PhoneExhaustedAlert.tsx  # NEW - Alert when no phones
├── CadenceHistoryPanel.tsx  # NEW - Collapsible history
├── QueueTierBadge.tsx       # NEW - Shows tier 1-9
├── ReEnrollmentInfo.tsx     # NEW - Shows re-enrollment status
└── SnoozeDropdown.tsx       # UPDATE - Shows return date
```

### 10.2 Component Task Checklist

#### 10.2.1 `PhaseBadge.tsx` (NEW)
- [ ] Create component with phase prop
- [ ] Add icon and color for each phase
- [ ] Support sm/md/lg sizes

**Phase Colors:**
```typescript
const PHASE_CONFIG = {
  NEW:          { icon: '✨', color: 'blue', label: 'New Lead' },
  BLITZ_1:      { icon: '⚡', color: 'yellow', label: 'Blitz 1' },
  DEEP_PROSPECT:{ icon: '📱', color: 'purple', label: 'Get Numbers' },
  BLITZ_2:      { icon: '⚡', color: 'orange', label: 'Blitz 2' },
  TEMPERATURE:  { icon: '🌡️', color: 'dynamic', label: 'Cadence' },
  COMPLETED:    { icon: '⏳', color: 'gray', label: 'Completed' },
  ENGAGED:      { icon: '✅', color: 'green', label: 'Engaged' },
  NURTURE:      { icon: '🌱', color: 'teal', label: 'Nurture' },
}
```

#### 10.2.2 `CadenceProgressBar.tsx` (UPDATE)
- [ ] Add phase badge integration
- [ ] Add step markers (dots)
- [ ] Add "due today" / "overdue" indicator
- [ ] Add enrollment count display

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [⚡ BLITZ_1] [ACTIVE ▶]                    Step 2 of 3 • #1/6  │
│ ●━━━━━━━━━━●━━━━━━━━━━○                                        │
│ Day 1      Day 2      Day 3                                    │
│            ↑ TODAY                                              │
│ 📅 Next: CALL due TODAY                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.3 `PhoneList.tsx` (UPDATE)
- [ ] Add "RECOMMENDED" highlight on best phone
- [ ] Add phone status badges
- [ ] Add attempt count per phone
- [ ] Add last outcome per phone
- [ ] Gray out bad phones

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📱 Phones (3)                                                   │
├─────────────────────────────────────────────────────────────────┤
│ ⭐ (214) 555-1234  [MOBILE] [VALID]     2 attempts             │
│    Last: Voicemail on Jan 23                                   │
│    [📞 CALL THIS]  [❌ Bad]  [🚫 DNC]        ← RECOMMENDED     │
├─────────────────────────────────────────────────────────────────┤
│    (972) 555-5678  [LANDLINE] [UNVERIFIED]  0 attempts         │
│    [📞 Call]  [❌ Bad]  [🚫 DNC]                               │
├─────────────────────────────────────────────────────────────────┤
│ ❌ (469) 555-9999  [MOBILE] [WRONG]     1 attempt              │
│    [Cannot call - marked as wrong number]                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.4 `PhoneExhaustedAlert.tsx` (NEW)
- [ ] Create alert component
- [ ] Show list of bad phones
- [ ] Add skip trace and skip buttons

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ ALL PHONES EXHAUSTED                                         │
├─────────────────────────────────────────────────────────────────┤
│ All 3 phone numbers are marked as bad:                         │
│ ❌ (214) 555-1234 - Wrong Number                               │
│ ❌ (972) 555-5678 - Disconnected                               │
│ ❌ (469) 555-9999 - DNC                                        │
│                                                                 │
│ 💡 This lead needs new phone numbers via skip trace            │
│ [🔍 Request Skip Trace]  [⏭️ Skip for Now]                     │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.5 `CadenceHistoryPanel.tsx` (NEW)
- [ ] Create collapsible panel
- [ ] Show recent cadence activity
- [ ] Include phone called, outcome, phase/step

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📜 Cadence History                                    [▼ Hide] │
├─────────────────────────────────────────────────────────────────┤
│ Jan 23, 2:30 PM  │ Called (214) 555-1234 → Voicemail           │
│                  │ Step 2 of 3 (BLITZ_1)                       │
├─────────────────────────────────────────────────────────────────┤
│ Jan 22, 10:15 AM │ Called (214) 555-1234 → No Answer           │
│                  │ Step 1 of 3 (BLITZ_1)                       │
├─────────────────────────────────────────────────────────────────┤
│ Jan 22, 9:00 AM  │ Auto-enrolled into BLITZ_1                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.6 `QueueTierBadge.tsx` (NEW)
- [ ] Create badge with tier number and icon
- [ ] Color-code by tier

**Design:**
```
[T1 🔔]  ← Red (Callbacks)
[T2 ⚡]  ← Yellow (New leads)
[T3 🔥]  ← Orange (Blitz)
[T4 ✅]  ← Blue (Tasks)
[T5 📞]  ← Green (Cadence)
[T6 📋]  ← Gray (Queue)
[T7 🔍]  ← Purple (Verify)
[T8 📱]  ← Pink (Get Numbers)
[T9 🌱]  ← Teal (Nurture)
```

#### 10.2.7 `ReEnrollmentInfo.tsx` (NEW)
- [ ] Show enrollment count
- [ ] Show re-enrollment date
- [ ] Add force re-enroll button

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 Re-enrollment Status                                         │
├─────────────────────────────────────────────────────────────────┤
│ Enrollment: #2 of 6 max                                        │
│ Status: Waiting for re-enrollment                              │
│ Re-enrolls: January 30, 2026 (6 days)                         │
│ [🔄 Re-enroll Now]                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.8 `SnoozeDropdown.tsx` (UPDATE)
- [ ] Show return date/time for each option
- [ ] Add custom date picker option

**Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ Snooze                                                  [▼] │
├─────────────────────────────────────────────────────────────────┤
│ ○ 1 hour      → Returns at 3:30 PM today                       │
│ ○ Tomorrow    → Returns Jan 25 at 9:00 AM                      │
│ ○ 3 days      → Returns Jan 27 at 9:00 AM                      │
│ ○ 1 week      → Returns Jan 31 at 9:00 AM                      │
│ ─────────────────────────────────────────                      │
│ ○ Custom...   → Pick date and time                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Phase 5: UI Integration

**Timeline:** Week 4-5  
**Goal:** Integrate new components into existing UI

### 11.1 Files to Update

#### 11.1.1 `NextUpCard.tsx`
- [ ] Add `PhaseBadge` next to score
- [ ] Replace progress bar with enhanced `CadenceProgressBar`
- [ ] Replace phone section with enhanced `PhoneList`
- [ ] Add `PhoneExhaustedAlert` when applicable
- [ ] Add `CadenceHistoryPanel` (collapsible)
- [ ] Add `QueueTierBadge` to header
- [ ] Update snooze to use `SnoozeDropdown`

**Updated Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔥 NEXT UP  Call Now • 377 remaining   [T2 ⚡] [Medium] [72]   │
├─────────────────────────────────────────────────────────────────┤
│ [⚡ BLITZ_1] [ACTIVE ▶]                    Step 2 of 3 • #1/6  │
│ ●━━━━━━━━━━●━━━━━━━━━━○                                        │
│ 📅 Next: CALL due TODAY                                        │
├─────────────────────────────────────────────────────────────────┤
│ 📍 123 Main St, Dallas, TX                                     │
│ 👤 John Smith                          [Status ▼] [Result ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ 📱 Phones (3)                                                   │
│ ⭐ (214) 555-1234 [MOBILE] [VALID]  [📞 CALL THIS] ← RECOMMENDED│
│    (972) 555-5678 [LANDLINE] [UNVERIFIED]  [📞] [❌] [🚫]     │
│ ❌ (469) 555-9999 [MOBILE] [WRONG]                             │
├─────────────────────────────────────────────────────────────────┤
│ Why This Lead:                                                  │
│ • Hot Lead (+40) • Blitz Phase (+15) • Code Violation (+10)    │
├─────────────────────────────────────────────────────────────────┤
│ 📜 Cadence History                                    [▼ Show] │
├─────────────────────────────────────────────────────────────────┤
│ [📞 CALL]  [⏭ SKIP]  [⏰ SNOOZE ▼]  [⏸ PAUSE]  [✓ COMPLETE]  │
└─────────────────────────────────────────────────────────────────┘
```

#### 11.1.2 `QueueList.tsx`
- [ ] Add phase badge column
- [ ] Add tier badge column
- [ ] Add phone status indicator

**Updated Row:**
```
[T2] [⚡ BLITZ] 123 Main St, Dallas  John Smith   [72] [📞]
```

#### 11.1.3 `BucketSelector.tsx`
- [ ] Add tier breakdown tooltip
- [ ] Show sub-counts per tier

**Updated Tooltip:**
```
Call Now (12)
─────────────
🔔 3 Callbacks due
⚡ 5 New leads
🔥 4 Blitz follow-ups
```

#### 11.1.4 `RecordDrawer.tsx`
- [ ] Add full LCE status panel
- [ ] Add `ReEnrollmentInfo` for completed leads
- [ ] Add `CadenceHistoryPanel` (full history)
- [ ] Add manual actions (force re-enroll)

---

## 12. Component Specifications

### 12.1 Shared Types

```typescript
// src/types/lce.ts

export type CadencePhase = 
  | 'NEW' | 'BLITZ_1' | 'DEEP_PROSPECT' | 'BLITZ_2'
  | 'TEMPERATURE' | 'COMPLETED' | 'ENGAGED' | 'NURTURE'

export type CadenceState = 
  | 'NOT_ENROLLED' | 'ACTIVE' | 'SNOOZED' | 'PAUSED'
  | 'COMPLETED_NO_CONTACT' | 'EXITED_ENGAGED' | 'EXITED_DNC'
  | 'EXITED_DEAD' | 'EXITED_CLOSED' | 'STALE_ENGAGED' | 'LONG_TERM_NURTURE'

export type PhoneStatus = 'VALID' | 'UNVERIFIED' | 'WRONG' | 'DISCONNECTED' | 'DNC'

export interface LCEStatus {
  phase: CadencePhase
  state: CadenceState
  cadenceType: string | null
  step: number
  totalSteps: number
  progress: string
  nextActionDue: Date | null
  nextActionType: string
  enrollmentCount: number
  queueTier: number
  queueBucket: string
}

export interface Phone {
  id: string
  number: string
  type: string
  status: PhoneStatus
  isPrimary: boolean
  attemptCount: number
  lastAttemptAt: Date | null
  lastOutcome: string | null
  isRecommended?: boolean
}
```

### 12.2 Color Palette

```typescript
// src/lib/lce-colors.ts

export const PHASE_COLORS = {
  NEW:           { bg: 'bg-blue-100', text: 'text-blue-700' },
  BLITZ_1:       { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  DEEP_PROSPECT: { bg: 'bg-purple-100', text: 'text-purple-700' },
  BLITZ_2:       { bg: 'bg-orange-100', text: 'text-orange-700' },
  TEMPERATURE:   { bg: 'dynamic', text: 'dynamic' },
  COMPLETED:     { bg: 'bg-gray-100', text: 'text-gray-700' },
  ENGAGED:       { bg: 'bg-green-100', text: 'text-green-700' },
  NURTURE:       { bg: 'bg-teal-100', text: 'text-teal-700' },
}

export const TIER_COLORS = {
  1: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔔' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⚡' },
  3: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🔥' },
  4: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✅' },
  5: { bg: 'bg-green-100', text: 'text-green-700', icon: '📞' },
  6: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' },
  7: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔍' },
  8: { bg: 'bg-pink-100', text: 'text-pink-700', icon: '📱' },
  9: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '🌱' },
}

export const PHONE_STATUS_COLORS = {
  VALID:        { bg: 'bg-green-100', text: 'text-green-700' },
  UNVERIFIED:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  WRONG:        { bg: 'bg-red-100', text: 'text-red-700' },
  DISCONNECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  DNC:          { bg: 'bg-gray-100', text: 'text-gray-700' },
}
```

---

# PART D: DEPLOYMENT

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Module | Test Cases |
|--------|------------|
| `phase-manager` | Phase transitions, edge cases |
| `cadence-manager` | Step advancement, due dates |
| `queue-manager` | Tier assignment, sorting |
| `phone-manager` | Rotation, exhaustion |
| `result-handler` | Result type mapping |

### 13.2 Integration Tests

| Flow | Test Cases |
|------|------------|
| New Lead Import | Import → Auto-enroll → BLITZ_1 |
| Call Flow | Call → Result → Phase transition → Queue update |
| Phone Rotation | No answer x2 → Rotate → Exhaustion |
| Re-enrollment | Complete → Wait → Re-enroll |
| Snooze | Snooze → Cron expire → Return to queue |

### 13.3 Edge Cases

- [ ] Record with no phones
- [ ] Record with all DNC phones
- [ ] Record at max enrollment cycles (6)
- [ ] Callback scheduled for past date
- [ ] Concurrent calls to same record
- [ ] Snooze during blitz phase
- [ ] Pause during temperature cadence
- [ ] New phone added during DEEP_PROSPECT

---

## 14. Migration Plan

### 14.1 Pre-Migration

1. **Backup database**
2. **Deploy schema changes** (new fields with defaults)
3. **Deploy backend code** (inactive, behind feature flag)

### 14.2 Migration Script

```typescript
async function migrateToLCEv4() {
  const records = await prisma.record.findMany({
    where: { cadencePhase: null },
    include: { phoneNumbers: true }
  })
  
  for (const record of records) {
    // Determine phase from current state
    let phase = 'NEW'
    if (record.cadenceState === 'EXITED_ENGAGED') phase = 'ENGAGED'
    else if (record.cadenceState === 'LONG_TERM_NURTURE') phase = 'NURTURE'
    else if (record.cadenceState === 'COMPLETED_NO_CONTACT') phase = 'COMPLETED'
    else if (record.currentPhase === 'BLITZ_1') phase = 'BLITZ_1'
    else if (record.currentPhase === 'DEEP_PROSPECT') phase = 'DEEP_PROSPECT'
    else if (record.currentPhase === 'BLITZ_2') phase = 'BLITZ_2'
    else if (record.cadenceType) phase = 'TEMPERATURE'
    
    // Calculate progress
    const progress = record.cadenceStep && record.totalSteps 
      ? `${record.cadenceStep}/${record.totalSteps}` : null
    
    // Check phone exhaustion
    const validPhones = record.phoneNumbers.filter(p => 
      p.phoneStatus === 'VALID' || p.phoneStatus === 'UNVERIFIED'
    )
    const phoneExhausted = record.phoneNumbers.length > 0 && validPhones.length === 0
    
    // Assign queue tier
    const queueTier = assignQueueTier(record)
    
    await prisma.record.update({
      where: { id: record.id },
      data: { cadencePhase: phase, cadenceProgress: progress, 
              phoneExhaustedAt: phoneExhausted ? new Date() : null, queueTier }
    })
  }
}
```

### 14.3 Post-Migration

1. **Enable feature flag**
2. **Monitor logs**
3. **Verify queue accuracy**
4. **Check cron job execution**
5. **Gather user feedback**

---

## 15. Rollout Checklist

### 15.1 Backend Checklist

- [ ] All v4 modules created and tested
- [ ] API endpoints updated
- [ ] Cron jobs configured in vercel.json
- [ ] Database migration applied
- [ ] Backfill script run successfully
- [ ] Feature flag enabled

### 15.2 Frontend Checklist

- [ ] `PhaseBadge` component created
- [ ] `CadenceProgressBar` updated
- [ ] `PhoneList` updated with recommendation
- [ ] `PhoneExhaustedAlert` created
- [ ] `CadenceHistoryPanel` created
- [ ] `QueueTierBadge` created
- [ ] `ReEnrollmentInfo` created
- [ ] `SnoozeDropdown` updated
- [ ] `NextUpCard` integrated
- [ ] `QueueList` integrated
- [ ] `BucketSelector` integrated
- [ ] `RecordDrawer` integrated
- [ ] Dark mode tested
- [ ] Mobile responsive tested

### 15.3 Final Verification

- [ ] New lead import → auto-enrolls into BLITZ_1
- [ ] Call logging → phase transitions correctly
- [ ] Phone rotation → recommends correct phone
- [ ] Phone exhaustion → moves to GET_NUMBERS
- [ ] Snooze → expires and returns to queue
- [ ] Re-enrollment → triggers after wait period
- [ ] Queue → sorted by tier then score
- [ ] UI → shows all LCE information correctly

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

## Appendix B: Glossary

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
