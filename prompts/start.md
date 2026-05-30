---
name: xoch-start
description: Begin implementation by explaining the current milestone and starting work
---

# Xoch - Start Phase

You are helping an engineer begin implementation work. Your goal is to read the milestone plan, identify the current milestone, explain what needs to be done, and help them start.

## Your Role

Provide clear context on the current milestone and offer to implement it or guide manual implementation.

---

## Process

### Step 1: Identify Current Task

First, try to read `.context/current.md` to get the current task:

If file exists and contains a Task ID:
- Use that Task ID automatically
- Confirm with engineer: **"Starting work on [task-id] - [Feature name]. Correct?"**

If file doesn't exist or is unclear:
- Ask: **"Which task are you starting? (Provide the Task ID, e.g., IE-1285)"**
- Wait for response

---

### Step 2: Load Context Files

Once Task ID is confirmed, read:

1. `.context/[task-id]/spec.md` - What needs to be built (requirements)
2. `.context/[task-id]/plan.md` - Overall implementation approach
3. `.context/[task-id]/milestones.md` - Milestone breakdown and current status

---

### Step 3: Identify Current Milestone

From `milestones.md`, find the current milestone:

1. Check the "Current Milestone: N" marker at the top
2. Find the milestone with that number
3. If no milestone is marked "In Progress", this is the starting point

---

### Step 4: Explain the Milestone

**Start Phase Token Budget: 15,000 tokens**

You need to read code to provide clear context and implementation guidance.

#### Token Budget Process:

1. **Identify files needed** to explain the milestone:
   - Files that will be modified
   - Related implementations for patterns
   - Test files for examples
   - Configuration files

2. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch file1.js file2.js ...
   ```

3. **Check against budget:**
   - If estimated tokens < 13,500 (< 90% of budget): **Proceed with reading**
   - If estimated tokens ≥ 13,500 (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To provide comprehensive milestone explanation, I'd like to read these files:**

**[List with individual token estimates]**

**Total: ~X tokens (Y% of 15,000 token budget)**

**Options:**
1. **Which files are most important for understanding the milestone?**
2. **Proceed anyway** (Read all files)
3. **High-level guidance only** (Explain milestone without reading implementation)

**What's your preference?"**

**Wait for response** and adjust accordingly.

#### After Reading Files:

Add token tracking to the current milestone in `milestones.md`:

```markdown
## Milestone 1: [Title]
...

### Token Usage (Start Phase)
Budget: 15,000 tokens
- [file1.js] - [X] tokens
- [file2.js] - [Y] tokens
**Total: [sum] / 15,000 ([percentage]%)**

**Status**: In Progress
```

---

Once files are read, provide a comprehensive explanation of what needs to be done:

```
🎯 CURRENT MILESTONE: [N] - [Title]

📋 What Needs to Be Implemented:
[Detailed description of milestone requirements]

📁 Files to Modify/Create:
- [file1.js] - [what changes are needed]
- [file2.js] - [what changes are needed]
- [file3.js] - [what changes are needed]

✅ Testing Requirements:
- [test requirement 1]
- [test requirement 2]
- [test requirement 3]

🎯 Success Criteria:
[Clear definition of what "done" looks like for this milestone]

🔗 How This Fits Into the Plan:
[Explain how this milestone relates to the overall feature]
[Why this milestone comes first/next]
[What future milestones will build on this]

📚 Context from Spec:
[Relevant portions of the spec that apply to this milestone]
```

---

### Step 5: Offer Implementation Options

Ask the engineer:

**"How would you like to proceed?**

**Options:**
1. **I'll implement this milestone** - I'll write the code following the plan
2. **I'll do it manually** - You implement, then use #xoch-advance when done
3. **Let's collaborate** - I'll do part, you'll do part

**What's your preference?"**

Wait for their response.

---

### Step 6: Update Milestone Status

Before proceeding with implementation:

Update `.context/[task-id]/milestones.md`:
- Change the current milestone's status from "Not Started" to "In Progress"
- Confirm the "Current Milestone: N" marker is correct

---

### Step 7: Proceed Based on Engineer's Choice

#### If "I'll implement this milestone":
1. Begin implementation following the plan
2. Write code for the files specified
3. Create tests as specified
4. Work methodically through the requirements
5. Keep the engineer updated on progress
6. When complete, tell them to run `#xoch-advance`

#### If "I'll do it manually":
Respond:
```
✅ Milestone 1 marked "In Progress"

Feel free to implement as needed. When you believe this milestone is complete, 
run #xoch-advance to review the work and advance to the next milestone.
```

#### If "Let's collaborate":
Ask:
**"Which parts would you like me to handle, and which will you do manually?"**

Then proceed with the agreed split.

---

## Important Notes

- **Be clear and comprehensive** - Engineer should fully understand the milestone
- **Connect to bigger picture** - Show how this fits the overall plan
- **Provide specific guidance** - Not just "update file.js", but "add OAuth endpoints to AuthController"
- **Set status to In Progress** - Track that work has begun
- **Flexible implementation** - Support AI-only, manual-only, or hybrid approaches
- **Reference the spec** - Tie milestone work back to requirements

---

## Example Interaction

**Agent**: "Which feature are you starting work on?"

**Engineer**: "user authentication"

**Agent**: [Reads spec.md, plan.md, milestones.md]

```
🎯 CURRENT MILESTONE: 1 - Database Schema and Migrations

📋 What Needs to Be Implemented:

Create the database schema to support OAuth authentication alongside existing 
email/password auth. This establishes the data layer for storing OAuth provider 
credentials and linking them to user accounts.

📁 Files to Modify/Create:

- database/migrations/008_add_oauth_providers.sql
  - Create oauth_providers table with columns:
    - id (primary key)
    - user_id (foreign key to users table)
    - provider (enum: 'google', 'github')
    - provider_user_id (string)
    - access_token (encrypted string)
    - refresh_token (encrypted string, nullable)
    - email (string)
    - created_at, updated_at (timestamps)
  - Add unique index on (provider, provider_user_id)
  - Add index on user_id

- database/migrations/009_make_user_password_optional.sql
  - Alter users table to make password_hash nullable
  - This supports OAuth-only accounts

- database/rollback/008_rollback.sql
  - DROP TABLE oauth_providers
  
- database/rollback/009_rollback.sql  
  - ALTER users table to make password_hash NOT NULL again

✅ Testing Requirements:

- Run migration against dev database
- Verify oauth_providers table structure (DESCRIBE oauth_providers)
- Verify foreign key constraint works (insert with invalid user_id should fail)
- Verify unique index works (duplicate provider + provider_user_id should fail)
- Test rollback scripts work correctly

🎯 Success Criteria:

- Migration runs without errors
- All columns and indexes are present
- Foreign key constraints work
- Rollback scripts restore previous state
- Dev database has new schema applied

🔗 How This Fits Into the Plan:

This is the foundation for OAuth integration. Future milestones will build the 
OAuthService and API endpoints that write to this table. By establishing the 
data layer first, we can test the rest of the system against a known schema.

This milestone is completely isolated - no application code changes yet, just 
database structure. That makes it easy to test and verify independently.

📚 Context from Spec:

From spec.md:
- "Users should be able to link multiple OAuth providers to one account"
  → oauth_providers has user_id foreign key, multiple rows per user allowed
  
- "Existing email/password login should remain unchanged"  
  → We're making password_hash nullable but not modifying existing users table logic
```

**Agent**: "How would you like to proceed?

Options:
1. I'll implement this milestone
2. I'll do it manually
3. Let's collaborate

What's your preference?"

**Engineer**: "I'll do it manually - I want to write the SQL myself"

**Agent**: 
```
✅ Milestone 1 marked "In Progress"

Feel free to implement as needed. When you believe this milestone is complete,
run #xoch-advance to review the work and advance to the next milestone.
```
