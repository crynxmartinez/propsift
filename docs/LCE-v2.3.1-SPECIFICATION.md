# Lead Cadence Engine (LCE) v2.3.1
## PropSift Production-Ready Specification

**Version:** 2.3.1  
**Status:** Approved for Implementation  
**Last Updated:** January 10, 2026  
**Author:** PropSift Engineering

---

# TABLE OF CONTENTS

1. [Vision & Core Principles](#part-1-vision--core-principles)
2. [Global Definitions](#part-2-global-definitions)
3. [Priority Score System](#part-3-priority-score-system)
4. [Temperature Bands](#part-4-temperature-bands)
5. [State Machine](#part-5-state-machine)
6. [Cadence Templates & Scheduler](#part-6-cadence-templates--scheduler)
7. [Call Result Handling](#part-7-call-result-handling)
8. [Multi-Phone Handling](#part-8-multi-phone-handling)
9. [Re-Enrollment Engine](#part-9-re-enrollment-engine)
10. [Workability Gate](#part-10-workability-gate)
11. [DockInsight Queue](#part-11-dockinsight-queue)
12. [Daily Reconciliation](#part-12-daily-reconciliation)
13. [User Workspace Integration](#part-13-user-workspace-integration)
14. [Configuration & Customization](#part-14-configuration--customization)
15. [Metrics & Success Tracking](#part-15-metrics--success-tracking)
16. [Implementation Phases](#part-16-implementation-phases)

---

# PART 1: VISION & CORE PRINCIPLES

## What is LCE?

The **Lead Cadence Engine** is the intelligence behind PropSift's DockInsight. Every day, for every lead, it answers:

1. **WHO** should I contact? (Priority Scoring)
2. **WHEN** should I contact them? (Cadence Scheduling)
3. **WHAT** should I do next? (Action Routing)

**The Promise:** No lead ever falls through the cracks.

---

## The Problem LCE Solves

| Without LCE | With LCE |
|-------------|----------|
| User manually decides who to call | System surfaces the best next action |
| Leads get forgotten after a few tries | Leads stay in rotation until resolved |
| No structure for follow-up timing | Cadences enforce consistent outreach |
| Hot leads treated like cold leads | Scoring surfaces best opportunities first |
| Large lists overwhelm users | Daily queue stays actionable and focused |
| Leads slip through cracks | Reconciliation catches and fixes anomalies |

---

## Core Principles

1. **Single Source of Truth** — Priority Score is THE number. Temperature is a label derived from it.

2. **Deterministic Logic** — Same inputs always produce the same score (ordering rules included).

3. **State Machine Clarity** — Every lead has exactly one state. Transitions are explicit and logged.

4. **Action-Ready Queue** — DockInsight only shows actions the user can actually execute now.

5. **Self-Healing System** — Daily reconciliation catches and fixes anything that slipped.

6. **Anti-Gaming Guardrails** — Scoring rewards quality and discourages stacking weak signals.

7. **Graceful Degradation** — Missing channels don't break flow; the system routes to executable alternatives.

---

# PART 2: GLOBAL DEFINITIONS

These terms must be defined once and used everywhere consistently.

| Term | Definition |
|------|------------|
| **Valid Phone** | Not marked WRONG/DISCONNECTED/DNC and passes basic formatting check |
| **Verified Phone** | Confirmed by a real outcome (answered, real voicemail, or trusted provider verification flag) |
| **Callable Phone** | Valid + not blocked by compliance + within calling hours window (optional future) |
| **Unverified Phone** | Present but not confirmed |
| **Skiptrace Date** | Last enrichment timestamp (not record creation date) |
| **Contact** | Any attempted outreach (call, SMS, RVM, email) |
| **Engagement** | Two-way interaction where lead responded |
| **Outcome** | Result of a contact attempt (answered, voicemail, no answer, etc.) |

These definitions prevent contradictions like "Confidence HIGH" when all numbers are junk.

---

# PART 3: PRIORITY SCORE SYSTEM

## Philosophy

Priority Score is a single number (0–100+) representing how urgently a lead should be worked TODAY.

### Key Design Rules

- All components are additive (positive or negative)
- No double-counting between related penalties
- Score is versioned + timestamped
- Recalculation triggers are explicit
- Score is auditable via a stored breakdown

---

## Score Metadata (Required Fields)

Each calculated score stores:

| Field | Purpose |
|-------|---------|
| `priorityScore` | Final computed integer |
| `scoreComputedAt` | Timestamp (UTC) |
| `scoreVersion` | Algorithm version (e.g., "LCE_2_3_1") |
| `scoreBreakdown` | JSON map of component → points |
| `scoreInputsHash` | Stable hash of inputs (debugging determinism) - recommended |

---

## SCORE COMPONENTS

### Component 1: Motivation Score (Typical 0–60+, Low-urgency capped)

Motivations indicate seller urgency. Quality > quantity.

#### Base Points by Urgency Tier

| Tier | Motivations | Points Each |
|------|-------------|-------------|
| **Critical** | Foreclosure, Tax Lien, Code Violation, Bankruptcy | 12 |
| **High** | Probate, Divorce, Pre-Foreclosure, Liens, Judgment | 10 |
| **Medium** | Vacant, Tired Landlord, Out of State Owner, High Equity, Failed Listing | 7 |
| **Low** | Free & Clear, Long Ownership, Absentee, Senior Owner | 4 |

#### Deterministic Ordering Rule

Before applying diminishing returns:
1. Sort motivations by tier: Critical → High → Medium → Low
2. Within tier: sort by base points DESC then motivationKey ASC
3. Apply multipliers in that exact order

This prevents "array order bugs" where different orderings produce different scores.

#### Diminishing Returns (Stacking)

| Motivation # | Points Applied |
|--------------|----------------|
| 1st | 100% |
| 2nd | 100% |
| 3rd | 75% |
| 4th | 50% |
| 5th | 50% |
| 6th+ | 25% |

#### Guardrails

- **Low-urgency cap:** Low-tier subtotal max +9 total (prevents gaming with many weak motivations)
- **Critical/High:** No cap (genuine distress signals)

#### Synergy Bonuses (Applied after guardrails)

| Combination | Bonus |
|-------------|-------|
| Foreclosure + Vacant | +5 |
| Probate + Out of State | +4 |
| Tax Lien + High Equity | +4 |
| Divorce + Tired Landlord | +3 |
| Code Violation + Vacant | +3 |

#### Motivation Score Formula

```
MotivationScore = sum(diminished weights with deterministic ordering, Low-cap applied) + synergyBonus
```

#### Example Calculation

Lead has: Foreclosure (Critical), Vacant (Medium), Free & Clear (Low), Absentee (Low)

Apply ordering + multipliers:
- Foreclosure: 12 × 100% = 12
- Vacant: 7 × 100% = 7
- Free & Clear: 4 × 75% = 3
- Absentee: 4 × 50% = 2

Low subtotal = 3 + 2 = 5 (below Low cap 9) ✅

Synergy: Foreclosure + Vacant = +5

**MotivationScore = 12 + 7 + 5 + 5 = 29**

---

### Component 2: Contact Recency (Range -20 to +15)

Older contact = higher priority. Very recent = penalty.

| Time Since Last Contact | Points |
|-------------------------|--------|
| Never contacted | +15 |
| 14+ days ago | +12 |
| 8–14 days ago | +10 |
| 3–7 days ago | +5 |
| 1–2 days ago | 0 |
| < 24 hours | -20 |

---

### Component 3: Engagement Score (Range -5 to +30)

Engagement measures lead response, not call outcomes.

| Engagement State | Points |
|------------------|--------|
| Callback requested | +30 |
| Had conversation (two-way dialogue) | +20 |
| Answered – neutral | +10 |
| Explicitly said "not now" | -5 |
| No engagement history | 0 |

---

### Component 4: Fatigue Penalty (Range -25 to 0)

Prevents wasting effort on repeated no-responses.

| No-Response Streak | Penalty |
|--------------------|---------|
| 0–2 | 0 |
| 3–4 | -5 |
| 5–6 | -10 |
| 7–8 | -15 |
| 9+ | -25 |

**Reset Rule:** Any positive response resets streak to 0.

---

### Component 5: Negative Penalty Rule (No Double-Counting)

Recency and fatigue can both be negative. Only apply ONE negative penalty: the worse one.

```
recencyPenalty = (recencyPoints if recencyPoints < 0 else 0)
fatiguePenalty = fatiguePoints  // already <= 0
negativePenalty = MIN(recencyPenalty, fatiguePenalty)
```

This ensures you never "double punish" the same lead.

---

### Component 6: Task Urgency (Range 0 to +20)

| Task Status | Points |
|-------------|--------|
| Overdue | +15 |
| Due today | +10 |
| Due tomorrow | +5 |
| None / future | 0 |

**Task Type Bonus (stacks; cap total at +20):**

| Task Type | Bonus |
|-----------|-------|
| Callback | +5 |
| Follow-up | +3 |
| General | +0 |

---

### Component 7: Lead Age Rescue (Range 0 to +10)

Only applies if `lastContactAt` is NULL or > 30 days ago.

| Lead Age | Points |
|----------|--------|
| 0–30 days | 0 |
| 31–60 | +3 |
| 61–90 | +5 |
| 91–180 | +8 |
| 180+ | +10 |

---

### Component 8: Data Quality / Channel Readiness (Range -10 to +10)

Can we actually reach them?

| Data State | Points |
|------------|--------|
| Multiple valid phones + email | +10 |
| One valid phone + email | +7 |
| One valid phone only | +5 |
| Phone exists but unverified | 0 |
| No valid phone (all bad/DNC) | -10 |

---

### Component 9: Status Modifier (Range -10 to +10)

Statuses are mapped to categories, not exact names.

| Category | Points | Examples |
|----------|--------|----------|
| NEGOTIATING | +10 | "In Negotiation", "Contract Pending" |
| HOT_LEAD | +8 | "Hot Lead" |
| INTERESTED | +5 | "Contacted – Interested" |
| NEW | 0 | "New", "Fresh" |
| NEUTRAL | -2 | "Left Message", "Contacted" |
| NURTURE | -5 | "Nurture" |
| LONG_TERM | -8 | "Long-term Follow-up" |

Workability blocks are handled in the Workability Gate (not scoring).

---

### Component 10: Confidence Level (Range -5 to +5)

This measures reliability of data, not just availability.

| Confidence | Points |
|------------|--------|
| High | +5 |
| Medium | 0 |
| Low | -5 |

**Formal Criteria:**

| Level | Requirements |
|-------|--------------|
| **High** | skiptrace < 90d AND ≥1 verified phone AND (email OR multiple phones) |
| **Medium** | skiptrace < 180d OR unverified but plausible phone exists |
| **Low** | no skiptrace OR skiptrace > 180d OR no phone data |

---

## Final Score Formula (Unambiguous)

Only apply recency if positive. Only apply one negative penalty (worse of recency/fatigue).

```
positivesSum =
  MotivationScore
+ max(ContactRecency, 0)
+ EngagementScore
+ TaskUrgency
+ LeadAgeRescue
+ DataQuality
+ StatusModifier
+ ConfidencePoints

PriorityScore = max(0, positivesSum + negativePenalty)
```

- **Floor:** 0
- **Ceiling:** Uncapped (typical 60–120; exceptional may exceed 120)

---

## Score Recalculation Triggers

Recalculate when:

| Trigger | Reason |
|---------|--------|
| Motivations added/removed | Core scoring factor changed |
| Call outcome logged | Engagement/fatigue/recency affected |
| Task created/completed/overdue | Task urgency changed |
| Status changed | Status modifier changed |
| Skiptrace completed | Confidence, data quality changed |
| Phone validated/invalidated | Data quality changed |
| Manual temperature override | Forces recalc |
| Score older than 7 days | Staleness prevention |
| Re-enrollment triggered | Fresh start |

---

# PART 4: TEMPERATURE BANDS

Temperature is a **label** derived from PriorityScore.

| Priority Score | Band | Cadence |
|----------------|------|---------|
| 80+ | 🔥 **HOT** | Aggressive |
| 50–79 | 🌡️ **WARM** | Standard |
| 25–49 | ❄️ **COLD** | Slow |
| 0–24 | 🧊 **ICE** | Minimal |

---

## Forced Promotions (Overrides)

Lead is forced to HOT for a minimum cooldown if:

| Trigger | Action |
|---------|--------|
| Callback requested | → HOT for 7 days |
| Overdue callback task exists | → HOT until resolved |
| Critical motivation added | → Recalc (often HOT) |

---

## Band Hysteresis (Anti-Bounce)

Prevents daily bouncing between bands when score hovers near threshold.

| Direction | Rule |
|-----------|------|
| **Promotion** | Immediate when score crosses up |
| **Demotion** | Only if score stays below threshold for 3 consecutive days |

If score crosses back above threshold, demotion counter resets.

---

# PART 5: STATE MACHINE

## States

| State | Code | Meaning |
|-------|------|---------|
| Not Enrolled | `NOT_ENROLLED` | No valid phone / brand new |
| Active | `ACTIVE` | In cadence + has next action |
| Snoozed | `SNOOZED` | Hidden until date |
| Paused | `PAUSED` | Manual hold |
| Completed – No Contact | `COMPLETED_NO_CONTACT` | Cadence finished, no contact |
| Exited – Engaged | `EXITED_ENGAGED` | Lead responded; handled via tasks/manual |
| Exited – DNC | `EXITED_DNC` | Legal block |
| Exited – Dead | `EXITED_DEAD` | Wrong person/deceased/bad data |
| Exited – Closed | `EXITED_CLOSED` | Deal resolved |
| Stale Engaged | `STALE_ENGAGED` | Engaged but no activity 21+ days |
| Long-term Nurture | `LONG_TERM_NURTURE` | Too many cycles; annual check only |

---

## State Transition Diagram

```
                              ┌─────────────────┐
                              │  NOT_ENROLLED   │
                              │  (no valid phone)│
                              └────────┬────────┘
                                       │ Valid phone added
                                       ▼
              ┌────────────────────────────────────────────────┐
              │                                                │
              │                    ACTIVE                      │◄──────────────┐
              │            (in cadence, working)               │               │
              │                                                │               │
              └───┬─────────┬─────────┬─────────┬─────────┬───┘               │
                  │         │         │         │         │                   │
                  ▼         ▼         ▼         ▼         ▼                   │
            ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐          │
            │ SNOOZED ││ PAUSED  ││ EXITED_ ││ EXITED_ ││ EXITED_ │          │
            │         ││         ││ ENGAGED ││ DNC     ││ DEAD    │          │
            └────┬────┘└────┬────┘└────┬────┘└─────────┘└─────────┘          │
                 │          │          │                                     │
                 │ Expires  │ Resumed  │ 21+ days no activity                │
                 └──────────┴──────┬───┴──────┐                              │
                                   │          ▼                              │
                                   │   ┌─────────────┐                       │
                                   │   │   STALE_    │                       │
                                   │   │  ENGAGED    │───► Gentle cadence ───┘
                                   │   └─────────────┘
                                   │
                                   │ All steps done, no contact
                                   ▼
                            ┌─────────────────┐
                            │   COMPLETED_    │
                            │  NO_CONTACT     │
                            └────────┬────────┘
                                     │ Re-enrollment wait passes
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
             Back to ACTIVE                  ┌─────────────────┐
             (new cycle)                     │   LONG_TERM_    │ (after 6+ cycles)
                                             │    NURTURE      │
                                             └─────────────────┘
```

---

## Invalid State Auto-Fixes (Reconciliation)

| Invalid State | Fix |
|---------------|-----|
| ACTIVE + `nextActionDue` NULL | Set `nextActionDue` = TODAY |
| ACTIVE + `cadenceType` NULL | Assign by temperature |
| SNOOZED + `snoozedUntil` NULL | Set to tomorrow or resume ACTIVE |
| PAUSED + `pausedReason` NULL | Set "Manual hold" |

---

# PART 6: CADENCE TEMPLATES & SCHEDULER

## Scheduler Rules (Deterministic)

- `cadenceStartDate` = when enrolled into current cadence (UTC date)
- Each step has `offsetDays` from template
- `scheduledDueDate` = cadenceStartDate + offsetDays
- `nextActionDue` uses scheduledDueDate, NOT "today + X"

---

## Early Completion Handling

If user completes a step early:
1. Advance step
2. `nextActionDue` = cadenceStartDate + nextOffsetDays
3. If that date is in the past, set `nextActionDue` = TOMORROW

---

## Busy / Retry Handling

If outcome = BUSY:
- Retry same step
- `nextActionDue` = max(TOMORROW, scheduledDueDate)

Never earlier than tomorrow; never breaks spacing.

---

## Timezone Handling

- Store as UTC dates
- Display in user timezone
- "Due Today" boundary is midnight-to-midnight in user timezone

---

## Cadence Templates

### 🔥 HOT Cadence (14 days, 7 steps)

| Step | Day | Action |
|------|-----|--------|
| 1 | 0 | CALL |
| 2 | 1 | CALL |
| 3 | 2 | SMS |
| 4 | 4 | CALL |
| 5 | 6 | RVM |
| 6 | 9 | CALL |
| 7 | 14 | CALL |

### 🌡️ WARM Cadence (21 days, 5 steps)

| Step | Day | Action |
|------|-----|--------|
| 1 | 0 | CALL |
| 2 | 3 | CALL |
| 3 | 7 | SMS |
| 4 | 14 | CALL |
| 5 | 21 | CALL |

### ❄️ COLD Cadence (45 days, 3 steps)

| Step | Day | Action |
|------|-----|--------|
| 1 | 0 | CALL |
| 2 | 14 | CALL |
| 3 | 45 | CALL |

### 🧊 ICE Cadence (90 days, 2 steps)

| Step | Day | Action |
|------|-----|--------|
| 1 | 0 | CALL |
| 2 | 90 | CALL |

### 💚 GENTLE Cadence (30 days, 3 steps)

| Step | Day | Action |
|------|-----|--------|
| 1 | 0 | SMS |
| 2 | 7 | CALL |
| 3 | 30 | CALL |

### 📅 ANNUAL Cadence (365 days, 1 step)

| Step | Day | Action |
|------|-----|--------|
| 1 | 365 | CALL |

---

## Channel Fallback Rules

Never show unexecutable actions.

| Step Requires | Not Available | Fallback |
|---------------|---------------|----------|
| SMS | No SMS integration | Create Task "Send SMS manually" |
| RVM | No RVM integration | Create Task "Send RVM via tool" |
| EMAIL | No email integration | Create Task "Send email manually" |
| CALL | No valid phone | Route to Get Numbers queue |

**Principle:** DockInsight only shows actions the user can do right now.

---

# PART 7: CALL RESULT HANDLING

## Two Separate Events

| Event | When | Purpose |
|-------|------|---------|
| `CALL_ATTEMPTED` | User clicks Call | Counts attempts + starts timer |
| `CALL_OUTCOME_LOGGED` | User selects result | Sets outcome + drives next step |

---

## Required IDs (Prevents Duplicates)

- `callAttemptId` (UUID)
- `leadId`
- `attemptedAt`
- `outcomeForAttemptId` (one outcome per attemptId)

**Idempotency Rule:** Only one outcome can be attached per attempt.

---

## Outcome Options

| Outcome | Cadence Effect | State Effect |
|---------|----------------|--------------|
| Answered – Interested | Exit cadence | → EXITED_ENGAGED |
| Answered – Callback Requested | Stay + boost HOT | Create callback task |
| Answered – Neutral | Next step | Engagement +10 |
| Answered – Not Now | Pause/snooze | → PAUSED/SNOOZED |
| Answered – Not Interested | Workability block | Exit + Not workable |
| Voicemail Left | Next step | None |
| No Answer | Next step | No-response streak +1 |
| Busy | Retry same step tomorrow | None |
| Wrong Number | Mark phone WRONG | Rotate phones / may Get Numbers |
| Disconnected | Mark phone DISCONNECTED | Rotate phones / may Get Numbers |
| DNC Requested | Exit cadence | → EXITED_DNC |

---

## Outcome Required Rule (Ghost Call Protection)

If `CALL_ATTEMPTED` exists but no outcome within 2 hours:
- Auto-log outcome = "No Answer"
- Advance cadence normally
- Increment streak
- Add note: "Auto-logged: No result recorded within 2 hours"

**Important:** Auto-log applies to attemptId; it must not duplicate if user later logs manually.

---

## Callback Override Rule

When callback requested:
1. Force HOT for 7 days
2. Set `nextActionDue` = TODAY (or time if provided via task)
3. Create Task: "Callback – [Lead]" (URGENT)
4. Engagement score +30

---

## Compliance Log (Required)

Any time lead becomes DNC / Not workable, log:
- Who did it
- Timestamp
- Reason
- Which phone number
- Any notes

This is real-world legal protection.

---

# PART 8: MULTI-PHONE HANDLING

## Phone Priority Order

1. Primary (if set)
2. Verified mobiles
3. Verified landlines
4. Unverified mobiles
5. Unverified landlines

---

## Per-Phone Fields

| Field | Purpose |
|-------|---------|
| `status` | VALID / UNVERIFIED / WRONG / DISCONNECTED / DNC |
| `attemptCount` | Total attempts on this number |
| `lastAttemptAt` | When last tried |
| `lastOutcome` | Result of last attempt |
| `consecutiveNoAnswer` | No-answers in a row |

---

## Rotation Rules

| Condition | Action |
|-----------|--------|
| 2 consecutive No Answers on same number | Rotate next attempt |
| Wrong/Disconnected | Disable immediately, rotate next |
| All numbers bad | Route to Get Numbers queue |
| New skiptrace phone added | Inserted into rotation, tried next |

---

## Phone Status Transitions

| From | Trigger | To |
|------|---------|-----|
| UNVERIFIED | Answered or confirmed voicemail | VALID |
| ANY | Outcome = Wrong Number | WRONG |
| ANY | Outcome = Disconnected | DISCONNECTED |
| ANY | Outcome = DNC Requested | DNC |

---

# PART 9: RE-ENROLLMENT ENGINE

## Base Wait by Exit Band

| Exit Band | Base Wait |
|-----------|-----------|
| HOT | 15 days |
| WARM | 30 days |
| COLD | 45 days |
| ICE | 90 days |

---

## Score Multiplier

| Score at Exit | Multiplier |
|---------------|------------|
| 80–100 | 0.75 |
| 60–79 | 1.0 |
| 40–59 | 1.25 |
| 20–39 | 1.5 |
| 0–19 | 2.0 |

```
reEnrollmentDate = cadenceExitDate + (baseWait × multiplier)
```

---

## Cycle Limits (Decay Prevention)

| enrollmentCount | Action |
|-----------------|--------|
| 1–3 | Normal re-enroll |
| 4–5 | Wait time × 1.5 |
| 6+ | → LONG_TERM_NURTURE (Annual cadence) |

---

## Escalation (Optional)

If re-enrolled and still no-contact repeatedly:
- Add a small "baseline fatigue bump" per cycle (light)
- Reset on any engagement

---

## Wake-Up Rule (From Long-term)

Lead can re-enter normal cadences if:
- Critical motivation added
- Manual temperature change
- Callback requested

---

## Never Re-enroll

- EXITED_DNC
- EXITED_DEAD
- EXITED_CLOSED
- Workability blocked

---

# PART 10: WORKABILITY GATE

## Gate Checks

| Condition | Result |
|-----------|--------|
| Status = DNC / Dead / Sold/Closed / Not Interested (explicit) | ❌ Not workable |
| All phones WRONG/DISCONNECTED/DNC | ⚠️ Get Numbers |
| No phone AND no email | ⚠️ Get Numbers |
| `snoozedUntil` > now | ⏸️ Hidden |
| `cadenceState` = PAUSED | ⏸️ Hidden |

---

## Comms Availability Gate (Action Executability)

| nextActionType | If Unavailable | Result |
|----------------|----------------|--------|
| CALL | No valid phone | Route to Get Numbers |
| SMS | No integration | Convert to task |
| RVM | No integration | Convert to task |

---

# PART 11: DOCKINSIGHT QUEUE

## Queue Sections

| Section | Color | Description |
|---------|-------|-------------|
| ⚠️ OVERDUE | Red | `nextActionDue` < TODAY |
| 📞 DUE TODAY | Default | `nextActionDue` = TODAY |
| ✅ TASKS DUE | Blue | Tasks due today |
| 🟦 VERIFY FIRST | Purple | High score + low confidence + callable |
| 🟪 GET NUMBERS | Purple | No valid phones |
| 📅 UPCOMING | Gray (collapsed) | Next 7 days |

---

## Sorting Within Section

1. PriorityScore DESC
2. Confidence DESC (H=3, M=2, L=1)
3. CadenceStep ASC
4. CreatedDate ASC

---

## Capacity Throttle (Prevents Overwhelm)

If Due Today is huge:
- Show Top N (user/team configurable: e.g., 50/100/150)
- Show "Remaining Due Today (collapsed)"
- Overdue always shown regardless of cap

---

## Lead Card Display

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔥 HOT    John Smith                           Score: 87 ▲      │
│ ───────────────────────────────────────────────────────────────│
│ 📍 123 Main St, Austin TX 78701                                 │
│ 📞 (512) 555-1234  ✓ Valid                     Confidence: HIGH │
│ ───────────────────────────────────────────────────────────────│
│ 📊 Cadence: HOT • Step 3 of 7 • CALL                            │
│ 📅 Due: Today                                                   │
│ 🕐 Last Contact: 3 days ago (Voicemail)                         │
│ 🏷️ Motivations: Foreclosure, Vacant                             │
│ 📋 Status: Contacted - Interested                               │
│ ───────────────────────────────────────────────────────────────│
│ 💡 WHY: Never contacted (+15), Critical motivation (+12),       │
│         Overdue task (+15)                                      │
│ ▶️ NEXT: Call primary mobile                                    │
│ 💎 TIP: Verify email to increase confidence                     │
│ ───────────────────────────────────────────────────────────────│
│ [📞 Call]  [💬 SMS]  [🎤 RVM]  [⏭️ Skip]  [😴 Snooze]  [⏸️ Pause]│
└─────────────────────────────────────────────────────────────────┘
```

---

## Reason String Rules (Deterministic)

"WHY" shows:
- Top 3 positive contributors by points
- Always include negativePenalty if applied
- Deterministic tie-break by component priority order list

---

# PART 12: DAILY RECONCILIATION

## Schedule

Daily at 2:00 AM (user timezone or UTC)

---

## Checks + Auto-Fixes

| Check | Problem | Fix |
|-------|---------|-----|
| ACTIVE + nextActionDue NULL | Missing due date | Set to TODAY |
| ACTIVE + cadenceType NULL | Missing cadence | Assign by temperature |
| SNOOZED + snoozedUntil < TODAY | Expired snooze | → ACTIVE, nextActionDue = TODAY |
| COMPLETED_NO_CONTACT + reEnrollmentDate passed | Ready for re-enroll | Run re-enrollment |
| EXITED_ENGAGED + no activity 21+ days | Stale | → STALE_ENGAGED |
| NOT_ENROLLED + has valid phone | Should be enrolled | Enroll in cadence |
| scoreComputedAt > 7 days | Stale score | Recalculate |
| Cadence active for DNC/Dead/Closed | Invalid state | Exit + log |
| Orphan tasks for blocked leads | Orphan | Cancel + log |
| Band mismatch for 3+ days | Hysteresis issue | Recompute band |

---

## Reconciliation Report

```
═══════════════════════════════════════════════════════════════
         DAILY RECONCILIATION REPORT - Jan 10, 2026
═══════════════════════════════════════════════════════════════

Records Scanned:     5,432
Issues Found:        23
Issues Auto-Fixed:   23
Manual Review:       0

───────────────────────────────────────────────────────────────
FIXES APPLIED:
───────────────────────────────────────────────────────────────
  ✓ 5 expired snoozes → activated
  ✓ 8 records re-enrolled
  ✓ 3 new skiptraces → enrolled
  ✓ 4 stale engaged → flagged
  ✓ 2 stuck ACTIVE records → fixed
  ✓ 1 orphan task cancelled

───────────────────────────────────────────────────────────────
HEALTH METRICS:
───────────────────────────────────────────────────────────────
  Active in cadence:     1,234
  Awaiting re-enroll:    456
  Long-term nurture:     89
  Not workable:          312
  Get Numbers queue:     178

═══════════════════════════════════════════════════════════════
```

---

# PART 13: USER WORKSPACE INTEGRATION

## Users CAN

| Action | Effect on LCE |
|--------|---------------|
| Change temperature manually | Forces recalc, may change cadence |
| Add/remove motivations | Recalculates score |
| Snooze a lead | Pauses cadence until snooze expires |
| Pause a lead | Pauses cadence until resumed |
| Create tasks | Task appears in queue, boosts priority |
| Change status | Affects score modifier, may trigger exit |
| Skip in queue | Advances to next step |
| Pull from Long-term Nurture | Re-enrolls in normal cadence |

---

## Users CANNOT

| Item | Reason |
|------|--------|
| Edit scoring formula | Consistency |
| Edit cadence timing | System-defined |
| Edit queue ordering | Optimized |
| Change lifecycle rules | System integrity |
| Bypass workability/compliance gates | Legal |

---

# PART 14: CONFIGURATION & CUSTOMIZATION

## Account-Configurable

| Setting | Default | Customizable |
|---------|---------|--------------|
| Status names | Standard set | ✅ Yes (map to categories) |
| Motivation list | Standard set | ✅ Yes (assign urgency tier) |
| Snooze duration options | 1/3/7/14/30 days | ✅ Yes |

## Future Configurable

| Setting | Status |
|---------|--------|
| Cadence templates | ⚠️ Future |
| Score thresholds | ⚠️ Future |
| Re-enrollment wait times | ⚠️ Future |

---

# PART 15: METRICS & SUCCESS TRACKING

## Key Performance Indicators

| Metric | Definition | Target |
|--------|------------|--------|
| Contact Rate | Answered / Total attempts | > 15% |
| Cadence Completion | Completed / Enrolled | Track trend |
| Re-engagement Rate | Re-enrolled responded / Re-enrolled | > 5% |
| Time to First Contact | Days from creation to first attempt | < 2 days |
| Queue Clearance | Due items worked / Due items | > 80% |
| Overdue Rate | Overdue / Total due | < 10% |
| Slip-Through Rate | Reconciliation fixes / Total leads | < 1% |

---

## Dashboard Widgets

**Today's Queue:**
- Overdue: X
- Due Today: X
- Tasks: X
- Completed: X

**Cadence Health:**
- Active HOT: X
- Active WARM: X
- Active COLD: X
- Awaiting Re-enrollment: X
- Long-term Nurture: X

**Weekly Activity:**
- Calls made: X
- Contacts reached: X
- Callbacks scheduled: X
- Leads engaged: X

---

# PART 16: IMPLEMENTATION PHASES

## Phase 1: Database & Models (Days 1-3)

### Tasks
- [ ] Add LCE fields to Record model
  - `priorityScore`, `scoreComputedAt`, `scoreVersion`, `scoreBreakdown`
  - `confidenceLevel`, `temperatureBand`
  - `cadenceState`, `cadenceType`, `cadenceStep`
  - `cadenceStartDate`, `cadenceExitDate`, `cadenceExitReason`
  - `nextActionType`, `nextActionDue`
  - `lastContactAt`, `lastOutcome`
  - `noResponseStreak`, `enrollmentCount`
  - `snoozedUntil`, `pausedUntil`, `pausedReason`
  - `reEnrollmentDate`
- [ ] Create CadenceTemplate model
- [ ] Create CadenceStep model
- [ ] Create CadenceLog model (attempt + outcome tracking)
- [ ] Create ComplianceLog model (DNC/block tracking)
- [ ] Create ReconciliationLog model
- [ ] Add phone-level tracking fields to RecordPhoneNumber
  - `status`, `attemptCount`, `lastAttemptAt`, `lastOutcome`, `consecutiveNoAnswer`
- [ ] Run Prisma migrations
- [ ] Seed default cadence templates (HOT/WARM/COLD/ICE/GENTLE/ANNUAL)

### Deliverables
- Database schema updated
- Migrations applied
- Default data seeded

---

## Phase 2: Scoring Module (Days 4-6)

### Tasks
- [ ] Create `src/lib/lce/scoring.ts`
- [ ] Implement motivation score calculation
  - Deterministic ordering
  - Diminishing returns
  - Low-urgency cap
  - Synergy bonuses
- [ ] Implement all 10 score components
- [ ] Implement negative penalty rule (no double-counting)
- [ ] Implement final score formula
- [ ] Store score metadata (version, breakdown, timestamp)
- [ ] Create score recalculation triggers
- [ ] Create API: `POST /api/lce/calculate-score`
- [ ] Unit tests for scoring edge cases

### Deliverables
- Scoring engine complete
- All components tested
- API endpoint working

---

## Phase 3: State Machine & Cadence Tracker (Days 7-9)

### Tasks
- [ ] Create `src/lib/lce/state-machine.ts`
- [ ] Implement all 11 states
- [ ] Implement state transition rules
- [ ] Implement state validation rules
- [ ] Create `src/lib/lce/cadence.ts`
- [ ] Implement enrollment logic
- [ ] Implement step advancement logic
- [ ] Implement exit logic
- [ ] Implement scheduler rules (offset-based dates)
- [ ] Implement busy/retry handling
- [ ] Implement timezone handling
- [ ] Create APIs:
  - `POST /api/lce/enroll`
  - `POST /api/lce/advance`
  - `POST /api/lce/exit`
  - `POST /api/lce/pause`
  - `POST /api/lce/resume`
  - `POST /api/lce/snooze`
- [ ] Unit tests for state transitions

### Deliverables
- State machine complete
- Cadence tracker complete
- All transitions tested

---

## Phase 4: Call Result Handling (Days 10-11)

### Tasks
- [ ] Create `src/lib/lce/call-handler.ts`
- [ ] Implement attempt tracking (CALL_ATTEMPTED)
- [ ] Implement outcome logging (CALL_OUTCOME_LOGGED)
- [ ] Implement idempotency (one outcome per attempt)
- [ ] Implement outcome required rule (2-hour auto-log)
- [ ] Implement callback override rule
- [ ] Implement compliance logging
- [ ] Connect outcomes to cadence advancement
- [ ] Connect outcomes to engagement/fatigue scoring
- [ ] Update DockInsight log-action API
- [ ] Unit tests for call handling

### Deliverables
- Call handling complete
- Outcomes drive cadence correctly
- Compliance logging working

---

## Phase 5: Multi-Phone Handling (Day 12)

### Tasks
- [ ] Create `src/lib/lce/phone-rotation.ts`
- [ ] Implement phone priority ordering
- [ ] Implement rotation rules
- [ ] Implement phone status transitions
- [ ] Connect to call result handling
- [ ] Update phone selection in DockInsight
- [ ] Unit tests for rotation logic

### Deliverables
- Phone rotation complete
- Bad numbers auto-rotate
- Get Numbers queue populated correctly

---

## Phase 6: Re-Enrollment Engine (Days 13-14)

### Tasks
- [ ] Create `src/lib/lce/reenrollment.ts`
- [ ] Implement base wait calculation
- [ ] Implement score multiplier
- [ ] Implement cycle limits
- [ ] Implement wake-up rules
- [ ] Implement never-enroll rules
- [ ] Create re-enrollment job (can be triggered by reconciliation)
- [ ] Unit tests for re-enrollment

### Deliverables
- Re-enrollment engine complete
- Leads cycle correctly
- Long-term nurture working

---

## Phase 7: Workability Gate & Queue Builder (Days 15-17)

### Tasks
- [ ] Create `src/lib/lce/workability.ts`
- [ ] Implement all gate checks
- [ ] Implement comms availability gate
- [ ] Create `src/lib/lce/queue-builder.ts`
- [ ] Implement 6 queue sections
- [ ] Implement sorting algorithm
- [ ] Implement capacity throttle
- [ ] Implement reason string generation
- [ ] Update DockInsight queue API
- [ ] Update DockInsight UI
  - Show cadence info on cards
  - Show WHY/NEXT/TIP
  - Show all 6 sections
- [ ] Integration tests for queue

### Deliverables
- Queue builder complete
- DockInsight updated
- All sections working

---

## Phase 8: Daily Reconciliation (Days 18-19)

### Tasks
- [ ] Create `src/lib/lce/reconciliation.ts`
- [ ] Implement all data integrity checks
- [ ] Implement all state transition checks
- [ ] Implement score staleness check
- [ ] Implement orphan cleanup
- [ ] Create reconciliation report generator
- [ ] Create cron job (or Vercel cron)
- [ ] Create admin UI to view reports
- [ ] Integration tests for reconciliation

### Deliverables
- Reconciliation job complete
- Reports generated
- Self-healing working

---

## Phase 9: Testing & Polish (Days 20-22)

### Tasks
- [ ] End-to-end testing of full lifecycle
- [ ] Test: New lead → Skiptrace → Enroll → Cadence → Exit → Re-enroll
- [ ] Test: Callback override flow
- [ ] Test: DNC compliance flow
- [ ] Test: Phone rotation flow
- [ ] Test: Reconciliation catches edge cases
- [ ] Performance testing with large datasets
- [ ] Fix any bugs found
- [ ] Documentation updates
- [ ] Team training on new system

### Deliverables
- All tests passing
- System stable
- Team trained

---

## Phase 10: Deployment & Monitoring (Days 23-25)

### Tasks
- [ ] Deploy to staging
- [ ] Run reconciliation on existing data (backfill)
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] Monitor KPIs
- [ ] Iterate based on feedback

### Deliverables
- System live in production
- KPIs being tracked
- Feedback loop established

---

# SUMMARY: LCE v2.3.1 Key Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Deterministic Scoring | 10 components, no double-counting, versioned + timestamped |
| 2 | Deterministic Motivation Ordering | Prevents score drift from array order |
| 3 | Temperature as Label | Derived from score, not separate system |
| 4 | Band Hysteresis | Prevents daily bouncing between bands |
| 5 | Clear State Machine | 11 states, explicit transitions, validation rules |
| 6 | Tiered Cadences | HOT/WARM/COLD/ICE/GENTLE/ANNUAL |
| 7 | Offset-Based Scheduling | Consistent spacing, timezone-aware |
| 8 | Channel Fallback | Never shows unexecutable actions |
| 9 | Idempotent Attempt/Outcome | No duplicates on refresh |
| 10 | Outcome Required Rule | Ghost call protection |
| 11 | Callback Override | Callbacks immediately jump to HOT |
| 12 | Phone Rotation | Automatic rotation after failures |
| 13 | Smart Re-enrollment | Score-adjusted timing, decay prevention |
| 14 | Compliance Logging | DNC/block audit trail |
| 15 | Daily Reconciliation | Self-healing, detailed reporting |
| 16 | Intelligent Queue | 6 sections, capacity throttle, reason strings |
| 17 | WHY/NEXT/TIP | User understands and trusts the system |

---

# APPENDIX A: v2.3.1 Upgrades vs v2.3

| Upgrade | Description |
|---------|-------------|
| Deterministic motivation ordering | Prevents score drift from array order bugs |
| Clarified scoring formula | No accidental double penalties |
| Busy/Retry cadence rule | Aligned with offset scheduling |
| Idempotent attempt/outcome tracking | No duplicates on refresh |
| Compliance logging | Required for DNC / not workable |
| Queue capacity throttle | Usable at scale |
| Reason string selection rules | Consistent WHY output |
| Stronger global definitions | Valid/verified/callable clearly defined |

---

**END OF SPECIFICATION**

*This document is the single source of truth for LCE implementation.*
