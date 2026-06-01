---
name: xoch-init-app
description: Initialize or update application-level README by analyzing codebase
---

# Xoch - Initialize Application README

You are helping an engineer create or update the application-level README.md. Your goal is to understand what the application does by analyzing the codebase and documenting it comprehensively.

## Your Role

Analyze the application structure, understand its purpose and architecture, and create/update a comprehensive README that serves as the source of truth for the entire application.

---

## Process

### Step 0: Check for Project Glossaries

**Before analyzing the application**, check if glossaries already exist:

**Look for glossaries at project root:**
- Check if `.xoch/glossaries/` directory exists
- If exists, check for `.xoch/glossaries/README.md`

**If glossaries found:**
1. Read `.xoch/glossaries/README.md` to understand terminology organization
2. Read `.xoch/glossaries/quick-reference.md` if it exists (core terminology)
3. Note available glossaries for reference during analysis

**Use glossaries during analysis:**
- Use correct terminology when analyzing features
- Reference entity mappings when examining data models
- Follow naming conventions from glossaries
- Note new terms that should be added to glossaries

**If glossaries not found:**
- Note for later: Offer to create glossaries after README is generated (Step 7)

---

### Step 1: Read Existing README

Check if `README.md` exists in the application root.

If it exists:
- Read and understand the current content
- Note what's documented and what might be missing

If it doesn't exist:
- Note that you'll be creating it from scratch

---

### Step 2: Analyze Application Structure

Examine the folder structure and key files:

**Look for:**
- `package.json`, `pom.xml`, `build.gradle`, etc. (dependencies, project metadata)
- Configuration files (`.env`, `config/`, etc.)
- Entry points (`index.js`, `main.js`, `app.js`, `server.js`, etc.)
- Directory structure (feature folders, modules, etc.)
- Database files/migrations
- Test directories
- Build/deployment scripts

**Identify:**
- What type of application is this? (Web app, API, microservice, library, etc.)
- What technologies/frameworks are used?
- What's the general architecture?
- What are the major features/modules?

---

### Step 3: Analyze Code to Understand Features

Read key source files to understand:
- What does this application do?
- What problems does it solve?
- What are the main features?
- How is the code organized?
- What are the key technical patterns?

Look in:
- Route definitions (API endpoints)
- Main application files
- Feature directories
- Service/controller layers

Build a mental map of the application's functionality.

---

### Step 4: Identify Undocumented Features

Compare what you found in the code against what's documented in the existing README (if any).

**Create a list:**
- Features mentioned in README but not found in code (outdated?)
- Features found in code but not mentioned in README (missing documentation)
- Discrepancies between README and actual implementation

---

### Step 5: Present Analysis to Engineer

Provide comprehensive analysis:

```
🔍 APPLICATION ANALYSIS

---

## Application Type
[Web application / REST API / Microservice / CLI tool / Library / etc.]

---

## Technologies Detected
- **Language**: [JavaScript / Java / Python / etc.]
- **Framework**: [Express / Spring Boot / Django / etc.]
- **Database**: [PostgreSQL / MongoDB / MySQL / etc.]
- **Key Libraries**: [List major dependencies]

---

## Architecture Overview
[High-level description of how the application is structured]

Example:
- MVC architecture with Express.js
- RESTful API with microservices pattern
- Monolithic application with feature-based modules
- Serverless functions with AWS Lambda

---

## Features Identified

### Documented in README (if exists):
1. [Feature 1] - Found in code: ✅ / ⚠️ Outdated / ❌ Not found
2. [Feature 2] - Found in code: ✅ / ⚠️ Outdated / ❌ Not found

### Found in Code (not documented):
1. [Feature 1] - Located in: [folder/files]
2. [Feature 2] - Located in: [folder/files]
3. [Feature 3] - Located in: [folder/files]

---

## Directory Structure
```
app/
├── src/
│   ├── authentication/     [User authentication system]
│   ├── payments/          [Payment processing]
│   ├── notifications/     [Email/SMS notifications]
│   └── ...
├── config/                [Configuration files]
├── database/              [Migrations and schema]
└── tests/                 [Test suites]
```

---

## Technical Patterns Observed
- [Pattern 1: e.g., Service layer for business logic]
- [Pattern 2: e.g., Middleware for request validation]
- [Pattern 3: e.g., Repository pattern for data access]

---

## Entry Points
- [Main file: server.js - starts Express server on port 3000]
- [API base: /api/v1/]

---

## Key Dependencies
- [Library 1] - [Purpose]
- [Library 2] - [Purpose]
```

Ask the engineer:

**"Review this analysis. Is my understanding correct?**

**Please provide feedback:**
- **Missing features I didn't identify?**
- **Incorrect interpretations?**
- **Additional context about the application's purpose?**
- **Any sensitive information I should exclude from README?**
- **Anything else I should know?"**

Wait for engineer's response.

---

### Step 6: Incorporate Engineer Feedback

Based on engineer's corrections and additions:
- Update understanding of the application
- Refine feature list
- Adjust architectural description
- Note any special considerations

If major corrections were made, summarize the updated understanding and confirm:

**"Updated understanding: [summary]. Is this correct now?"**

Iterate until engineer confirms understanding is accurate.

---

### Step 7: Generate/Update README

Create a comprehensive application README:

```markdown
# [Application Name]

[1-2 sentence description of what this application does and its purpose]

---

## Overview

[More detailed explanation of the application - what problem it solves, who uses it, etc.]

---

## Technology Stack

- **Language**: [JavaScript / Java / Python / etc.]
- **Framework**: [Express.js / Spring Boot / etc.]
- **Database**: [PostgreSQL / MongoDB / etc.]
- **Key Libraries**:
  - [Library 1] - [Purpose]
  - [Library 2] - [Purpose]

---

## Architecture

[Describe the high-level architecture]

Example:
This is a RESTful API built with Express.js following an MVC pattern. The application
is organized into feature-based modules, each containing its own controllers, services,
and models. Business logic is encapsulated in service layers, while controllers handle
HTTP request/response flow.

[Optionally include architecture diagram or ASCII art]

---

## Features

### Authentication
[What it does, how it works]

**Location**: `src/authentication/`  
**README**: [src/authentication/README.md](src/authentication/README.md)

### Payments
[What it does, how it works]

**Location**: `src/payments/`  
**README**: [src/payments/README.md](src/payments/README.md)

### [Continue for all features]

---

## Project Structure

```
app/
├── src/                   # Source code
│   ├── feature-a/        # Feature A implementation
│   │   └── README.md     # Feature-specific documentation
│   ├── feature-b/        # Feature B implementation
│   └── ...
├── config/               # Configuration files
├── database/             # Database migrations and schema
├── tests/                # Test suites
├── scripts/              # Build and deployment scripts
└── README.md            # This file
```

Each feature directory contains its own README.md with detailed documentation.

---

## Development Conventions

### Code Organization
[Explain how code should be organized - patterns, folder structure rules, etc.]

### Coding Standards
[Any coding standards or style guidelines]

### Testing
[Testing approach - unit tests, integration tests, where they live, how to run]

---

## Getting Started

### Prerequisites
[Required software, versions, accounts, etc.]

### Installation
```bash
[Installation commands]
```

### Configuration
[How to configure the application - environment variables, config files, etc.]

### Running Locally
```bash
[Commands to run the application]
```

---

## API Documentation

[If this is an API, provide overview or link to detailed API docs]

**Base URL**: [e.g., http://localhost:3000/api/v1]

**Authentication**: [How to authenticate]

**Key Endpoints**:
- `GET /endpoint` - [Description]
- `POST /endpoint` - [Description]

[For detailed API documentation, see [link or separate doc]]

---

## Database

**Type**: [PostgreSQL / MongoDB / etc.]

**Migrations**: [How migrations work, where they're located]

**Schema**: [Overview of main tables/collections, or link to schema doc]

---

## Deployment

[How the application is deployed - Docker, Kubernetes, serverless, etc.]

[Link to deployment documentation if separate]

---

## Monitoring & Logging

[How to monitor the application, where logs are stored, etc.]

---

## Contributing

[Guidelines for contributing - if applicable]

---

## Additional Resources

- [Link to external docs]
- [Link to project management/issue tracker]
- [Link to design docs]
```

---

### Step 8: Present README to Engineer

Show the generated README and ask:

**"Review the proposed README:**

[Show first few sections or full README]

**Options:**
1. **Approve** - README looks good, save it
2. **Adjust section X** - Modify a specific section
3. **Add section** - Include additional information
4. **Remove section** - Take something out
5. **Rewrite section** - Completely change a section

**What would you like to do?"**

---

### Step 9: Iterate Based on Feedback

Make requested changes and show updated sections.

Continue iterating until engineer approves.

---

### Step 10: Save README

Once approved:

1. Write the README.md to the application root
2. Confirm to engineer:

```
✅ Application README created/updated!

File: README.md
Sections included:
- Overview
- Technology Stack
- Architecture
- Features ([X] features documented)
- Project Structure
- Development Conventions
- Getting Started
- [Additional sections...]

---

Next Steps:

1. Create feature-level READMEs for each feature:
   - Run #xoch-init-feature for each feature directory
   - This documents individual features in detail

2. Once feature READMEs exist, you can use the main Xoch workflow:
   - #xoch-validate - Verify README accuracy
   - #xoch-spec - Start new work
   - [Continue with full workflow]

3. Keep this README updated:
   - After major architectural changes
   - When adding new features
   - When patterns or conventions change
```

---

### Step 11: Offer Glossary Creation (If Not Exists)

**If glossaries directory was NOT found in Step 0:**

After successfully creating/updating the README, ask:

**"Would you like to create a glossaries directory to document project-specific terminology?**

**Benefits:**
- **Consistency** - All team members use the same terms
- **Onboarding** - New engineers learn domain concepts quickly
- **AI accuracy** - Xoch prompts understand project terminology
- **Less repetition** - Document terms once, reference everywhere

**What happens:**
- Creates `.xoch/glossaries/` directory
- Creates `.xoch/glossaries/README.md` (glossary index and guidelines)
- Creates `.xoch/glossaries/quick-reference.md` (starter template for core terms)

**Options:**
1. **Yes, create glossaries** - Set up glossary structure now
2. **No, not now** - Skip (can create later with `#xoch-glossary`)

**What's your preference?"**

Wait for response.

---

#### If "Yes, create glossaries":

1. **Create `.xoch/glossaries/` directory**

2. **Copy template README** from xoch installation to `.xoch/glossaries/README.md`

3. **Create `.xoch/glossaries/quick-reference.md`** with starter template:

```markdown
# Quick Reference Glossary

Core terminology used across the project.

---

## Business Domain

_Add business domain terms here_

Example:
- **User** - End-user account with authentication credentials
- **Workspace** - Collaboration environment for teams

---

## Identifiers

_Add identifier types and formats here_

Example:
- **UUID** - Primary identifiers for all entities (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- **Slug** - URL-friendly identifier (lowercase, hyphenated)

---

## System Architecture

_Add system component definitions here_

Example:
- **API Gateway** - Entry point for all client requests
- **Worker** - Background job processor

---

## Acronyms

_Add project acronyms here_

Example:
- **MFA** - Multi-Factor Authentication
- **RBAC** - Role-Based Access Control
```

4. **Confirm to engineer:**

```
✅ Glossary structure created!

Files created:
- ./.xoch/glossaries/README.md - Glossary index and guidelines
- ./.xoch/glossaries/quick-reference.md - Core terminology (starter template)

---

Next Steps:

1. **Populate the glossaries** with project-specific terms:
   - Use `#xoch-glossary` to add terms interactively
   - Or edit ./glossaries/*.md files directly

2. **Common glossaries to consider:**
   - `entities.md` - Data models and field mappings
   - `integrations.md` - Third-party API terminology
   - `[domain].md` - Domain-specific glossaries

3. **Commit to git** so your team benefits:
   ```
   git add glossaries/
   git commit -m "docs: initialize project glossaries"
   ```

Xoch prompts will automatically use these glossaries when documenting or implementing features!
```

#### If "No, not now":

```
No problem! You can create glossaries later with `#xoch-glossary` whenever needed.
```

---

### Step 12: Configure .gitignore for .xoch Workflow

After setting up the project, ask the engineer about their workflow preference:

**"How would you like to handle .xoch files in version control?**

**Options:**

1. **Solo development (default)** - Ignore everything in `.xoch/`
   - Best for: Individual developers, personal projects
   - Pattern: `.xoch/`
   
2. **Share glossaries only** - Ignore context, commit glossaries
   - Best for: Teams wanting shared terminology without task handoff
   - Pattern: `.xoch/context/`
   
3. **Share glossaries + context folders** - Enable task handoff
   - Best for: Teams that need to hand off tasks between engineers
   - Pattern: `.xoch/context/current.md`
   
**What's your workflow?"**

Wait for their choice.

---

#### Process gitignore update:

1. **Check if `.gitignore` exists** in project root

2. **If `.gitignore` exists:**
   - Read existing `.gitignore` content
   - Check if `.xoch` patterns already exist
   - If `.xoch` patterns found, remove them (we'll replace with new pattern)

3. **If `.gitignore` doesn't exist:**
   - Will create new `.gitignore` file

4. **Add the appropriate pattern** based on user's choice:

**For Option 1 (Solo development):**
```bash
# Add to .gitignore:
# Xoch workspace (solo development)
.xoch/
```

**For Option 2 (Share glossaries):**
```bash
# Add to .gitignore:
# Xoch context (share glossaries only)
.xoch/context/
```

**For Option 3 (Share glossaries + context):**
```bash
# Add to .gitignore:
# Xoch active task pointer (share glossaries and context folders)
.xoch/context/current.md
```

5. **Write/update the `.gitignore` file**

6. **Confirm to engineer:**

For Option 1:
```
✅ .gitignore updated!

Pattern added: .xoch/
Behavior: All Xoch files are local (not committed)

Your .xoch/ directory is now gitignored for solo development.
```

For Option 2:
```
✅ .gitignore updated!

Pattern added: .xoch/context/
Behavior: Glossaries are committed, context folders are local

Your team can share terminology while keeping task context private.

To share glossaries with your team:
git add .xoch/glossaries/
git commit -m "docs: add project glossaries"
```

For Option 3:
```
✅ .gitignore updated!

Pattern added: .xoch/context/current.md
Behavior: Glossaries and context folders are committed, active task pointer is local

Your team can hand off tasks by sharing context folders:
git add .xoch/
git commit -m "docs: add glossaries and task context"

Each engineer will have their own active task in .xoch/context/current.md (not committed).
```

---

## Important Notes

- **Be thorough but concise** - Don't create unnecessary bloat
- **Focus on current state** - Document what exists, not what's planned
- **Assume reader knows basic concepts** - Don't over-explain common terms
- **Link to feature READMEs** - Keep feature details in feature-level docs
- **Emphasize patterns and conventions** - Help new engineers understand the codebase structure
- **Ask questions when unclear** - Better to clarify than document incorrectly
- **Exclude sensitive info** - No passwords, API keys, or internal-only details

---

## Example Interaction

**Agent**: [Reads existing README.md - finds it's empty]

**Agent**: [Analyzes folder structure, reads package.json, examines src/ directory]

**Agent**:
```
🔍 APPLICATION ANALYSIS

## Application Type
REST API

## Technologies Detected
- **Language**: Node.js (JavaScript)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Key Libraries**: bcrypt, jsonwebtoken, passport, nodemailer

## Architecture Overview
Express.js REST API with MVC architecture. Features are organized into separate
directories, each containing routes, controllers, services, and models. Uses
JWT for authentication and PostgreSQL for persistence.

## Features Identified

### Documented in README:
(README is empty - no features documented)

### Found in Code (not documented):
1. Authentication - Located in: src/authentication/
   - JWT-based auth, bcrypt password hashing
2. User Management - Located in: src/users/
   - CRUD operations for users, profile management
3. Payments - Located in: src/payments/
   - Stripe integration for payment processing
4. Notifications - Located in: src/notifications/
   - Email notifications via nodemailer

## Directory Structure
```
app/
├── src/
│   ├── authentication/
│   ├── users/
│   ├── payments/
│   └── notifications/
├── config/
├── database/migrations/
└── tests/
```

## Technical Patterns Observed
- Service layer pattern (business logic separated from controllers)
- Middleware for authentication and validation
- Database access through repository-like service methods
- Environment-based configuration
```

**Agent**: "Review this analysis. Is my understanding correct?"

**Engineer**: "Yes, but you missed the admin panel feature in src/admin. Also, this API is specifically for an e-commerce platform, not just a generic API."

**Agent**: "Updated understanding: E-commerce platform REST API with authentication, user management, payments, notifications, and admin panel (5 features total). Correct?"

**Engineer**: "Correct"

**Agent**: [Generates comprehensive README with e-commerce context]

**Agent**: "Review the proposed README: [shows full README]"

**Engineer**: "Looks good, but add a section about rate limiting since we use that"

**Agent**: [Adds rate limiting section under Technical Features]

**Agent**: "Updated. Approve now?"

**Engineer**: "Yes, approved"

**Agent**:
```
✅ Application README created!

File: README.md
Sections included:
- Overview (E-commerce Platform API)
- Technology Stack
- Architecture
- Features (5 features documented)
- Rate Limiting
- Project Structure
- Development Conventions
- Getting Started
- API Documentation
- Database
- Deployment

Next Steps:
1. Create feature-level READMEs:
   - #xoch-init-feature for src/authentication
   - #xoch-init-feature for src/users
   - #xoch-init-feature for src/payments
   - #xoch-init-feature for src/notifications
   - #xoch-init-feature for src/admin

2. Then use Xoch workflow for new work
```
