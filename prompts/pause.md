---
name: xoch-pause
description: Pause current task to work on another parallel task
---

# Xoch - Pause Task

You are helping an engineer pause the current task so they can start working on a different task in parallel.

## Your Role

Save the current task state and remove it from active context, allowing the engineer to start or resume another task without losing progress on the current one.

---

## Process

### Step 0: Check Current Task

Read `.context/current.md` to see what task is currently active.

**If no current task found:**

**"No active task found. Nothing to pause.**

**Current context is clear - you can start any task with:**
- `#xoch-spec` - Start new task
- `#xoch-resume` - Resume a paused or archived task"**

Stop execution.

---

### Step 0.5: Token Budget Check (Before Reading Context)

**Pause Phase Token Budget: 5,000 tokens**

**Before reading task context** to show status summary:

#### Files to read:
- `.context/[task-id]/spec.md` - What the task is about
- `.context/[task-id]/milestones.md` - Progress (if exists)

#### Process:

1. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch .context/[task-id]/spec.md .context/[task-id]/milestones.md
   ```

2. **Check against budget:**
   - If estimated tokens < 4,500 (< 90% of budget): **Proceed with reading**
   - If estimated tokens ≥ 4,500 (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To show your current task status, I need to read:**

**[List with individual token estimates]**

**Total: ~X tokens (Y% of 5,000 token budget)**

**Options:**
1. **Read minimal context** (just current.md and basic status)
2. **Proceed anyway** (Read all context files)
3. **Skip summary** (Just pause without detailed status)

**What's your preference?"**

**Wait for response** and adjust accordingly.

---

### Step 1: Show Current Task Status

Display what's being paused:

```
🔵 CURRENT TASK

Task ID: [task-id]
Feature: [feature-name]
Status: [current phase - e.g., "In Progress - Milestone 2 of 4"]

Task directory: .context/[task-id]/
```

Then show the current state by reading key context files:

**Read and summarize:**
1. `.context/[task-id]/spec.md` - What this task is about
2. `.context/[task-id]/milestones.md` - Progress through milestones (if exists)
   - Show which milestone is current
   - Show what's been completed

**Present summary:**

```
📊 TASK SUMMARY

Goal: [from spec.md]

Progress:
✅ Milestone 1: [name] - Completed
🔵 Milestone 2: [name] - In Progress
⬜ Milestone 3: [name] - Not Started
⬜ Milestone 4: [name] - Not Started

Last activity: [from milestones.md or timestamps]
```

---

### Step 2: Confirm Pause

Ask the engineer:

**"Ready to pause this task?**

**What happens:**
- Current task removed from active context
- All task files preserved in `.context/[task-id]/`
- You can resume anytime with: `#xoch-resume [task-id]`
- You can start/resume other tasks in parallel

**Proceed with pause? (y/n)"**

Wait for confirmation.

If no, stop execution.

---

### Step 3: Pause the Task

If confirmed:

1. **Remove current.md:**
   ```bash
   rm .context/current.md
   ```

2. **Confirm completion:**

```
⏸️  TASK PAUSED

Task: [task-id] - [feature-name]
Location: .context/[task-id]/

All progress preserved. Resume anytime with:

  #xoch-resume [task-id]

Active context cleared. You can now:
- Start new task: #xoch-spec
- Resume another task: #xoch-resume

Ready for your next task!
```

---

## Important Notes

### What Gets Preserved

**All task files remain intact:**
- `.context/[task-id]/spec.md` - Requirements
- `.context/[task-id]/plan.md` - Architecture
- `.context/[task-id]/milestones.md` - Progress tracking
- `.context/[task-id]/milestone-[N].md` - Snapshots
- Any investigation or replan files

**Nothing is deleted or archived** - just removed from active context.

---

### Parallel Tasks

You can have multiple tasks paused simultaneously:
- `.context/task-1/` - Paused
- `.context/task-2/` - Paused  
- `.context/task-3/` - Paused
- `.context/current.md` - Points to none (or one active task)

Use `#xoch-resume` to switch between them.

---

## Use Cases

### Context Switching

Working on feature A, urgent bug comes up:
1. `#xoch-pause` - Pause feature A
2. `#xoch-spec` - Start bug fix
3. Fix bug, finalize
4. `#xoch-resume` - Return to feature A

### End of Day

Stopping work for the day:
1. `#xoch-pause` - Clear active context
2. Tomorrow: `#xoch-resume` - Pick up where you left off

### Exploring Ideas

Want to try a different approach:
1. `#xoch-pause` - Pause current approach
2. `#xoch-spec` - Start alternative approach
3. Compare both, pick best
4. Archive the unused one

---

## Example Interaction

**Engineer**: `#xoch-pause`

**Agent**: [Reads .context/current.md]

**Agent**:
```
🔵 CURRENT TASK

Task ID: auth-oauth
Feature: User authentication
Status: In Progress - Milestone 2 of 4

Task directory: .context/auth-oauth/

---

📊 TASK SUMMARY

Goal: Add OAuth2 login support (Google, GitHub)

Progress:
✅ Milestone 1: Database schema - Completed
🔵 Milestone 2: OAuth service implementation - In Progress
⬜ Milestone 3: API endpoints - Not Started
⬜ Milestone 4: Frontend integration - Not Started

Last activity: Working on OAuthService class

---

Ready to pause this task?

What happens:
- Current task removed from active context
- All task files preserved in `.context/auth-oauth/`
- You can resume anytime with: #xoch-resume auth-oauth
- You can start/resume other tasks in parallel

Proceed with pause? (y/n)
```

**Engineer**: "y"

**Agent**:
```
⏸️  TASK PAUSED

Task: auth-oauth - User authentication
Location: .context/auth-oauth/

All progress preserved. Resume anytime with:

  #xoch-resume auth-oauth

Active context cleared. You can now:
- Start new task: #xoch-spec
- Resume another task: #xoch-resume

Ready for your next task!
```
