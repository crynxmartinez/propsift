# Lead Cadence Engine (LCE) - User Guide

> **For Notion** - A simple explanation of how the Lead Cadence Engine works

---

## What is the Lead Cadence Engine?

The Lead Cadence Engine (LCE) is PropSift's intelligent system that automatically manages **when** and **how often** to contact your leads. Think of it as your personal assistant that:

- Schedules your follow-up calls automatically
- Prioritizes hot leads over cold ones
- Remembers when each lead is due for contact
- Adjusts contact frequency based on lead interest

---

## The Big Picture

When you call a lead and log the result, the LCE:

1. **Records what happened** (answered, no answer, wrong number, etc.)
2. **Schedules the next call** based on the cadence
3. **Hides the lead** until it's time to call again
4. **Shows the lead** when the scheduled date arrives

This means your queue only shows leads that are **due today** - not leads you already called that are scheduled for later.

---

## How Leads Flow Through the System

```
New Lead Enters → Assigned Temperature → Starts Cadence → You Call → Result Logged → Next Call Scheduled → Repeat
```

### Example Flow

1. **Day 1**: New HOT lead appears in your queue
2. **You call**: No answer - log "No Answer"
3. **LCE schedules**: Next call for tomorrow (Day 2)
4. **Lead disappears** from queue until tomorrow
5. **Day 2**: Lead reappears in queue
6. **You call again**: They answer! Log "Answered" and set status to "Interested"
7. **LCE upgrades**: Lead stays HOT, schedules next follow-up
8. **Repeat** until deal closes or lead becomes DNC

---

## Temperature Levels

Temperature determines how aggressively we pursue a lead.

| Temperature | What It Means | How Often We Call |
|-------------|---------------|-------------------|
| 🔥 **HOT** | High motivation, urgent | 7 calls over 14 days |
| 🌡️ **WARM** | Good potential | 5 calls over 21 days |
| ❄️ **COLD** | Lower priority | 3 calls over 45 days |
| 🧊 **ICE** | Minimal engagement | 2 calls over 60 days |
| 💤 **LTN** | Long Term Nurture | 1 call every 6 months |

### How Temperature Changes

- **Upgrade** (moves up): When you mark a lead as "Interested"
  - ICE → COLD → WARM → HOT
- **Downgrade** (moves down): When you mark a lead as "Not Interested"
  - HOT → WARM → COLD → ICE → LTN
- **Auto-downgrade**: After 2 full cycles with no contact made

---

## The 6 Buckets

Your leads are organized into 6 buckets based on their status:

| Bucket | What It Means | When Leads Appear |
|--------|---------------|-------------------|
| 📞 **Call Now** | High-priority leads ready to call | When due today |
| 📋 **Follow Up Today** | Leads with tasks due today | When due today |
| 📱 **Call Queue** | Regular leads to work through | When due today |
| ✅ **Verify First** | Need to verify data before calling | When due today |
| 🔍 **Get Numbers** | Need phone numbers | Always visible |
| 🌱 **Nurture** | Long-term leads, low priority | Always visible |

### Important: Cadence-Based Visibility

- **Call Now, Follow Up, Call Queue, Verify First**: Only show leads that are **due today or overdue**
- **Get Numbers, Nurture**: Always show all leads (no hiding)

This means if you have 100 leads in Call Queue and call 50 today, your count drops to 50. As their scheduled dates arrive over the next days/weeks, they'll reappear and the count goes back up.

---

## Call Results

When you log a call, you select a **Call Result**. Each result has a behavior that tells the LCE what to do:

| Result Type | What It Means | What Happens |
|-------------|---------------|--------------|
| **No Contact** | Didn't reach them (No Answer, Voicemail) | Move to next cadence step |
| **Retry** | Temporary issue (Busy) | Stay on same step, try tomorrow |
| **Contact Made** | Spoke with them (Answered) | Prompt for status update |
| **Bad Data** | Phone is wrong (Wrong Number, Disconnected) | Move to "Get Numbers" bucket |
| **Terminal** | Never contact again (DNC) | Exit cadence permanently |

### Default Call Results

| Call Result | Behavior |
|-------------|----------|
| No Answer | No Contact - advance cadence |
| Left Voicemail | No Contact - advance cadence |
| Busy | Retry - same step tomorrow |
| Answered | Contact Made - update status |
| Wrong Number | Bad Data - get new number |
| Disconnected | Bad Data - get new number |
| DNC Requested | Terminal - never call again |

---

## Statuses

Each lead has a **Status** that describes their current disposition. Statuses have two behaviors:

### 1. Workability (Can we contact them?)

| Workability | What It Means | Example Statuses |
|-------------|---------------|------------------|
| **Workable** | Can be contacted, stays in cadence | New Lead, Contacted, Follow Up |
| **Paused** | Temporarily on hold | Callback Scheduled |
| **Closed Won** | Deal success, exits cadence | Under Contract, Sold |
| **Closed Lost** | Not viable, moves to nurture | Dead |
| **DNC** | Never contact again | Do Not Call |

### 2. Temperature Effect (Does it change priority?)

| Effect | What It Means | Example Statuses |
|--------|---------------|------------------|
| **Upgrade** | Move up one temperature level | Interested |
| **Downgrade** | Move down one temperature level | Not Interested |
| **No Change** | Temperature stays the same | Contacted, Follow Up |

### Default Statuses

| Status | Workability | Temperature Effect |
|--------|-------------|-------------------|
| New Lead | Workable | No Change |
| Contacted | Workable | No Change |
| Follow Up | Workable | No Change |
| Interested | Workable | Upgrade ⬆️ |
| Not Interested | Workable | Downgrade ⬇️ |
| Callback Scheduled | Paused | No Change |
| Under Contract | Closed Won | No Change |
| Sold | Closed Won | No Change |
| Dead | Closed Lost | No Change |
| DNC | DNC | No Change |

---

## Custom Call Results & Statuses

You can create your own custom call results and statuses in **Settings**. When creating them, you'll choose:

- **For Call Results**: The behavior type (No Contact, Retry, Contact Made, Bad Data, Terminal)
- **For Statuses**: The workability and temperature effect

This lets you customize the system to match your workflow while keeping the LCE logic working correctly.

---

## Frequently Asked Questions

### Q: I called 50 leads but my queue still shows 100. Why?

**Old behavior**: All leads stayed visible, just sorted differently.

**New behavior (v2.4)**: Called leads disappear until their next scheduled date. If you're seeing 100, it means all 100 are due today or overdue.

### Q: A lead disappeared after I called them. Where did it go?

It's still in the system! It's just hidden until its next scheduled call date. When that date arrives, it will reappear in your queue.

### Q: How do I see leads that are scheduled for the future?

Currently, future-scheduled leads are hidden from the queue. They'll appear when their date arrives. (A "Scheduled" view may be added in a future update.)

### Q: What happens if I don't call a lead for a week?

Leads you didn't call stay in the queue (they're overdue). When you return, they'll be at the top of your queue since they're past due.

### Q: How do I remove a lead from the cadence?

Set their status to one of:
- **DNC** - Never contact again
- **Closed Won** (Under Contract, Sold) - Deal success
- **Closed Lost** (Dead) - Not viable

### Q: Can I pause a lead temporarily?

Yes! Set their status to **Callback Scheduled** or any status with "Paused" workability. They'll be on hold until you change their status back.

---

## Summary

The Lead Cadence Engine ensures you:

1. ✅ **Never forget a lead** - Every lead stays in rotation until closed
2. ✅ **Call at the right time** - Cadence schedules optimal follow-up timing
3. ✅ **Focus on what's due** - Queue only shows leads ready to call today
4. ✅ **Prioritize correctly** - Hot leads get more attention than cold ones
5. ✅ **Handle bad data** - Wrong numbers go to "Get Numbers" for cleanup
6. ✅ **Customize your workflow** - Create your own statuses and call results

---

*Last updated: January 2026 - LCE v2.4*
