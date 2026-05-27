---
name: xoch-merge
description: Resolve conflicting README updates from multiple engineers
---

# Xoch - Merge Phase

You are helping an engineer resolve README conflicts that occurred when multiple engineers updated the same README independently. Your goal is to harmonize both sets of changes into a single coherent document.

## Your Role

Analyze both versions of the README, understand what each engineer was trying to document, and propose a merged version that incorporates both sets of changes without losing information.

---

## Process

### Step 1: Identify Conflict Context

Check if `.context/current.md` exists and contains merge conflict information.

If not related to current task, ask the engineer:

**"Which README file has merge conflicts? (Provide the file path)"**

Wait for their response.

---

### Step 2: Read Both Versions

Read the conflicting versions:

1. **Current branch version** (HEAD) - Your changes
2. **Master/main version** - Other engineer's changes
3. **Original version** (merge base) - State before both changes

Use git to get these versions:
```bash
# Current branch (your changes)
git show HEAD:[file-path]

# Master branch (their changes)
git show origin/main:[file-path]

# Common ancestor (original)
git merge-base HEAD origin/main | xargs -I {} git show {}:[file-path]
```

---

### Step 3: Analyze the Changes

Compare all three versions to understand:

**Your Changes (HEAD):**
- What sections were added?
- What sections were modified?
- What sections were removed?
- What was the engineer trying to document?

**Their Changes (master):**
- What sections were added?
- What sections were modified?
- What sections were removed?
- What was the other engineer trying to document?

**Conflict Type:**
- **Complementary**: Both added different features (easy to merge)
- **Overlapping**: Both modified same section (requires careful merge)
- **Contradictory**: Changes describe different behaviors (need clarification)

---

### Step 4: Provide Conflict Analysis

Present a detailed analysis:

```
🔍 README MERGE CONFLICT ANALYSIS

File: [file-path]

---

📝 YOUR CHANGES (Current Branch):

Added Sections:
- [Section title]: [What this documents]

Modified Sections:
- [Section title]: [What changed and why]

Removed Sections:
- [Section title]: [Why removed]

Summary: [What you were documenting]

---

📝 THEIR CHANGES (Master Branch):

Added Sections:
- [Section title]: [What this documents]

Modified Sections:
- [Section title]: [What changed and why]

Removed Sections:
- [Section title]: [Why removed]

Summary: [What they were documenting]

---

🔍 CONFLICT TYPE:

[Complementary / Overlapping / Contradictory]

Details:
[Explanation of why conflicts occurred]

Areas of Conflict:
1. [Specific section/area]: [Nature of conflict]
2. [Specific section/area]: [Nature of conflict]
```

---

### Step 5: Ask for Context

If the conflict type is Overlapping or Contradictory, ask:

**"I need some context to resolve these conflicts:**

**Your Changes:**
- [Question about your work and intent]

**Their Changes:**
- [Question about what the other engineer might have been working on]

**Understanding both contexts will help me merge correctly. What can you tell me?"**

Wait for engineer's response.

---

### Step 6: Propose Merged Version

Based on the analysis and context, create a harmonized version:

```
📄 PROPOSED MERGED README

Strategy: [How you're merging - e.g., "Keep both feature sections, merge overlapping intro"]

---

MERGED SECTIONS:

## [Section Title]

RATIONALE: [Why merged this way]

CONTENT:
[Merged content that incorporates both changes]

---

## [Another Section]

RATIONALE: [Why merged this way]

CONTENT:
[Merged content]

---

[Continue for all sections]

---

FULL MERGED README:

[Complete merged README content]
```

---

### Step 7: Explain Merge Decisions

For each conflict area, explain your decisions:

```
💡 MERGE DECISIONS

Conflict 1: [Section name]
- YOUR version said: [summary]
- THEIR version said: [summary]
- MERGED version: [summary]
- REASONING: [Why this merge approach]

Conflict 2: [Section name]
- YOUR version said: [summary]
- THEIR version said: [summary]
- MERGED version: [summary]
- REASONING: [Why this merge approach]

[Continue for all conflicts]
```

---

### Step 8: Review with Engineer

Ask the engineer:

**"Review the proposed merge:**

[Show key merged sections and reasoning]

**Does this accurately represent both sets of changes?**

**Options:**
1. **Approve** - Merge looks good, apply it
2. **Adjust section X** - Change how a specific section was merged
3. **Show me section Y** - Need more detail on a specific section
4. **Let me handle it manually** - I'll resolve the conflicts myself

**What would you like to do?"**

---

### Step 9: Handle Engineer Response

#### If "Approve":
Proceed to Step 10.

#### If "Adjust section X":
Ask: **"How should section X be merged? Describe the desired outcome."**

Make the adjustment, show the revised section, ask for approval again.

#### If "Show me section Y":
Display that section in detail with before/after/merged comparison.

#### If "Let me handle it manually":
```
✅ No problem

The conflict analysis above should help you understand both sides.

Feel free to manually edit the README to resolve conflicts.
After resolving, mark the conflict as resolved:
  git add [file-path]
  git commit
```

Stop here.

---

### Step 10: Apply Merged Version

Once approved:

1. Write the merged content to the README file
2. Stage the resolved file:
   ```bash
   git add [file-path]
   ```
3. Verify no other conflicts exist:
   ```bash
   git status
   ```

Confirm:
```
✅ README CONFLICT RESOLVED

File: [file-path]
Status: Merged and staged

Summary of Resolution:
- [Your changes]: [Preserved/Modified/Integrated]
- [Their changes]: [Preserved/Modified/Integrated]

The merged README incorporates both sets of changes.

Next steps:
1. Review the merged file one more time
2. Complete the merge: git commit
3. Continue with normal workflow
```

---

### Step 11: Check for Additional Conflicts

If there are other conflicting files:

```
⚠️ Additional conflicts detected:

- [file-path-2]
- [file-path-3]

Would you like me to help resolve these as well?
Run #xoch-merge again for each file.
```

---

## Important Notes

- **Preserve both intents** - Both engineers added value, don't lose either
- **Complementary is easy** - Different sections = just combine
- **Overlapping needs care** - Same section = understand both perspectives
- **Contradictory needs clarification** - Different behaviors = verify which is correct
- **Ask questions** - Don't guess if you're unsure
- **Maintain coherence** - Merged README should read smoothly
- **Rare occurrence** - This shouldn't happen often with Xoch workflow

---

## Example Interaction

**Agent**: "Which README file has merge conflicts?"

**Engineer**: "src/authentication/README.md"

**Agent**: [Reads three versions: HEAD, master, merge-base]

```
🔍 README MERGE CONFLICT ANALYSIS

File: src/authentication/README.md

---

📝 YOUR CHANGES (Current Branch):

Added Sections:
- "OAuth2 Authentication": Documents Google/GitHub OAuth support
- "Multiple Providers": How users can link multiple OAuth providers
- "Account Linking": OAuth email matching existing accounts

Modified Sections:
- "Authentication Flow": Added OAuth as second authentication method
- "API Endpoints": Added OAuth-specific endpoints
- "Database Schema": Added oauth_providers table

Summary: Documenting OAuth2 integration feature

---

📝 THEIR CHANGES (Master Branch):

Added Sections:
- "Multi-Factor Authentication (MFA)": Documents TOTP-based 2FA
- "Recovery Codes": Backup codes for MFA
- "MFA Enforcement": Admin can require MFA for users

Modified Sections:
- "Authentication Flow": Added MFA verification step after password
- "API Endpoints": Added MFA setup and verification endpoints
- "Database Schema": Added mfa_secrets table

Summary: Documenting MFA/2FA feature

---

🔍 CONFLICT TYPE: Complementary with Overlapping Sections

Details:
Both engineers worked on different authentication features:
- You: OAuth2 social login
- Them: Multi-factor authentication (MFA)

These are independent features that can coexist.

Areas of Conflict:
1. "Authentication Flow" section: Both modified to add their respective flows
2. "API Endpoints" section: Both added different endpoints to same list
3. "Database Schema" section: Both added different tables

These conflicts are straightforward to resolve - both changes can be incorporated.
```

**Agent**: "I need some context - what can you tell me about the MFA work?"

**Engineer**: "Sarah was working on MFA while I was doing OAuth. Both features should coexist. Users can have OAuth login AND MFA enabled."

**Agent**:
```
📄 PROPOSED MERGED README

Strategy: Combine both authentication features (OAuth + MFA). Structure sections
to show both as independent but compatible authentication enhancements.

---

MERGED SECTIONS:

## Authentication Flow

RATIONALE: Both engineers modified this section. Merged to show complete flow
including OAuth option and MFA step. OAuth and MFA can work together (OAuth
login followed by MFA verification).

CONTENT:
Users can authenticate via two methods:

**Email/Password:**
Traditional authentication using bcrypt password hashing. After password
verification, if MFA is enabled, user must provide TOTP code. On success,
a JWT token is issued.

**OAuth2 (Google/GitHub):**
Users initiate OAuth flow via provider-specific endpoints. After successful
OAuth callback, the system either creates a new account or links to an existing
account (with confirmation). If MFA is enabled on the account, user must still
provide TOTP code. A JWT token is issued upon completion.

Both authentication methods use the same session management (JWT tokens) and
both respect MFA settings if enabled.

---

## API Endpoints

RATIONALE: Both engineers added different endpoints. Simple merge - include both.

CONTENT:
**Authentication:**
- `POST /auth/register` - Create account (email/password)
- `POST /auth/login` - Authenticate user (email/password)
- `GET /auth/verify` - Verify JWT token

**OAuth:**
- `POST /auth/oauth/google` - Initiate Google OAuth flow
- `POST /auth/oauth/github` - Initiate GitHub OAuth flow
- `GET /auth/oauth/callback/:provider` - OAuth callback handler
- `GET /auth/oauth/providers` - List user's connected providers
- `DELETE /auth/oauth/providers/:id` - Unlink OAuth provider

**Multi-Factor Authentication:**
- `POST /auth/mfa/setup` - Generate MFA secret and QR code
- `POST /auth/mfa/enable` - Enable MFA after verifying TOTP code
- `POST /auth/mfa/verify` - Verify TOTP code during login
- `POST /auth/mfa/disable` - Disable MFA (requires password)
- `GET /auth/mfa/recovery-codes` - Generate new recovery codes
- `POST /auth/mfa/recover` - Use recovery code to bypass MFA

---

## Database Schema

RATIONALE: Both engineers added different tables. Both needed.

CONTENT:
**Users Table:**
- `users` table with id, email, password_hash (nullable), created_at, updated_at

**OAuth Support:**
- `oauth_providers` table:
  - id, user_id, provider, provider_user_id, access_token, refresh_token,
    email, created_at, updated_at
  - Foreign key: user_id → users.id
  - Unique index on (provider, provider_user_id)

**MFA Support:**
- `mfa_secrets` table:
  - id, user_id, secret, enabled, backup_codes, created_at, updated_at
  - Foreign key: user_id → users.id
  - Unique index on user_id (one MFA config per user)

---

[Additional merged sections...]

---

💡 MERGE DECISIONS

Conflict 1: Authentication Flow
- YOUR version: Added OAuth as authentication option
- THEIR version: Added MFA verification step after password
- MERGED version: Shows both OAuth and MFA, explaining that MFA applies after
  either password or OAuth authentication
- REASONING: Both features are independent but complementary. OAuth users can
  also have MFA enabled, so flow needs to show both.

Conflict 2: API Endpoints
- YOUR version: Added 5 OAuth endpoints
- THEIR version: Added 6 MFA endpoints
- MERGED version: Listed all 11 endpoints under organized categories
- REASONING: No actual conflict - just two engineers adding to the same list.
  Organized by functionality for clarity.

Conflict 3: Database Schema
- YOUR version: Added oauth_providers table
- THEIR version: Added mfa_secrets table
- MERGED version: Documented both tables with clear relationships
- REASONING: Both tables needed, no conflict. Organized by feature area.
```

**Agent**: "Does this accurately represent both sets of changes?"

**Engineer**: "Yes, this looks perfect - captures both features correctly"

**Agent**: [Writes merged content to README.md, stages file]

```
✅ README CONFLICT RESOLVED

File: src/authentication/README.md
Status: Merged and staged

Summary of Resolution:
- Your OAuth changes: Fully preserved and integrated
- Sarah's MFA changes: Fully preserved and integrated
- Combined sections show how features work together

The merged README incorporates both authentication enhancements.

Next steps:
1. Review the merged file one more time
2. Complete the merge: git commit
3. Continue with normal workflow
```
