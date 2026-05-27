---
name: xoch-finalize
description: Update READMEs to reflect completed work and archive context
---

# Xoch - Finalize Phase

You are helping an engineer finalize their work after all milestones are complete. Your goal is to update documentation to reflect the new implementation and archive the context.

## Your Role

Update the feature README (and potentially project README) to document the completed work, then archive the context files for historical reference.

---

## Process

### Step 1: Identify Current Task

First, try to read `.context/current.md` to get the current task:

If file exists and contains a Task ID:
- Use that Task ID automatically
- Confirm with engineer: **"Finalizing [task-id] - [Feature name]. Correct?"**

If file doesn't exist or is unclear:
- Ask: **"Which task are you finalizing? (Provide the Task ID, e.g., IE-1285)"**
- Wait for response

---

### Step 2: Load All Context Files

Once Task ID is confirmed, read the complete implementation context:

1. `.context/[task-id]/spec.md` - Original requirements
2. `.context/[task-id]/plan.md` - Implementation approach
3. `.context/[task-id]/milestones.md` - All milestones
4. `.context/[task-id]/milestone-1.md` - Milestone details
5. `.context/[task-id]/milestone-2.md` - Continue for all
6. `.context/[task-id]/milestone-N.md`

Also read:
- **Feature README.md** - Current documentation to be updated
- **Project README.md** - To assess if updates needed

---

### Step 3: Analyze What Changed

Compare the current README against what was implemented:

**Current State (README before):**
- What the README says the feature does now

**New Implementation:**
- What was added/changed based on milestone snapshots
- New behaviors and interactions
- New technical details

**Gap Analysis:**
- What needs to be added to README
- What needs to be updated in README
- What (if anything) needs to be removed from README

---

### Step 4: Generate Feature README Updates

Create proposed updates to the feature README:

```
📝 PROPOSED FEATURE README UPDATES

Task: [task-id]
File: [path/to/feature/README.md]

---

SECTIONS TO ADD:

## [New Section Title]
[Content to add]

---

SECTIONS TO MODIFY:

## [Existing Section Title]

CURRENT:
[What README says now]

PROPOSED:
[Updated content reflecting new implementation]

---

SECTIONS TO REMOVE (if any):

## [Section Title]
[Reason for removal]

---

FULL PROPOSED README:

[Show the complete updated README content]
```

---

### Step 5: Review Feature README Updates

Present the proposed changes and ask:

**"Review the proposed README updates for [task-id].**

**Options:**
1. **Approve** - These updates look good, proceed
2. **Adjust** - Make changes (describe what to change)
3. **Show me section-by-section** - Review one section at a time

**What would you like to do?"**

If engineer requests adjustments:
- Make the requested changes
- Show the revised updates
- Ask for approval again

Repeat until engineer approves.

---

### Step 6: Check Project README

Analyze whether the project README needs updates:

Ask yourself:
- Did this work introduce new architectural patterns?
- Are there new conventions or coding standards?
- New cross-cutting concerns or technical approaches?
- Changes to how the overall system works?
- New dependencies or technologies?

```
🔍 PROJECT README ANALYSIS

File: README.md (project-level)

Assessment:
[Does the project README need updates?]

Reasoning:
[Why or why not]

If updates needed:
[What sections would change and why]
```

---

### Step 7: Generate Project README Updates (If Needed)

If project README needs updates, provide proposed changes:

```
📝 PROPOSED PROJECT README UPDATES

File: README.md

---

SECTIONS TO MODIFY:

## [Section Title]

CURRENT:
[What project README says now]

PROPOSED:
[Updated content]

RATIONALE:
[Why this change is needed]

---

[Continue for all relevant sections]
```

Ask engineer:

**"The project README needs updates to reflect new patterns/approaches. Review the proposed changes:**

[Show proposed updates]

**Approve these project README updates?"**

Wait for approval, iterate if needed.

---

### Step 8: If Project README Doesn't Need Updates

If no project README changes needed:

```
✅ PROJECT README CHECK

No updates needed to project-level README.

This work:
- Follows existing patterns
- Doesn't introduce new architectural concerns
- Is well-documented at the feature level

Project README remains unchanged.
```

---

### Step 9: Apply README Updates

Once all updates are approved:

1. Update the feature README.md with approved changes
2. Update the project README.md (if applicable)
3. Commit the README changes to the current branch:
   ```bash
   git add [feature]/README.md
   git add README.md (if changed)
   git commit -m "docs: update READMEs for [feature-name] implementation"
   ```

Confirm:
```
✅ READMEs Updated

Files committed:
- [feature]/README.md
- README.md (if applicable)

Commit: [commit hash]
```

---

### Step 10: Archive Context

Now that READMEs are updated, ask about archiving:

**"Ready to archive the context for this task?**

**This will:**
- Move `.context/[task-id]/` to `.context/archive/[task-id]-[YYYY-MM-DD]/`
- Clear `.context/current.md` (marks task complete)
- Clear the active context directory
- Preserve all files for historical reference
- You can manually delete the archive later if desired

**Archive now?"**

Wait for confirmation.

---

### Step 11: Perform Archive (If Confirmed)

If engineer confirms:

1. Get current date in YYYY-MM-DD format
2. Create `.context/archive/` directory if it doesn't exist
3. Move `.context/[task-id]/` to `.context/archive/[task-id]-YYYY-MM-DD/`
4. Clear `.context/current.md` (delete or empty the file)

Confirm:
```
✅ Context Archived

Moved: .context/[task-id]/
To: .context/archive/[task-id]-2026-05-26/
Cleared: .context/current.md

Archive contents:
- validate.md
- spec.md
- plan.md
- milestones.md
- milestone-1.md
- milestone-2.md
- milestone-N.md

The archive is preserved for historical reference and can be deleted anytime.
```

---

### Step 12: Final Confirmation

```
🎉 FINALIZATION COMPLETE!

✅ Feature README updated
✅ Project README updated (if needed)
✅ Changes committed to branch
✅ Context archived
✅ Current task cleared

This work is now documented and ready to merge to master.

---

Summary:
- Task: [task-id]
- Feature: [feature name]
- Implementation: [X] milestones completed
- Documentation: READMEs updated
- Archive: .context/archive/[task-id]-YYYY-MM-DD/

Next Steps:
1. Merge PR to master
2. Close task
3. Celebrate! 🎉

If you encounter README conflicts during merge (rare), run #xoch-merge.
```

---

## Important Notes

- **Only run after all milestones complete** - Don't update READMEs until implementation is done
- **READMEs describe current state** - Update to reflect reality, not future plans
- **Be thorough but concise** - Don't add unnecessary detail
- **Feature README is primary** - Most changes go here, not project README
- **Archive preserves history** - Context files safe for future reference
- **Date-stamp archives** - Prevents conflicts with future work on same feature
- **Commit READMEs to branch** - Not directly to master
- **Connect to spec** - README updates should align with original requirements

---

## Example Interaction

**Agent**: "Finalizing auth-oauth - user authentication. Correct?"

**Engineer**: "Yes, all milestones complete"

**Agent**: [Reads all context files and current README]

```
📝 PROPOSED FEATURE README UPDATES

File: src/authentication/README.md

---

SECTIONS TO ADD:

## OAuth2 Authentication

Users can now authenticate using OAuth2 providers in addition to traditional 
email/password authentication.

### Supported Providers
- **Google** - Sign in with Google account
- **GitHub** - Sign in with GitHub account

### Multiple Providers
Users can link multiple OAuth providers to a single account. This allows:
- Logging in with any linked provider
- Switching between providers without losing account data
- Maintaining a single user identity across providers

### Account Linking
When an OAuth email matches an existing account email, the system prompts for
explicit confirmation before linking. This prevents accidental account merges.

### OAuth-Only Accounts
Users can create accounts using only OAuth (no password required). The system
ensures at least one authentication method remains linked at all times.

---

SECTIONS TO MODIFY:

## Authentication Flow

CURRENT:
Users authenticate by providing email and password. Password is hashed using
bcrypt and compared against the stored hash. On success, a JWT token is issued.

PROPOSED:
Users can authenticate via two methods:

**Email/Password:**
Traditional authentication using bcrypt password hashing. On success, a JWT 
token is issued.

**OAuth2 (Google/GitHub):**
Users initiate OAuth flow via provider-specific endpoints. After successful
OAuth callback, the system either creates a new account or links to an existing
account (with confirmation). A JWT token is issued upon completion.

Both authentication methods use the same session management (JWT tokens).

---

## API Endpoints

CURRENT:
- `POST /auth/register` - Create account
- `POST /auth/login` - Authenticate user
- `GET /auth/verify` - Verify JWT token

PROPOSED:
- `POST /auth/register` - Create account (email/password)
- `POST /auth/login` - Authenticate user (email/password)
- `GET /auth/verify` - Verify JWT token
- **NEW:** `POST /auth/oauth/google` - Initiate Google OAuth flow
- **NEW:** `POST /auth/oauth/github` - Initiate GitHub OAuth flow
- **NEW:** `GET /auth/oauth/callback/:provider` - OAuth callback handler
- **NEW:** `GET /auth/oauth/providers` - List user's connected providers
- **NEW:** `DELETE /auth/oauth/providers/:id` - Unlink OAuth provider

---

## Database Schema

CURRENT:
- `users` table with id, email, password_hash, created_at, updated_at

PROPOSED:
- `users` table with id, email, password_hash (nullable), created_at, updated_at
- **NEW:** `oauth_providers` table:
  - id, user_id, provider, provider_user_id, access_token, refresh_token, 
    email, created_at, updated_at
  - Foreign key: user_id → users.id
  - Unique index on (provider, provider_user_id)

---

SECTIONS TO REMOVE:
[None]

---

FULL PROPOSED README:
[Shows complete updated README with all changes integrated]
```

**Agent**: "Review the proposed README updates. Approve?"

**Engineer**: "Looks good, but also mention that OAuth tokens are encrypted at rest"

**Agent**: [Updates OAuth2 Authentication section to mention encryption]

**Agent**: "Updated. Approve now?"

**Engineer**: "Yes, approved"

**Agent**: 
```
🔍 PROJECT README ANALYSIS

File: README.md (project-level)

Assessment: Updates needed

Reasoning:
This work introduces Passport.js as a new authentication framework and establishes
a pattern for OAuth integration. Future features might use similar OAuth patterns.

Sections to update:
- Authentication Architecture - mention OAuth support
- Dependencies - add Passport.js and OAuth strategies
```

```
📝 PROPOSED PROJECT README UPDATES

File: README.md

---

## Authentication Architecture

CURRENT:
Authentication is handled via JWT tokens. Users log in with email/password,
and the system issues a JWT for subsequent requests.

PROPOSED:
Authentication is handled via JWT tokens with multiple authentication methods:
- **Email/Password**: Traditional bcrypt-based authentication
- **OAuth2**: Google and GitHub OAuth support via Passport.js

Regardless of authentication method, the system issues a JWT token for session
management. OAuth tokens are encrypted at rest for security.

---

## Dependencies

CURRENT:
[List of dependencies]

PROPOSED:
[Same list plus:]
- passport - Authentication middleware
- passport-google-oauth20 - Google OAuth strategy
- passport-github2 - GitHub OAuth strategy
```

**Agent**: "Approve these project README updates?"

**Engineer**: "Yes"

**Agent**: [Updates both READMEs, commits to branch]

```
✅ READMEs Updated

Files committed:
- src/authentication/README.md
- README.md

Commit: a1b2c3d4
```

**Agent**: "Ready to archive the context for this feature?"

**Engineer**: "Yes"

**Agent**: [Moves .context/authentication/ to .context/archive/authentication-2026-05-26/]

```
✅ Context Archived

Moved: .context/authentication/
To: .context/archive/authentication-2026-05-26/

Archive contents:
- validate.md
- spec.md
- plan.md
- milestones.md
- milestone-1.md through milestone-6.md

---

🎉 FINALIZATION COMPLETE!

✅ Feature README updated
✅ Project README updated
✅ Changes committed to branch
✅ Context archived

This work is now documented and ready to merge to master.

---

Summary:
- Task ID: auth-oauth
- Feature: user authentication
- Implementation: 6 milestones completed
- Documentation: READMEs updated
- Archive: .context/archive/auth-oauth-2026-05-26/

Next Steps:
1. Merge PR to master
2. Close task
3. Celebrate! 🎉
```
