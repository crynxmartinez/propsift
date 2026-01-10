# LCE v2.4 - Lead Cadence Engine Specification

## Overview

**Lead Cadence Engine (LCE)** is an intelligent system that automatically manages when and how to contact leads based on 4 core factors:

1. **Temperature** - Contact intensity (HOT, WARM, COLD, ICE)
2. **Cadence** - Step-by-step contact schedule
3. **Call Result** - What happened on the call
4. **Status** - Lead's current disposition

### Design Philosophy

- **Never give up** - Leads stay in rotation until DNC or deal
- **Smart persistence** - 7-touch rule ensures proper follow-up
- **Data quality loop** - Bad numbers → Get Numbers → Back to cadence
- **User control** - Custom statuses/results with defined behaviors

---

## The 4 Core Factors

---

### FACTOR 1: TEMPERATURE

Temperature determines how aggressively we pursue a lead.

| Temperature | Description | Cadence Length | Total Days |
|-------------|-------------|----------------|------------|
| **HOT** | High motivation, urgent situation | 7 steps | 14 days |
| **WARM** | Good potential, moderate urgency | 5 steps | 21 days |
| **COLD** | Lower priority, long-term potential | 3 steps | 45 days |
| **ICE** | Minimal engagement, keep in rotation | 2 steps | 60 days |
| **LTN** | Long Term Nurture, exhausted all cycles | 1 step | 180 days (6 months) |

#### Temperature Assignment Rules

- **Initial assignment** - Based on motivations/data quality when lead enters system
- **Upgrade** - When status = "Interested" (check current temp, move up one level)
- **Downgrade** - When status = "Not Interested" (check current temp, move down one level)
- **Auto-downgrade** - After completing 2 full cadence cycles without contact

#### Temperature Flow

```
INTERESTED (Upgrade):
  ICE → COLD → WARM → HOT (max)
  Restarts cadence from Step 1

NOT INTERESTED (Downgrade):
  HOT → WARM → COLD → ICE → LTN
  Continues cadence (doesn't restart)

NO CONTACT after 2 cycles (Auto-downgrade):
  HOT (2 cycles = 14 attempts) → WARM
  WARM (2 cycles = 10 attempts) → COLD
  COLD (2 cycles = 6 attempts) → ICE
  ICE (2 cycles = 4 attempts) → LTN
```

---

### FACTOR 2: CADENCE

Cadence is the step-by-step schedule for contacting a lead.

#### HOT Cadence (7 Steps, 14 Days)

| Step | Day | Description | What Happens |
|------|-----|-------------|--------------|
| 1 | 0 | Initial call | First contact attempt |
| 2 | 1 | Quick follow-up | Next day persistence |
| 3 | 2 | Third attempt | Building familiarity |
| 4 | 4 | Persistence call | 2-day gap |
| 5 | 6 | Fifth attempt | Continued effort |
| 6 | 9 | Re-attempt | 3-day gap |
| 7 | 14 | Final attempt | Last chance this cycle |

#### WARM Cadence (5 Steps, 21 Days)

| Step | Day | Description |
|------|-----|-------------|
| 1 | 0 | Initial call |
| 2 | 3 | Follow-up call |
| 3 | 7 | Check-in call |
| 4 | 14 | Re-engage call |
| 5 | 21 | Final attempt |

#### COLD Cadence (3 Steps, 45 Days)

| Step | Day | Description |
|------|-----|-------------|
| 1 | 0 | Initial call |
| 2 | 14 | Follow-up call |
| 3 | 45 | Final attempt |

#### ICE Cadence (2 Steps, 60 Days)

| Step | Day | Description |
|------|-----|-------------|
| 1 | 0 | Check-in call |
| 2 | 60 | Re-engagement call |

#### LTN Cadence (1 Step, 180 Days)

| Step | Day | Description |
|------|-----|-------------|
| 1 | 180 | Semi-annual check-in |

#### Cadence Rules

- Each step has a **due date** calculated from cadence start
- Lead appears in queue when **due date arrives**
- If due date is in the past, lead appears **immediately**
- Completing all steps = **cadence complete** → check for re-enrollment or downgrade

---

### FACTOR 3: CALL RESULT

Call Result is what happened when you attempted contact.

#### Call Result Types (resultType field)

| Type | Description | Cadence Behavior |
|------|-------------|------------------|
| **NO_CONTACT** | Didn't reach them | Advance to next step |
| **RETRY** | Temporary issue | Stay on same step, retry tomorrow |
| **CONTACT_MADE** | Spoke with them | Exit cadence flow, status determines next |
| **BAD_DATA** | Phone number is bad | Pause cadence, move to Get Numbers |
| **TERMINAL** | Never contact again | Exit cadence permanently |

#### Default Call Results

| Call Result | resultType | What Happens |
|-------------|------------|--------------|
| **No Answer** | NO_CONTACT | Advance to next cadence step |
| **Voicemail** | NO_CONTACT | Advance to next cadence step |
| **Left Message** | NO_CONTACT | Advance to next cadence step |
| **Busy** | RETRY | Stay on same step, retry tomorrow |
| **Answered** | CONTACT_MADE | Prompt for status selection |
| **Wrong Number** | BAD_DATA | Mark phone bad, move to Get Numbers |
| **Disconnected** | BAD_DATA | Mark phone bad, move to Get Numbers |
| **DNC Requested** | TERMINAL | Exit permanently, mark as DNC |

#### User-Created Call Results

Users can create custom call results and assign a `resultType`:

- "Callback Requested" → CONTACT_MADE
- "Hung Up" → CONTACT_MADE
- "Language Barrier" → NO_CONTACT
- "Fax Machine" → BAD_DATA

---

### FACTOR 4: STATUS

Status is the lead's current disposition in your pipeline.

#### Status Workability Types

| Workability | Description | Cadence Behavior |
|-------------|-------------|------------------|
| **WORKABLE** | Can be contacted | Continue/restart cadence |
| **PAUSED** | Temporarily on hold | Pause cadence until date |
| **CLOSED_WON** | Deal success | Exit cadence - celebrate! |
| **CLOSED_LOST** | Not a viable lead | Move to Long Term Nurture |
| **DNC** | Do Not Contact | Exit permanently |

#### Status Temperature Effect

| Effect | Description | When Applied |
|--------|-------------|--------------|
| **UPGRADE** | Move up one temperature level | When status selected |
| **DOWNGRADE** | Move down one temperature level | When status selected |
| **null** | No temperature change | Default |

#### Default Statuses

| Status | Workability | Temp Effect | What Happens |
|--------|-------------|-------------|--------------|
| **New Lead** | WORKABLE | null | Start/continue cadence normally |
| **Follow Up** | WORKABLE | null | Continue cadence normally |
| **Attempting Contact** | WORKABLE | null | Continue cadence normally |
| **Contacted** | WORKABLE | null | Continue cadence normally |
| **Interested** | WORKABLE | UPGRADE | Upgrade temp, restart cadence |
| **Not Interested** | WORKABLE | DOWNGRADE | Downgrade temp, continue cadence |
| **Callback Scheduled** | PAUSED | null | Pause until callback date |
| **Under Contract** | CLOSED_WON | null | Exit cadence - SUCCESS! |
| **Sold** | CLOSED_WON | null | Exit cadence - SUCCESS! |
| **Dead** | CLOSED_LOST | null | Move to Long Term Nurture |
| **DNC** | DNC | null | Exit permanently |

#### User-Created Statuses

Users can create custom statuses and assign workability + temp effect:

- "Hot Lead" → WORKABLE, UPGRADE
- "Tire Kicker" → WORKABLE, DOWNGRADE
- "Pending Probate" → PAUSED, null
- "Listed with Agent" → CLOSED_LOST, null

---

## Complete Flow Diagrams

### 1. Lead Enters System

```
New lead imported/created
         │
         ▼
┌─────────────────────────────────────┐
│ INITIAL ASSESSMENT                  │
├─────────────────────────────────────┤
│ 1. Check phone numbers              │
│    - Has valid phone? → Continue    │
│    - No phone? → "Get Numbers"      │
│                                     │
│ 2. Assign initial temperature       │
│    - Based on motivations/data      │
│    - HOT: Foreclosure, Probate      │
│    - WARM: Absentee, Vacant         │
│    - COLD: Default                  │
│                                     │
│ 3. Enroll in cadence                │
│    - Set cadenceStep = 1            │
│    - Set nextActionDue = Today      │
│    - Set cadenceState = ACTIVE      │
│                                     │
│ 4. Calculate priority score         │
│    - Temperature + Motivations +    │
│      Recency + Data Quality         │
└─────────────────────────────────────┘
         │
         ▼
    Lead appears in queue
```

### 2. Lead Appears in Queue

```
┌─────────────────────────────────────┐
│ QUEUE POSITIONING                   │
├─────────────────────────────────────┤
│ Sort by:                            │
│ 1. nextActionDue (due first = top)  │
│ 2. Priority score (higher = top)    │
│ 3. Created date (older = top)       │
│                                     │
│ Assign to bucket:                   │
│ - Call Now: Score ≥90, due today    │
│ - Call Queue: Score 50-89           │
│ - Nurture: Score <50                │
│ - Get Numbers: No valid phone       │
│ - Not Workable: DNC/Closed          │
└─────────────────────────────────────┘
         │
         ▼
    User sees lead in DockInsight
```

### 3. User Makes Call

```
User clicks CALL button
         │
         ▼
┌─────────────────────────────────────┐
│ CALL LOGGED                         │
├─────────────────────────────────────┤
│ - callAttempts++                    │
│ - lastContactedAt = now             │
│ - Log contact in history            │
└─────────────────────────────────────┘
         │
         ▼
    User selects CALL RESULT
```

### 4. Call Result Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CALL RESULT SELECTED                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┬─────────────────┬──────────────┐
         ▼                 ▼                 ▼                 ▼              ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ NO_CONTACT  │   │   RETRY     │   │CONTACT_MADE │   │  BAD_DATA   │   │  TERMINAL   │
│ No Answer   │   │   Busy      │   │  Answered   │   │ Wrong #     │   │    DNC      │
│ Voicemail   │   │             │   │             │   │ Disconn.    │   │             │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ ADVANCE     │   │ STAY        │   │ PROMPT FOR  │   │ PAUSE       │   │ EXIT        │
│ cadenceStep │   │ same step   │   │ STATUS      │   │ cadence     │   │ permanently │
│ ++          │   │ retry       │   │ selection   │   │             │   │             │
│             │   │ tomorrow    │   │             │   │ Mark phone  │   │ Mark as     │
│ Calculate   │   │             │   │             │   │ as BAD      │   │ DNC         │
│ next due    │   │ nextAction  │   │             │   │             │   │             │
│ date        │   │ Due =       │   │             │   │ Move to     │   │ Never       │
│             │   │ tomorrow    │   │             │   │ "Get        │   │ contact     │
│             │   │             │   │             │   │ Numbers"    │   │ again       │
└──────┬──────┘   └─────────────┘   └──────┬──────┘   └─────────────┘   └─────────────┘
       │                                   │
       ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHECK: Is this the FINAL STEP of cadence?                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ NO (more steps remaining):                                                   │
│   → Set nextActionDue based on next step's dayOffset                         │
│   → Lead returns to queue when due                                           │
│                                                                              │
│ YES (final step completed):                                                  │
│   → Cadence COMPLETE                                                         │
│   → Check enrollmentCount for this temperature:                              │
│                                                                              │
│     enrollmentCount < 2:                                                     │
│       → Re-enroll in SAME temperature cadence                                │
│       → enrollmentCount++                                                    │
│       → Reset to step 1                                                      │
│                                                                              │
│     enrollmentCount >= 2:                                                    │
│       → DOWNGRADE temperature                                                │
│       → HOT → WARM → COLD → ICE → LTN                                        │
│       → Reset enrollmentCount = 0                                            │
│       → Enroll in new temperature's cadence                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. Status Processing (After CONTACT_MADE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STATUS SELECTED                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┬─────────────────┬──────────────┐
         ▼                 ▼                 ▼                 ▼              ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  WORKABLE   │   │  WORKABLE   │   │   PAUSED    │   │ CLOSED_WON  │   │CLOSED_LOST  │
│  (neutral)  │   │ (temp chg)  │   │             │   │             │   │   or DNC    │
│ Follow Up   │   │ Interested  │   │ Callback    │   │ Under       │   │ Dead        │
│ Contacted   │   │ Not Inter.  │   │ Scheduled   │   │ Contract    │   │ DNC         │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Continue    │   │ INTERESTED: │   │ PAUSE       │   │ EXIT        │   │ EXIT        │
│ cadence     │   │ Check temp  │   │ cadence     │   │ cadence     │   │ cadence     │
│ normally    │   │ ICE→COLD    │   │             │   │             │   │             │
│             │   │ COLD→WARM   │   │ Set         │   │ Mark as     │   │ DNC: Never  │
│ Advance to  │   │ WARM→HOT    │   │ nextAction  │   │ SUCCESS!    │   │ contact     │
│ next step   │   │ HOT→HOT     │   │ Due =       │   │             │   │             │
│             │   │             │   │ callback    │   │ 🎉          │   │ CLOSED_LOST:│
│             │   │ RESTART     │   │ date        │   │             │   │ → LTN       │
│             │   │ cadence     │   │             │   │             │   │ (6 month    │
│             │   │ from step 1 │   │             │   │             │   │ check-in)   │
│             │   │             │   │             │   │             │   │             │
│             │   │ NOT INTER.: │   │             │   │             │   │             │
│             │   │ Check temp  │   │             │   │             │   │             │
│             │   │ HOT→WARM    │   │             │   │             │   │             │
│             │   │ WARM→COLD   │   │             │   │             │   │             │
│             │   │ COLD→ICE    │   │             │   │             │   │             │
│             │   │ ICE→LTN     │   │             │   │             │   │             │
│             │   │             │   │             │   │             │   │             │
│             │   │ CONTINUE    │   │             │   │             │   │             │
│             │   │ cadence     │   │             │   │             │   │             │
│             │   │ (don't      │   │             │   │             │   │             │
│             │   │ restart)    │   │             │   │             │   │             │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

---

## Get Numbers Flow (Bad Data Path)

```
Wrong Number / Disconnected selected
         │
         ▼
┌─────────────────────────────────────┐
│ BAD DATA HANDLING                   │
├─────────────────────────────────────┤
│ 1. Mark current phone as BAD        │
│    - Add "Wrong Number" or          │
│      "Disconnected" to phone status │
│                                     │
│ 2. Check for other phone numbers    │
│    - Has other valid phones?        │
│      → Try next phone, continue     │
│    - No other phones?               │
│      → Move to "Get Numbers" bucket │
│                                     │
│ 3. Pause cadence                    │
│    - cadenceState = PAUSED          │
│    - Waiting for new number         │
│                                     │
│ 4. Flag for skiptrace               │
│    - Needs new phone lookup         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ AFTER NEW NUMBER ADDED              │
├─────────────────────────────────────┤
│ 1. Resume cadence                   │
│    - cadenceState = ACTIVE          │
│                                     │
│ 2. Option A: Continue where left    │
│    - Same step, same cadence        │
│                                     │
│ 3. Option B: Restart cadence        │
│    - Fresh start with new number    │
│    - (configurable per account)     │
└─────────────────────────────────────┘
```

---

## Long Term Nurture (LTN) Pool

Leads that exhaust all temperature cycles end up here.

```
┌─────────────────────────────────────┐
│ LONG TERM NURTURE                   │
├─────────────────────────────────────┤
│ How leads get here:                 │
│ - ICE temp + 2 cycles complete      │
│ - Status = "Dead" or "CLOSED_LOST"  │
│ - "Not Interested" when already ICE │
│                                     │
│ Cadence:                            │
│ - 1 call every 6 months             │
│ - Indefinitely (until DNC or deal)  │
│                                     │
│ Can be RESCUED if:                  │
│ - New motivation added              │
│ - Property status changes           │
│ - User manually upgrades temp       │
│ - New data from skiptrace           │
│                                     │
│ Rescue = Re-enroll in appropriate   │
│ temperature cadence based on new    │
│ data/motivations                    │
└─────────────────────────────────────┘
```

---

## Priority Score Calculation

```
BASE SCORE = 0

// TEMPERATURE (0-40 points)
HOT:  +40
WARM: +25
COLD: +10
ICE:  +5
LTN:  +2

// MOTIVATIONS (0-60+ points, stacking)
First motivation:  +15
Second motivation: +12
Third motivation:  +10
Each additional:   +5

// SYNERGY BONUSES
Foreclosure + Absentee:    +10
Probate + Vacant:          +10
Code Violation + Tired LL: +8

// RECENCY FACTORS
Never contacted:           +15 (New Lead bonus)
Last contact > 30 days:    +10 (Smart Rescue)
Last contact < 3 days:     -20 (Fatigue penalty)

// CADENCE POSITION
Due today:                 +20
Overdue:                   +25
Not due yet:               -10

// DATA QUALITY
Has mobile phone:          +10
Has multiple phones:       +5
Has email:                 +5
No valid phone:            -50 (→ Get Numbers)

// ENGAGEMENT HISTORY
Has engaged before:        +15
Answered call before:      +10
Never answered (5+ tries): -10

// STATUS MODIFIERS
"Interested" status:       +20
"Callback Scheduled" due:  +30
"Not Interested":          -15

FINAL SCORE = Sum of all factors
```

---

## Bucket Assignment Logic

| Bucket | Criteria | Priority |
|--------|----------|----------|
| **Call Now** | Score ≥90 AND due today AND has callable phone | 1 (highest) |
| **Follow Up** | Has task due today/overdue | 2 |
| **Call Queue** | Score 50-89 AND has callable phone | 3 |
| **Verify First** | Score ≥70 but low data confidence | 4 |
| **Get Numbers** | No valid phone OR all phones marked bad | 5 |
| **Nurture** | Score <50 AND workable status | 6 |
| **Not Workable** | DNC OR CLOSED_WON OR CLOSED_LOST | 7 (lowest) |

---

## Database Schema Changes

### CallResult Model (Add resultType)

```prisma
model CallResult {
  id              String   @id @default(cuid())
  name            String
  color           String   @default("#6B7280")
  isActive        Boolean  @default(true)
  order           Int      @default(0)
  
  // NEW FIELD
  resultType      String   @default("NO_CONTACT")
  // Values: NO_CONTACT, RETRY, CONTACT_MADE, BAD_DATA, TERMINAL
  
  ownerId         String
  owner           User     @relation(...)
}
```

### Status Model (Add workability + temperatureEffect)

```prisma
model Status {
  id              String   @id @default(cuid())
  name            String
  color           String   @default("#6B7280")
  isActive        Boolean  @default(true)
  order           Int      @default(0)
  
  // NEW FIELDS
  workability     String   @default("WORKABLE")
  // Values: WORKABLE, PAUSED, CLOSED_WON, CLOSED_LOST, DNC
  
  temperatureEffect String? @default(null)
  // Values: null, UPGRADE, DOWNGRADE
  
  ownerId         String
  owner           User     @relation(...)
}
```

### Record Model (Existing cadence fields)

```prisma
model Record {
  // Cadence tracking (already exists)
  cadenceState      String?   // ACTIVE, PAUSED, COMPLETED_NO_CONTACT, etc.
  cadenceType       String?   // HOT, WARM, COLD, ICE, LTN
  cadenceStep       Int?      // Current step (1-7 for HOT, etc.)
  cadenceStartDate  DateTime? // When current cadence started
  nextActionType    String?   // CALL (for now, future: SMS, RVM)
  nextActionDue     DateTime? // When next action is due
  enrollmentCount   Int       @default(0) // Cycles in current temp
  
  // Contact tracking (already exists)
  callAttempts      Int       @default(0)
  lastContactedAt   DateTime?
  lastContactResult String?
  lastContactType   String?
}
```

---

## Default Data Migration

### Call Results (set resultType for existing)

| Call Result | resultType |
|-------------|------------|
| No Answer | NO_CONTACT |
| Voicemail | NO_CONTACT |
| Left Message | NO_CONTACT |
| Busy | RETRY |
| Answered | CONTACT_MADE |
| Wrong Number | BAD_DATA |
| Disconnected | BAD_DATA |
| DNC | TERMINAL |

### Statuses (set workability + temperatureEffect for existing)

| Status | workability | temperatureEffect |
|--------|-------------|-------------------|
| New Lead | WORKABLE | null |
| Follow Up | WORKABLE | null |
| Attempting Contact | WORKABLE | null |
| Contacted | WORKABLE | null |
| Interested | WORKABLE | UPGRADE |
| Not Interested | WORKABLE | DOWNGRADE |
| Callback Scheduled | PAUSED | null |
| Under Contract | CLOSED_WON | null |
| Sold | CLOSED_WON | null |
| Dead | CLOSED_LOST | null |
| DNC | DNC | null |

---

## Contact Attempt Maximums

| Temperature Path | Total Attempts Before LTN |
|------------------|---------------------------|
| HOT → WARM → COLD → ICE | 7×2 + 5×2 + 3×2 + 2×2 = **34 attempts** |
| Direct to COLD → ICE | 3×2 + 2×2 = **10 attempts** |
| LTN (ongoing) | 2 per year indefinitely |

**A HOT lead gets up to 34 contact attempts over ~280 days before going to Long Term Nurture. Then 2 attempts per year forever (until DNC or deal).**

---

## Industry Best Practices Incorporated

### 1. The 7-Touch Rule
Research shows it takes 7+ touches to convert a lead. Our cadence ensures minimum 7 attempts for HOT leads.

### 2. Multi-Channel Ready
Architecture supports CALL, SMS, RVM - ready for future integrations.

### 3. Recency Decay
Leads contacted recently have lower priority. This prevents over-calling.

### 4. Temperature-Based Intensity
HOT leads get aggressive follow-up (daily), COLD leads get spaced out (weeks).

### 5. Never Give Up (Until DNC)
"Not Interested" today might be "Interested" in 6 months. Keep them in rotation at lower temperature.

### 6. Data Quality Loop
Bad numbers → Get Numbers → Skiptrace → Back to cadence. No lead falls through cracks.

---

## Implementation Phases

| Phase | Task | Files |
|-------|------|-------|
| 1 | Schema changes | `prisma/schema.prisma` |
| 2 | Migration + defaults | Migration SQL |
| 3 | Update LCE logic | `src/lib/lce/*.ts` |
| 4 | Update call handler | `src/lib/lce/call-handler.ts` |
| 5 | Update status handler | New or existing handler |
| 6 | Settings UI | Status/CallResult management |
| 7 | Test & verify | All flows |
| 8 | Push to GitHub | Deploy |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.3.1 | Previous | Initial LCE implementation |
| v2.4 | Jan 2026 | Added resultType, workability, temperatureEffect; Enhanced cadence logic |
