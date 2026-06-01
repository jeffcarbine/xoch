---
name: xoch-resume
description: Resume a paused or archived task
---

# Xoch - Resume Task

You are helping an engineer resume work on a previously paused or archived task.

## Your Role

Load a task back into active context, whether it was paused for parallel work or archived after completion. Show the engineer where they left off and what needs to happen next.

---

## Process

### Step 0: Check for Existing Active Task

Read `.xoch/current.md` to see if there's already an active task.

**If active task exists:**

```
⚠️  ACTIVE TASK DETECTED

Current task: [task-id] - [feature-name]

You need to pause this task before resuming another.

Options:
1. Pause current task first: #xoch-pause
2. Continue with current task: #xoch-advance
3. Cancel resume operation

What would you like to do?
```

Wait for their choice. If they choose to pause, guide them to use `#xoch-pause` first, then come back.

---

### Step 1: Find Available Tasks

**Scan for paused tasks:**
```bash
ls .xoch/ | grep -v current.md | grep -v archive
```

**Scan for archived tasks:**
```bash
ls .xoch/archive/ 2>/dev/null
```

**If no tasks found:**

```
❌ NO TASKS FOUND

No paused or archived tasks available.

Start a new task with: #xoch-spec
```

Stop execution.

---

### Step 2: Ask Which Task to Resume

**If Task ID was provided** (e.g., `#xoch-resume auth-oauth`):
- Use that Task ID directly
- Skip to Step 3

**If no Task ID provided**, show available tasks:

```
📋 AVAILABLE TASKS

Paused Tasks (.xoch/):
  • [task-id-1] - [feature-name-1]
  • [task-id-2] - [feature-name-2]

Archived Tasks (.xoch/archive/):
  • [task-id-3] - [feature-name-3] (completed [date])
  • [task-id-4] - [feature-name-4] (completed [date])

Which task would you like to resume?

Enter Task ID:
```

Wait for their response.

---

### Step 3: Locate Task Files

Try these locations in order:
1. `.xoch/[task-id]/` (paused task)
2. `.xoch/archive/[task-id]-[date]/` (archived task - try most recent)

**If task not found:**

```
❌ TASK NOT FOUND

Task [task-id] not found in:
- .xoch/[task-id]/
- .xoch/archive/[task-id]-*/

Available tasks: [list from Step 2]

Try again with: #xoch-resume [valid-task-id]
```

Stop execution.

---

### Step 4: Restore Archived Task (if needed)

**If task is in archive:**

```
📦 ARCHIVED TASK DETECTED

Task: [task-id] - [feature-name]
Archived: [date]
Status: Previously marked complete

This will move the task back to active context for additional work.

Proceed with restore? (y/n)
```

Wait for confirmation.

If yes:
```bash
mv .xoch/archive/[task-id]-[date] .xoch/[task-id]
```

```
✅ Task restored from archive to .xoch/[task-id]/
```

---

### Step 4.5: Token Budget Check (Before Loading Context)

**Resume Phase Token Budget: 8,000 tokens**

**Before loading task context** files:

#### Files to read:
- `.xoch/[task-id]/spec.md` - Requirements
- `.xoch/[task-id]/plan.md` - Implementation approach
- `.xoch/[task-id]/milestones.md` - Progress tracker

#### Process:

1. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch .xoch/[task-id]/spec.md .xoch/[task-id]/plan.md .xoch/[task-id]/milestones.md
   ```

2. **Check against budget:**
   - If estimated tokens < 7,200 (< 90% of budget): **Proceed with reading**
   - If estimated tokens ≥ 7,200 (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To resume this task, I need to load context from:**

**[List with individual token estimates]**

**Total: ~X tokens (Y% of 8,000 token budget)**

**Options:**
1. **Load essential files** (spec.md and milestones.md only)
2. **Proceed anyway** (Load all context files)
3. **Provide brief summary** (Load minimal context, more detail on demand)

**What's your preference?"**

**Wait for response** and adjust accordingly.

---

### Step 5: Load Task Context

Read all task files:
1. `.xoch/[task-id]/spec.md` - Requirements
2. `.xoch/[task-id]/plan.md` - Implementation approach
3. `.xoch/[task-id]/milestones.md` - Progress tracker

---

### Step 6: Analyze Task State

From milestones.md:
- Identify current milestone
- See which milestones are complete
- See which milestones remain

Create a clear picture of where the task stands.

---

### Step 7: Set as Current Task

Create `.xoch/current.md`:

```markdown
# Current Task

**Task ID**: [task-id]
**Feature**: [feature-name]
**Feature README**: [path/to/README.md]
**Resumed**: [Current Date]
```

---

### Step 8: Present Task Summary and Next Steps

```
✅ TASK RESUMED: [task-id]

---

📋 TASK OVERVIEW

Goal: [from spec.md]

Progress:
✅ Milestone 1: [name] - Completed [date]
✅ Milestone 2: [name] - Completed [date]
🔵 Milestone 3: [name] - In Progress
⬜ Milestone 4: [name] - Not Started
⬜ Milestone 5: [name] - Not Started

---

🎯 CURRENT MILESTONE: 3 - [Milestone Title]

What needs to be done:
[Description of current milestone]

Files to work on:
- [file1.js] - [what needs to be done]
- [file2.js] - [what needs to be done]

Testing requirements:
- [test requirement 1]
- [test requirement 2]

---

📚 CONTEXT FROM PREVIOUS WORK

[If milestones 1-2 are complete, summarize what was accomplished]

Milestone 1 ([name]):
- [Key accomplishments]

Milestone 2 ([name]):
- [Key accomplishments]

(See .xoch/[task-id]/milestone-1.md and milestone-2.md for details)

---

🚀 NEXT STEPS

How would you like to proceed?
1. **Continue milestone 3** - Pick up where you left off
2. **Review git changes** - See what's in progress (run git diff)
3. **Replan milestones** - Adjust the plan (#xoch-replan)
4. **Advance milestone** - Mark milestone 3 complete (#xoch-advance)

What's your preference?
```

Wait for their decision and guide accordingly.

---

## Important Notes

### Resuming In-Progress Milestones

If the current milestone is "In Progress":
- Engineer might have uncommitted work
- Check git status: `git diff` and `git diff --staged`
- Let engineer decide whether to continue, commit first, or review

### Resuming After a Pause

Most common scenario - simply picking up where you left off:
- All context intact
- No changes to milestones
- Continue with current milestone

### Resuming Archived Tasks

Less common - reopening completed work for additional changes:
- Task was previously finalized
- Context moved to archive for historical record
- Now needs additional work
- Restores to active context and treated like any paused task

### Memory and Context

**What's Preserved:**
- All specifications and requirements
- Implementation plan and milestones
- Completed milestone snapshots
- Token usage tracking
- All decisions and notes

**What's NOT Preserved:**
- Uncommitted code changes (those are in your git working directory)
- Active terminal sessions
- In-memory state of running processes

---

## Example Interactions

### Scenario 1: Resume with Task ID

**Engineer**: `#xoch-resume auth-oauth`

**Agent**: [Finds task in .xoch/auth-oauth/]

[Reads context files, determines status]

**Agent**:
```
✅ TASK RESUMED: auth-oauth

---

📋 TASK OVERVIEW

Goal: Add OAuth2 login support (Google, GitHub)

Progress:
✅ Milestone 1: Database schema - Completed
🔵 Milestone 2: OAuth service implementation - In Progress
⬜ Milestone 3: API endpoints - Not Started
⬜ Milestone 4: Frontend integration - Not Started

---

🎯 CURRENT MILESTONE: 2 - OAuth Service Implementation

What needs to be done:
Implement OAuthService class with Google and GitHub provider support

Files to work on:
- src/services/OAuthService.js - Implement OAuth flow handlers
- src/middleware/oauth.js - Create OAuth middleware
- tests/unit/OAuthService.test.js - Unit tests

---

🚀 NEXT STEPS

How would you like to proceed?
1. Continue milestone 2 - Pick up where you left off
2. Review git changes - See what's in progress
3. Advance milestone - Mark complete if finished

What's your preference?
```

---

### Scenario 2: Resume without Task ID (Multiple Options)

**Engineer**: `#xoch-resume`

**Agent**:
```
📋 AVAILABLE TASKS

Paused Tasks (.xoch/):
  • auth-oauth - User authentication (Milestone 2 of 4)
  • payment-refunds - Payment processing (Milestone 1 of 3)

Archived Tasks (.xoch/archive/):
  • bug-404 - Fix 404 error page (completed 2026-05-26)

Which task would you like to resume?

Enter Task ID:
```

**Engineer**: `auth-oauth`

**Agent**: [Continues with resuming auth-oauth...]

---

### Scenario 3: Restoring Archived Task

**Engineer**: `#xoch-resume bug-404`

**Agent**:
```
📦 ARCHIVED TASK DETECTED

Task: bug-404 - Fix 404 error page
Archived: 2026-05-26
Status: Previously marked complete

This will move the task back to active context for additional work.

Proceed with restore? (y/n)
```

**Engineer**: `y`

**Agent**:
```
✅ Task restored from archive to .xoch/bug-404/

---

✅ TASK RESUMED: bug-404

Goal: Fix 404 error page styling and messaging

Progress:
✅ All 2 milestones previously completed

This task was completed and archived. What would you like to do?
1. Add new milestones - Extend with additional work
2. Review what was done - See milestone snapshots
3. Replan - Adjust implementation approach

What's your preference?
```

---

## Use Cases

### Daily Workflow

End of day - pause work. Next morning - resume:
```
#xoch-resume feature-name
```

### Bug Interruption

Working on feature, bug comes up:
1. Pause feature: `#xoch-pause`
2. Fix bug: `#xoch-spec` → fix → `#xoch-finalize`
3. Resume feature: `#xoch-resume feature-name`

### Revisiting Old Work

Need to make changes to previously completed work:
```
#xoch-resume old-task-id
```
Task restored from archive, ready for new milestones.

### Parallel Development

Working on multiple features:
- Feature A paused: `.xoch/feature-a/`
- Feature B paused: `.xoch/feature-b/`
- Feature C paused: `.xoch/feature-c/`

Switch between them with `#xoch-resume [feature-name]`
