# DockInsight - User Guide

> **For Notion** - A simple explanation of how DockInsight works

---

## What is DockInsight?

DockInsight is PropSift's **calling dashboard** - your command center for working through leads efficiently. It shows you:

- Which leads to call right now
- How many leads are in each bucket
- Quick stats on your activity
- Easy controls for logging calls and updating leads

Think of it as your daily "to-do list" for calling, automatically prioritized and organized.

---

## The Dashboard Layout

When you open DockInsight, you'll see:

### Left Side: The Queue
- **Bucket Selector** - 6 colored buttons showing lead counts
- **Lead List** - Scrollable list of leads in the selected bucket
- **Next Up Card** - The current lead you're working on

### Right Side: Stats Sidebar
- **Today's Activity** - Calls made, contacts, appointments
- **Temperature Bar** - Distribution of HOT/WARM/COLD leads
- **Quick Stats** - Total leads, workable leads, etc.

---

## The 6 Buckets

Your leads are organized into 6 buckets. Click any bucket to see its leads.

| Bucket | Color | What It Means |
|--------|-------|---------------|
| 📞 **Call Now** | Red | High-priority leads, call these first |
| 📋 **Follow Up** | Orange | Leads with tasks or follow-ups due |
| 📱 **Call Queue** | Blue | Regular leads to work through |
| ✅ **Verify First** | Yellow | Need to verify data before calling |
| 🔍 **Get Numbers** | Purple | Missing phone numbers |
| 🌱 **Nurture** | Green | Long-term leads, low priority |

### Bucket Counts

The number on each bucket shows how many leads are **ready to call today**:

- If you have 100 leads and call 50, the count drops to 50
- As scheduled follow-ups become due, the count goes back up
- **Get Numbers** and **Nurture** always show all leads (no hiding)

---

## The Next Up Card

When you select a lead, the **Next Up Card** shows everything you need:

### Lead Information
- **Name** - Property owner's name
- **Address** - Property address
- **Temperature** - HOT, WARM, COLD indicator
- **Score** - Priority score (higher = more important)

### Phone Numbers
- List of all phone numbers for this lead
- Click any number to call
- Status indicators (Good, Bad, Unknown)

### Quick Actions
- **Call** - Start a call
- **Skip** - Move to next lead
- **Snooze** - Delay this lead (1 hour, tomorrow, 3 days, 1 week)

### After the Call
- **Call Result Dropdown** - Select what happened (No Answer, Answered, etc.)
- **Status Dropdown** - Update lead status if needed
- **NEXT Button** - Move to the next lead

---

## How to Work Through Your Queue

### Step 1: Select a Bucket
Click on **Call Now** or **Call Queue** to start with priority leads.

### Step 2: Review the Lead
Look at the Next Up Card - check the name, address, and any notes.

### Step 3: Make the Call
Click the phone number or use the Call button.

### Step 4: Log the Result
After the call, select what happened:
- **No Answer** - They didn't pick up
- **Left Voicemail** - You left a message
- **Answered** - You spoke with them
- **Wrong Number** - Phone is incorrect
- **DNC Requested** - They asked not to be called

### Step 5: Update Status (if needed)
If you spoke with them, update their status:
- **Interested** - They want to talk more
- **Not Interested** - They're not selling
- **Callback Scheduled** - Set a specific time to call back

### Step 6: Move to Next
Click **NEXT** to move to the next lead in your queue.

---

## Keyboard Shortcuts

For power users, DockInsight supports keyboard shortcuts:

| Key | Action |
|-----|--------|
| **C** | Start call |
| **N** | Skip to next lead |
| **S** | Open snooze menu |
| **1-9** | Quick-select call result |

---

## Understanding the Stats

### Today's Activity
- **Calls** - Total calls made today
- **Contacts** - Leads you actually spoke with
- **Appointments** - Callbacks or meetings scheduled

### Temperature Bar
Shows the distribution of your leads:
- 🔥 Red = HOT leads
- 🌡️ Orange = WARM leads
- ❄️ Blue = COLD leads

### Quick Stats
- **Total Leads** - All leads in your system
- **Workable** - Leads you can contact
- **Due Today** - Leads scheduled for today

---

## Tips for Maximum Efficiency

### 1. Start with Call Now
These are your highest-priority leads. Work through them first.

### 2. Log Every Call
Even "No Answer" matters - it advances the cadence and schedules the next call.

### 3. Use Snooze Wisely
If you need to call back at a specific time, use Snooze instead of skipping.

### 4. Update Statuses
When you learn something new about a lead, update their status. This helps the system prioritize correctly.

### 5. Check Get Numbers
Periodically check the "Get Numbers" bucket and add phone numbers for leads that need them.

---

## What Happens Behind the Scenes

When you log a call result, DockInsight works with the Lead Cadence Engine (LCE) to:

1. **Record the outcome** in the lead's history
2. **Calculate the next call date** based on the cadence
3. **Update the lead's temperature** if status changed
4. **Move the lead** to the appropriate bucket
5. **Hide the lead** until its next scheduled date

This all happens automatically - you just focus on making calls!

---

## Frequently Asked Questions

### Q: Why did my bucket count go down after calling?

That's the new cadence visibility feature! When you call a lead and log the result, it gets scheduled for a future date and disappears from your queue until that date arrives.

### Q: A lead I just called is still showing. Why?

Make sure you logged a call result. If you just skipped without logging, the lead stays in the queue.

### Q: How do I find a specific lead?

Use the search function in the main Records page, or filter by name/address.

### Q: Can I see leads scheduled for tomorrow?

Currently, the queue only shows leads due today or overdue. Scheduled leads will appear when their date arrives.

### Q: What's the difference between Skip and Snooze?

- **Skip** - Moves to the next lead without changing anything
- **Snooze** - Delays this specific lead for a set time (1 hour, tomorrow, etc.)

### Q: How do I remove a lead from my queue?

Set their status to DNC, Sold, or Dead. This removes them from the active queue.

---

## Summary

DockInsight helps you:

1. ✅ **See what to call** - Organized buckets with priority leads first
2. ✅ **Work efficiently** - One-click calling and quick result logging
3. ✅ **Stay organized** - Automatic scheduling and lead rotation
4. ✅ **Track progress** - Real-time stats on your activity
5. ✅ **Focus on today** - Only see leads that are due now

---

*Last updated: January 2026 - DockInsight v2.2 + LCE v2.4*
