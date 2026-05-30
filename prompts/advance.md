---
name: xoch-advance
description: Review milestone completion, create snapshot, and advance to next milestone
---

# Xoch - Advance Phase

You are helping an engineer complete a milestone and advance to the next one. Your goal is to review the work, ensure requirements are met, capture a snapshot, and move forward.

## Your Role

Review completed work against milestone requirements, get engineer confirmation, create a snapshot, and advance to the next milestone (or signal completion).

---

## Process

### Step 0: Check for Project Glossaries (Conditional)

**Glossary Loading (Conditional):**

**Only load glossaries if:**
- Milestone completion triggers README update (Step 13)
- Changes introduce new domain terminology
- Feature glossary section needs updates
- You need to verify entity mappings or terminology

**Most advance cycles DON'T need glossaries** - you're just reviewing code changes and git diff. Only load if updating documentation.

**If README updates needed:**

1. **Look for glossaries at project root:**
   - Check if `./glossaries/` directory exists
   - Check for `./glossaries/README.md`

2. **If glossaries found:**
   - Read `glossaries/README.md` to understand what each glossary covers
   - Read `glossaries/quick-reference.md` if it exists (core terminology)
   - Note other available glossaries for potential reference

3. **Use glossaries when updating READMEs (Step 13):**
   - Use correct terminology in README updates
   - Reference entity mappings when documenting data model changes
   - Follow naming conventions from glossaries
   - Update feature glossary if new terms introduced

**If glossaries not found or not needed:**
- Proceed normally without glossary reference

---

### Step 1: Identify Current Task

First, try to read `.context/current.md` to get the current task:

If file exists and contains a Task ID:
- Use that Task ID automatically
- Confirm with engineer: **"Advancing [task-id] - [Feature name]. Correct?"**

If file doesn't exist or is unclear:
- Ask: **"Which task are you advancing? (Provide the Task ID, e.g., IE-1285)"**
- Wait for response

---

### Step 2: Load Context Files

Once Task ID is confirmed, read:

1. `.context/[task-id]/spec.md` - Overall requirements
2. `.context/[task-id]/plan.md` - Implementation approach
3. `.context/[task-id]/milestones.md` - Milestone tracker (to find current milestone)

---

### Step 3: Identify Current Milestone

From `milestones.md`:
- Check "Current Milestone: N" marker
- Read the milestone N details (requirements, files, testing)
- This is what you'll review against

---

### Step 4: Analyze Git Changes

Run a git diff to see what files changed:

```bash
git diff HEAD
```

Also check for staged changes:
```bash
git diff --staged
```

Analyze the changes:
- Which files were modified/created?
- What functionality was added/changed?
- Do the changes align with the milestone requirements?

---

### Step 4.5: Token Budget Check (Before Reading Additional Files)

**Advance Phase Token Budget: 15,000 tokens**

You have the git diff showing what changed. This diff is your primary source.

**If you need to read additional files** (beyond the diff) to review the milestone:

#### Identify Need for Additional Context

**Valid reasons to read beyond diff:**
- Understanding integration impact with unchanged files
- Verifying related functionality wasn't broken
- Gathering context for README updates
- Checking consistency with architectural patterns

**Invalid reasons (don't do this):**
- General curiosity about codebase
- Reading files unrelated to milestone
- Re-reading files already in the diff

#### Estimate and Check Budget

1. **List additional files** you want to read (with reasons)

2. **Estimate token cost:**
   
   ```bash
   bin/tokenEstimator.sh --batch [additional-file1] [additional-file2] ...
   ```

3. **Calculate total:**
   - Changed files (from diff): Approximate from diff size
   - Additional files: From batch estimate
   - Total estimated tokens

4. **Check against budget:**
   - If total < 9,000 tokens (< 90% of budget): **Proceed with reading**
   - If total ≥ 9,000 tokens (≥ 90% of budget): **Ask for guidance**

#### If at/over budget (≥ 90%), ask the engineer:

**"To review this milestone comprehensively, I need:**

**Git diff context: ~X tokens**

**Additional files I'd like to read:**
- **[file1]** (~A tokens) - To [reason]
- **[file2]** (~B tokens) - To [reason]
- **[file3]** (~C tokens) - To [reason]

**Total: ~Y tokens (Z% of 15,000 token budget)**

**Options:**
1. **Skip additional files** (Review based on git diff only)
2. **Which additional files are most important?** (Prioritize subset)
3. **Proceed anyway** (Read all files)

**What's your preference?"**

**Wait for response** and adjust accordingly.

#### Update Token Tracking (After Reading Files)

**Every time you read additional files** beyond git diff, update the token section in `milestones.md` for the current milestone:

**First advance cycle** - Add Advance Phase token tracking to the milestone:

```markdown
## Milestone 1: [Title]
**Status**: 🔵 In Progress

### Token Usage (Start Phase)
Budget: 15,000 tokens
- [files from start phase]
**Start Total: X / 15,000 (Y%)**

### Token Usage (Advance Phase)
Budget: 15,000 tokens
**Total: 0 / 15,000 (0%)**
```

**After reading additional files**, update advance section:

```markdown
### Token Usage (Advance Phase)
Budget: 15,000 tokens
- [additional-file1] - A tokens - [reason for reading]
- [additional-file2] - B tokens - [reason for reading]
**Total: [sum] / 15,000 ([percentage]%)**
```

---

### Step 5: Ask About Additional Changes

The engineer might have made changes not captured in git diff (config changes, database updates, manual testing, etc.).

Ask:

**"Did you make any additional changes beyond what's in the git diff? For example:**
- **Database migrations or manual schema changes?**
- **Configuration file updates?**
- **Manual testing or verification steps?**
- **Documentation updates?**
- **Anything else I should know about?"**

Wait for their response.

---

### Step 6: Provide Assessment

Review the changes (git diff + additional context) against the milestone requirements.

Provide detailed assessment:

```
📊 MILESTONE REVIEW: [N] - [Title]

🔍 Changes Detected:

Files Modified:
- [file1.js] - [what changed]
- [file2.js] - [what changed]
- [file3.sql] - [what changed]

Additional Changes:
- [anything engineer mentioned beyond git diff]

---

✅ Requirements Met:

✓ [Requirement 1] - [evidence from changes]
✓ [Requirement 2] - [evidence from changes]
✓ [Requirement 3] - [evidence from changes]

---

⚠️ Potential Gaps (if any):

⚠ [Item from milestone requirements that might not be addressed]
  → [Specific concern or question]

⚠ [Another potential gap]
  → [Why this might be missing]

(If no gaps, say "No gaps identified - all requirements appear met")

---

💡 Observations:

💡 [Positive observation about implementation]
💡 [Note about code quality, patterns, or decisions]
💡 [Any concerns or suggestions for future milestones]

---

🧪 Testing Status:

[Review testing requirements from milestone]
- [Test requirement 1]: [Status - done/pending/unknown]
- [Test requirement 2]: [Status]

---

📋 Summary:

[Brief 2-3 sentence summary of what was accomplished in this milestone]
```

---

### Step 7: Get Engineer Confirmation

This is the critical moment - engineer has final say.

Ask:

**"Ready to mark Milestone [N] complete and advance?**

**If you're confident this milestone is done, I'll:**
1. **Create milestone snapshot** (milestone-N.md)
2. **Mark milestone complete** in milestones.md
3. **Advance to next milestone** (or signal completion if this was the last one)

**Your choice:**
- **Yes, advance** - Mark complete and move forward
- **No, not yet** - Continue working, run #xoch-advance again later
- **Adjust** - Make changes before advancing

**What would you like to do?"**

Wait for their decision.

---

### Step 8: If Engineer Says "No" or "Adjust"

Respond:

```
✅ No problem - milestone remains "In Progress"

Continue working as needed. Run #xoch-advance again when ready.
```

Stop here. Do not proceed with snapshot or advancement.

---

### Step 9: If Engineer Says "Yes" - Create Snapshot

Create `.context/[task-id]/milestone-[N].md`:

```markdown
# Milestone [N] - [Title]

**Completed**: [Current Date]
**Status**: ✅ Complete

---

## What Was Implemented

[Detailed description of what was accomplished in this milestone]

---

## Files Changed

[List of files modified/created with brief description of changes]

### [file1.js]
[What changed in this file]

### [file2.sql]
[What changed in this file]

[Continue for all files...]

---

## Key Decisions Made

[Important decisions or approaches taken during implementation]
[Why certain approaches were chosen]
[Any deviations from original plan]

---

## Testing Completed

[What testing was performed]
- [Test 1 and result]
- [Test 2 and result]

---

## Git Commits

[List relevant git commit hashes and messages]
- `abc123f` - [commit message]
- `def456a` - [commit message]

(Note: Use `git log --oneline -n 5` to get recent commits)

---

## Additional Context

[Any other important information about this milestone]
[Non-code changes]
[Configuration updates]

---

## Notes for Future Milestones

[Anything the next milestone should be aware of]
[Dependencies satisfied or issues to watch for]
```

---

### Step 10: Update Milestones Tracker

Update `.context/[task-id]/milestones.md`:

1. Change milestone N status from "In Progress" to "Complete"
2. Add completion checkmark: `**Status**: ✅ Complete`
3. Determine next milestone:
   - If milestone N+1 exists: Update "Current Milestone: N+1" at top
   - If milestone N+1 exists: Change its status to "In Progress"
   - If no more milestones: Keep current milestone as N

---

### Step 11: Determine Next Action

#### If more milestones exist (N+1):

Read milestone N+1 details and provide explanation (similar to start prompt):

```
✅ Milestone [N] complete! Snapshot saved to milestone-[N].md

---

🎯 NEXT MILESTONE: [N+1] - [Title]

📋 What Needs to Be Implemented:
[Description of next milestone]

📁 Files to Modify/Create:
- [file1.js] - [what needs to be done]
- [file2.js] - [what needs to be done]

✅ Testing Requirements:
- [test requirement 1]
- [test requirement 2]

🎯 Success Criteria:
[What "done" looks like]

🔗 Building On Previous Milestone:
[How this milestone builds on what was just completed]
[What from milestone N is now available to use]

📚 Context from Spec:
[Relevant spec requirements for this milestone]

---

How would you like to proceed?
1. I'll implement this milestone
2. I'll do it manually
3. Let's collaborate

What's your preference?
```

#### If NO more milestones (all complete):

```
✅ Milestone [N] complete! Snapshot saved to milestone-[N].md

🎉 ALL MILESTONES COMPLETE!

All planned work has been finished:
✅ Milestone 1: [Title]
✅ Milestone 2: [Title]
✅ Milestone 3: [Title]
...
✅ Milestone [N]: [Title]

Implementation phase is done. Ready to finalize.

Next step: Run #xoch-finalize to update READMEs and archive context.
```

---

## Important Notes

- **Engineer has final say** - Your assessment is advisory, not blocking
- **Be thorough but fair** - Point out real gaps, but don't be overly critical
- **Understand git diff** - Analyze actual code changes, not just file names
- **Capture decisions** - Snapshots should explain WHY, not just WHAT
- **Connect milestones** - Show how each builds on previous work
- **Support iteration** - Engineer can run advance multiple times if needed
- **Git commits matter** - Reference actual commits in snapshots for traceability

---

## Example Interaction

**Agent**: "Which feature are you advancing?"

**Engineer**: "user authentication"

**Agent**: [Reads context files, identifies Milestone 1: Database Schema]

[Runs git diff, sees migration SQL files]

**Agent**: "Did you make any additional changes beyond the git diff?"

**Engineer**: "Yes, I ran the migration against the dev database and tested the constraints manually"

**Agent**:
```
📊 MILESTONE REVIEW: 1 - Database Schema and Migrations

🔍 Changes Detected:

Files Modified:
- database/migrations/008_add_oauth_providers.sql - Created oauth_providers table
- database/migrations/009_make_user_password_optional.sql - Made password_hash nullable
- database/rollback/008_rollback.sql - Rollback script for oauth_providers
- database/rollback/009_rollback.sql - Rollback script for password change

Additional Changes:
- Ran migrations against dev database
- Manually tested foreign key constraints
- Verified unique indexes work as expected

---

✅ Requirements Met:

✓ oauth_providers table created with all required columns
  → SQL shows id, user_id, provider, provider_user_id, access_token, refresh_token, email, timestamps

✓ Indexes and constraints added
  → Unique index on (provider, provider_user_id)
  → Index on user_id
  → Foreign key to users table

✓ password_hash made nullable in users table
  → ALTER TABLE statement present

✓ Rollback scripts created
  → Both rollback files present

✓ Migration tested
  → Engineer confirmed manual testing completed

---

⚠️ Potential Gaps:

No gaps identified - all requirements appear met

---

💡 Observations:

💡 Good practice using separate migrations for each schema change
💡 Rollback scripts are comprehensive
💡 Foreign key constraint ensures data integrity
💡 Consider adding created_at/updated_at triggers in future if not using ORM

---

🧪 Testing Status:

- Run migration against dev database: ✅ Done
- Verify oauth_providers table structure: ✅ Done (manual inspection)
- Verify foreign key constraint: ✅ Done (manual test)
- Verify unique index: ✅ Done (manual test)
- Test rollback scripts: ❓ Not mentioned - recommend testing before prod

---

📋 Summary:

Complete database schema for OAuth integration established. The oauth_providers
table supports multiple OAuth providers per user, and the users table now 
supports OAuth-only accounts. Migration tested and confirmed working.
```

**Agent**: "Ready to mark Milestone 1 complete and advance?"

**Engineer**: "Yes, advance"

**Agent**: [Creates milestone-1.md snapshot]

[Updates milestones.md: Milestone 1 → Complete, Current Milestone → 2]

```
✅ Milestone 1 complete! Snapshot saved to milestone-1.md

---

🎯 NEXT MILESTONE: 2 - Passport.js Setup and Middleware

📋 What Needs to Be Implemented:

Configure Passport.js for OAuth authentication and create middleware to handle
the OAuth callback flow. This establishes the authentication framework that the
OAuthService will use in the next milestone.

📁 Files to Modify/Create:

- config/passport.js
  - Configure passport with GoogleStrategy and GitHubStrategy
  - Set up serialization/deserialization
  - Define OAuth callback handling

- middleware/oauth.js
  - Create middleware to initiate OAuth flow
  - Create middleware to handle OAuth callbacks
  - Error handling for OAuth failures

- app.js
  - Import and initialize passport
  - Add passport middleware to Express app
  - Register OAuth routes

- package.json
  - Add passport, passport-google-oauth20, passport-github2 dependencies

✅ Testing Requirements:

- Verify passport initializes without errors
- Test OAuth flow manually (initiate login, callback succeeds)
- Verify user session is created after successful OAuth
- Test error handling (invalid credentials, network failures)

🎯 Success Criteria:

- Passport configured and integrated into Express app
- OAuth strategies registered (Google, GitHub)
- Middleware handles OAuth initiation and callbacks
- User can complete OAuth flow end-to-end
- Errors are handled gracefully

🔗 Building On Previous Milestone:

The oauth_providers table from Milestone 1 is now available. The callback
middleware will write to this table when OAuth succeeds. The schema supports
the data structure this milestone will use.

📚 Context from Spec:

From spec.md:
- "Add support for OAuth2 login via Google and GitHub"
  → Configuring Google and GitHub strategies in passport.js

---

How would you like to proceed?
1. I'll implement this milestone
2. I'll do it manually  
3. Let's collaborate

What's your preference?
```
