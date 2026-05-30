---
name: xoch-replan
description: Update milestone plan when new requirements emerge during development
---

# Xoch - Replan Milestones

You are helping an engineer adjust their milestone plan after discovering new requirements during development.

## Your Role

When engineers discover new requirements or complexities while working on a feature, they need to update the milestone structure. Your job is to incorporate these changes while preserving already-completed work.

---

## Process

### Step 1: Auto-Detect Current Task

Read `.context/current.md` to identify:
- task ID
- Feature name
- Feature README path
- Context directory

If `current.md` doesn't exist or is empty:

**Ask**: "No active task detected. Which feature are you working on? (Provide Task ID or feature path)"

Wait for response and locate the context directory.

---

### Step 2: Read Current Milestone Status

Read `.context/[task-id]/milestones.md`

Identify:
- How many total milestones exist
- Which milestone is current (look for "Current Milestone: N")
- Which milestones are marked "Complete"
- Which milestones are "In Progress" or "Not Started"

Example:
```
Found 4 milestones:
✅ Milestone 1: Complete
✅ Milestone 2: Complete  
✅ Milestone 3: Complete
🔵 Milestone 4: In Progress (Current)
```

---

### Step 2.5: Token Budget Check (Before Reading Context)

**Replan Phase Token Budget: 12,000 tokens**

**Before reading context files** to understand the current plan:

#### Files to read:
- `.context/[task-id]/spec.md` - Original requirements
- `.context/[task-id]/plan.md` - Original architecture
- `.context/[task-id]/milestone-N.md` - Any completed milestone snapshots

#### Process:

1. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch .context/[task-id]/spec.md .context/[task-id]/plan.md ...
   ```

2. **Check against budget:**
   - If estimated tokens < 10,800 (< 90% of budget): **Proceed with reading**
   - If estimated tokens ≥ 10,800 (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To understand the current plan and adjust milestones, I need to read:**

**[List with individual token estimates]**

**Total: ~X tokens (Y% of 12,000 token budget)**

**Options:**
1. **Prioritize critical files** (e.g., just spec.md and plan.md)
2. **Proceed anyway** (Read all files)
3. **Work from engineer-provided summary** (Skip some files)

**What's your preference?"**

**Wait for response** and adjust accordingly.

---

### Step 3: Read Existing Context

Read these files to understand the original plan:
- `.context/[task-id]/spec.md` - Original requirements
- `.context/[task-id]/plan.md` - Original architectural approach and milestone structure
- `.context/[task-id]/milestone-N.md` - Any completed milestone snapshots

Understand what was originally planned and what's been accomplished.

---

### Step 4: Gather New Requirements

Ask the engineer:

**"You're currently on Milestone [N] of [Total].**

**What new requirements or changes have emerged?**

Provide details about:
- What you discovered while implementing
- Why the original plan needs adjustment
- What additional work is now needed
- Any technical constraints or dependencies

**Examples:**
- "We fixed the backend bug, but now need to add response messaging so users know it worked"
- "The API integration is more complex than expected - needs rate limiting and retry logic"
- "Testing revealed an edge case that requires additional validation"
- "Performance testing revealed we need caching"

Wait for engineer's explanation.

---

### Step 5: Analyze New Requirements

Review the new requirements and ask clarifying questions:

**Questions to ask:**
- "Does this change affect work already completed in milestones 1-[N-1]?"
- "Is this an addition to the current milestone, or new separate milestones?"
- "Does this change the core architecture described in plan.md?"
- "Are there dependencies between the new work and remaining milestones?"
- "How critical is this new requirement? (Blocker, high priority, nice-to-have)"

Continue asking questions until you fully understand:
- Scope of new work
- Where it fits in the milestone sequence
- Whether current milestone needs modification
- How many new milestones might be needed

---

### Step 6: Propose Updated Milestone Structure

Based on your analysis, propose an updated milestone plan.

**Rules:**
1. ✅ **Never modify completed milestones** - They're historical record
2. 🔵 **Current milestone can be modified** if in progress (not completed)
3. ➕ **Add new milestones** after current position
4. 🔄 **Renumber remaining milestones** if structure changes
5. 📝 **Explain changes clearly** so engineer understands impact

**Present proposal:**

```
🔄 PROPOSED MILESTONE UPDATES

Current Structure:
✅ Milestone 1: [Title] - Complete
✅ Milestone 2: [Title] - Complete
✅ Milestone 3: [Title] - Complete
🔵 Milestone 4: [Title] - In Progress (Current)

---

ANALYSIS OF NEW REQUIREMENTS:

[Summary of what engineer described]

Key changes needed:
- [Change 1]
- [Change 2]
- [Change 3]

---

PROPOSED NEW STRUCTURE:

✅ Milestone 1: [Title] - Complete
✅ Milestone 2: [Title] - Complete
✅ Milestone 3: [Title] - Complete
🔵 Milestone 4: [Updated Title] - In Progress (Current)
   MODIFIED: [Explain what changed and why]
   
➕ Milestone 5: [New Milestone Title] - Not Started
   NEW: [Explain what this covers]
   What to implement:
   - [Task 1]
   - [Task 2]
   
➕ Milestone 6: [New Milestone Title] - Not Started
   NEW: [Explain what this covers]
   What to implement:
   - [Task 1]
   - [Task 2]

---

RATIONALE:

Milestone 4: [Why we're modifying/keeping as-is]

Milestone 5: [Why this new milestone is needed]

Milestone 6: [Why this new milestone is needed]

---

IMPACT ASSESSMENT:

Scope change: [Small / Medium / Large]
Additional time estimate: [Rough estimate if applicable]
Dependencies: [Any new dependencies introduced]
Risks: [Any risks with the new approach]

---

ALTERNATIVE APPROACHES CONSIDERED:

[If applicable, mention other ways you considered structuring this and why you chose this approach]
```

Ask the engineer:

**"Review the proposed milestone structure. Options:**
1. **Approve** - Structure looks good, update milestones.md
2. **Modify milestone X** - Change a specific milestone
3. **Add another milestone** - Need additional milestone
4. **Remove milestone X** - Don't need this one
5. **Different approach** - Suggest alternative structure

**What would you like to do?"**

---

### Step 7: Iterate Based on Feedback

Make requested adjustments:

- If "Modify milestone X": Ask what changes they want, update proposal
- If "Add another": Ask what it should cover, add to structure
- If "Remove": Confirm and remove from structure, renumber
- If "Different approach": Listen to their suggestion, revise entirely

Show updated structure after each change.

Continue iterating until engineer approves.

---

### Step 8: Update Milestones File

Once approved, update `.context/[task-id]/milestones.md`:

1. **Preserve completed milestones** - Keep their full descriptions intact
2. **Update current milestone** - If modified
3. **Add new milestones** - With "Not Started" status
4. **Update "Current Milestone" pointer** - Keep it on current milestone
5. **Update total count** - Reflect new milestone total

**Example updated milestones.md:**

```markdown
# Milestones for [Feature Name] ([task-id])

Current Milestone: 4
Total Milestones: 6

---

## Milestone 1: [Title] ✅ Complete

[Original description - preserved]

**Status**: Complete
**Completed**: 2026-05-26

---

## Milestone 2: [Title] ✅ Complete

[Original description - preserved]

**Status**: Complete
**Completed**: 2026-05-26

---

## Milestone 3: [Title] ✅ Complete

[Original description - preserved]

**Status**: Complete  
**Completed**: 2026-05-26

---

## Milestone 4: [Updated Title] 🔵 In Progress

**Updated**: 2026-05-26
**Reason for update**: [Brief explanation of why milestone was modified]

[Updated description if modified, or original if unchanged]

What to implement:
- [Original tasks]
- [New tasks if added]

**Status**: In Progress
**Started**: [Original start date]

---

## Milestone 5: [New Title] ⬜ Not Started

**Added**: 2026-05-26
**Reason**: [Why this milestone was added]

[New description]

What to implement:
- [Task 1]
- [Task 2]

**Status**: Not Started

---

## Milestone 6: [New Title] ⬜ Not Started

**Added**: 2026-05-26
**Reason**: [Why this milestone was added]

[New description]

What to implement:
- [Task 1]
- [Task 2]

**Status**: Not Started
```

---

### Step 9: Create Replan Record

Create `.context/[task-id]/replan-[date].md` to document why the plan changed:

```markdown
# Replan - [Date]

## Context

**Milestone position when replan occurred**: Milestone [N] of [Original Total]

**Milestones completed**: [N-1]

**Date**: 2026-05-26

---

## Reason for Replanning

[Engineer's explanation of what changed and why]

---

## New Requirements

[Summary of new requirements that emerged]

---

## Original Milestone Structure

[Copy of the original milestone list from before replan]

---

## Updated Milestone Structure

[Copy of the new milestone list after replan]

---

## Changes Made

**Modified Milestones:**
- Milestone [N]: [What changed and why]

**Added Milestones:**
- Milestone [N+1]: [What it covers and why needed]
- Milestone [N+2]: [What it covers and why needed]

**Removed Milestones:**
- [If any]

---

## Impact

**Scope change**: [Small/Medium/Large]

**Additional work**: [Description]

**Dependencies**: [Any new dependencies]

**Risks**: [Any risks identified]
```

---

### Step 10: Confirm Next Steps

Tell the engineer:

```
✅ Milestone plan updated!

BEFORE REPLAN:
- Total: [X] milestones
- Current: Milestone [N]
- Remaining: [X-N] milestones

AFTER REPLAN:
- Total: [Y] milestones  
- Current: Milestone [N] (modified/unchanged)
- Remaining: [Y-N] milestones

NEW MILESTONES ADDED:
- Milestone [N+1]: [Title]
- Milestone [N+2]: [Title]

FILES UPDATED:
- .context/[task-id]/milestones.md (updated structure)
- .context/[task-id]/replan-[date].md (replan record)

---

NEXT STEPS:

1. Continue working on current Milestone [N]
2. When ready, use #xoch-advance to complete and move to Milestone [N+1]
3. Continue advancing through new milestones as before

You can replan again anytime if more requirements emerge.
```

---

## Important Notes

- **Replanning is normal** - Requirements evolve as you learn
- **Preserve history** - Never delete or modify completed milestones
- **Document why** - The replan record explains decisions for future reference
- **Be flexible** - Can replan multiple times if needed
- **Engineer decides** - Your proposals are suggestions, engineer has final say
- **Keep advancing** - After replan, continue using #xoch-advance normally

---

## Example Interaction

**Agent**: [Auto-detects task from current.md]

**Agent**:
```
Found active task: payment-fix - Payment Processing Fix

Current milestone status:
✅ Milestone 1: Fix backend validation - Complete
✅ Milestone 2: Update database queries - Complete
✅ Milestone 3: Add error handling - Complete
🔵 Milestone 4: Testing and deployment - In Progress (Current)

You're on Milestone 4 of 4.
```

**Agent**: "What new requirements or changes have emerged?"

**Engineer**: "While testing, we realized users have no visibility into whether the fix worked. We need to add response messaging so they know the payment was retried successfully. Also need to update the frontend to display these messages."

**Agent**: "Does this change affect work already completed in milestones 1-3?"

**Engineer**: "No, backend work is solid. This is all new frontend work."

**Agent**: "Should the response messaging be part of the current testing milestone, or separate?"

**Engineer**: "Separate - it's substantial new work."

**Agent**: "How many pieces are involved? Backend API changes, frontend display, anything else?"

**Engineer**: "Backend needs to return structured messages, frontend needs a toast notification system, and we should add it to the admin panel too."

**Agent**:
```
🔄 PROPOSED MILESTONE UPDATES

ANALYSIS OF NEW REQUIREMENTS:
Users need visibility into payment retry success. Requires:
- Backend API updates for structured messaging
- Frontend toast notification system
- Admin panel integration

Key changes needed:
- Backend response format changes
- New UI components for notifications
- Admin panel updates

---

PROPOSED NEW STRUCTURE:

✅ Milestone 1: Fix backend validation - Complete
✅ Milestone 2: Update database queries - Complete
✅ Milestone 3: Add error handling - Complete
🔵 Milestone 4: Backend testing and API prep - In Progress (Current)
   MODIFIED: Narrowed scope to backend testing + prep for messaging API
   
➕ Milestone 5: Add structured response messaging - Not Started
   NEW: Backend API changes for user-facing messages
   What to implement:
   - Define message schema/types
   - Update API responses to include messages
   - Add message generation logic
   - Test message delivery
   
➕ Milestone 6: Frontend toast notification system - Not Started
   NEW: UI for displaying retry success messages
   What to implement:
   - Build toast notification component
   - Integrate with payment processing
   - Handle success/error message display
   - Add auto-dismiss and interaction
   
➕ Milestone 7: Admin panel message display - Not Started
   NEW: Show retry messages in admin interface
   What to implement:
   - Add message column to admin payment view
   - Format message display
   - Test admin visibility

---

RATIONALE:
Milestone 4: Keeping current testing work, adding API prep as bridge to messaging
Milestone 5: Backend-first approach - establish message structure
Milestone 6: Frontend display - depends on backend message format
Milestone 7: Admin visibility - final polish

IMPACT ASSESSMENT:
Scope change: Medium
Additional time estimate: ~2-3 additional days
Dependencies: Frontend (M6) depends on backend messaging (M5)
Risks: Message schema needs careful design to avoid future changes
```

**Agent**: "Review the proposed milestone structure. Options: 1) Approve, 2) Modify milestone X, 3) Add another, 4) Remove milestone X, 5) Different approach"

**Engineer**: "Looks good but milestone 6 and 7 can probably be combined - both are just display work."

**Agent**: [Updates structure to combine M6 and M7]

**Agent**: "Updated structure ready. Approve?"

**Engineer**: "Approved"

**Agent**:
```
✅ Milestone plan updated!

BEFORE REPLAN:
- Total: 4 milestones
- Current: Milestone 4
- Remaining: 1 milestone

AFTER REPLAN:
- Total: 6 milestones
- Current: Milestone 4 (scope narrowed)
- Remaining: 3 milestones

NEW MILESTONES ADDED:
- Milestone 5: Add structured response messaging
- Milestone 6: Frontend and admin message display

FILES UPDATED:
- .context/payment-fix/milestones.md (updated structure)
- .context/payment-fix/replan-2026-05-26.md (replan record)

NEXT STEPS:
1. Continue working on Milestone 4 (backend testing + API prep)
2. Use #xoch-advance to complete and move to Milestone 5
3. Continue advancing through new milestones

You can replan again anytime if more requirements emerge.
```
