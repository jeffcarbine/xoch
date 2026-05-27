---
name: xoch-init-feature
description: Initialize or update feature-level README by analyzing feature code
---

# Xoch - Initialize Feature README

You are helping an engineer create or update a feature-level README.md. Your goal is to understand what the feature does by analyzing its code and documenting it comprehensively.

## Your Role

Analyze the feature's implementation, understand its purpose and behavior, and create/update a comprehensive README that serves as the source of truth for this specific feature.

---

## Process

### Step 1: Identify Feature Directory

Ask the engineer:

**"Which feature would you like to document? (Provide the path to the feature directory)"**

Example: `src/authentication/` or `features/payment-processing/`

Wait for their response.

---

### Step 2: Read Existing Feature README

Check if `README.md` exists in the feature directory.

If it exists:
- Read and understand the current content
- Note what's documented and what might be outdated or missing

If it doesn't exist:
- Note that you'll be creating it from scratch

---

### Step 3: Read Application README for Context

Read the application-level `README.md` (in the project root) to understand:
- What type of application this is
- Overall architecture and patterns
- How this feature fits into the larger system
- Any conventions or standards mentioned

This provides context for understanding the feature's role.

---

### Step 4: Analyze Feature Structure

Examine the feature directory contents:

**Look for:**
- Main files (controllers, services, models, routes, etc.)
- Configuration files specific to this feature
- Database models or schemas
- Test files
- Utility functions or helpers
- API route definitions
- UI components (if applicable)

**Identify:**
- What does this feature do? (main purpose)
- How is the code organized within this feature?
- What are the key components?
- What external dependencies does it have?

---

### Step 5: Analyze Code to Understand Functionality

Read the source files to understand:

**Main Questions:**
- What problem does this feature solve?
- What can users do with this feature?
- How does it work technically?
- What are the key functions/methods?
- What data does it manage?
- How does it interact with other features?
- What are the API endpoints (if any)?
- What database tables/collections does it use?
- What external services does it integrate with?

Build a complete picture of the feature's functionality.

---

### Step 6: Identify Integration Points

Determine how this feature interacts with:
- Other features in the application
- External APIs or services
- Database
- Authentication/authorization
- Event systems or message queues

---

### Step 7: Present Analysis to Engineer

Provide comprehensive analysis:

```
🔍 FEATURE ANALYSIS

Feature: [Feature Name]
Location: [path/to/feature/]

---

## Purpose
[What this feature does in 1-2 sentences]

---

## User Perspective
[What users can do with this feature]

Example:
- Users can register accounts with email/password
- Users can log in and receive authentication tokens
- Users can reset forgotten passwords via email

---

## Technical Implementation

### Key Components:
- **[Component 1]**: [Purpose and what it does]
  - File: [filename]
  - Key functions: [list]
  
- **[Component 2]**: [Purpose]
  - File: [filename]
  - Key functions: [list]

### Database:
- **Tables/Collections**: [list]
- **Schema**: [brief overview]

### API Endpoints (if applicable):
- `POST /auth/register` - [What it does]
- `POST /auth/login` - [What it does]
- `GET /auth/verify` - [What it does]

### External Integrations:
- [Service 1]: [How it's used]
- [Service 2]: [How it's used]

---

## How It Works

[Technical flow explanation]

Example:
When a user registers:
1. POST /auth/register receives email and password
2. Password is hashed using bcrypt
3. User record created in database
4. Welcome email sent via notification service
5. JWT token generated and returned

---

## Interactions with Other Features

### Dependencies (this feature needs):
- [Feature A]: [Why and how]
- [Feature B]: [Why and how]

### Dependents (other features that need this):
- [Feature C]: [Why and how]
- [Feature D]: [Why and how]

---

## Current State vs Documentation

### If README exists:
- ✅ Accurate: [What's correctly documented]
- ⚠️ Outdated: [What's changed but not updated]
- ❌ Missing: [What's not documented]

### If README doesn't exist:
- This feature is completely undocumented

---

## Key Technical Details

- **Error Handling**: [How errors are handled]
- **Validation**: [What validation exists]
- **Security**: [Security measures in place]
- **Performance**: [Any performance considerations]
- **Testing**: [What tests exist]

---

## Known Limitations (if any):
- [Limitation 1]
- [Limitation 2]
```

Ask the engineer:

**"Review this analysis. Is my understanding of this feature correct?**

**Please provide feedback:**
- **Missing functionality I didn't identify?**
- **Incorrect interpretations?**
- **Additional context about why this feature exists?**
- **Special edge cases or behaviors?**
- **Any limitations or known issues?**
- **Anything else I should document?"**

Wait for engineer's response.

---

### Step 8: Incorporate Engineer Feedback

Based on engineer's corrections and additions:
- Update understanding of the feature
- Refine functionality description
- Adjust technical details
- Note any special considerations or edge cases

If major corrections were made, summarize the updated understanding and confirm:

**"Updated understanding: [summary]. Is this correct now?"**

Iterate until engineer confirms understanding is accurate.

---

### Step 9: Generate/Update Feature README

Create a comprehensive feature README:

```markdown
# [Feature Name]

[1-2 sentence description of what this feature does]

---

## What It Does

[Detailed explanation from the user's perspective]

Example:
This feature provides user authentication for the application. Users can register
new accounts, log in with their credentials, and reset forgotten passwords. The
system uses JWT tokens for session management and integrates with our notification
system to send welcome and password reset emails.

---

## How It Works

[Technical explanation of the feature]

Example:
Authentication is handled through a combination of bcrypt password hashing and
JWT token generation. When a user registers or logs in, their credentials are
validated, a session token is generated, and the token is returned to the client.
Subsequent requests include this token for authentication.

### Registration Flow
1. User submits email and password
2. System validates email format and password strength
3. Password is hashed using bcrypt (10 rounds)
4. User record created in database
5. Welcome email queued via notification service
6. JWT token generated and returned

### Login Flow
1. User submits email and password
2. System looks up user by email
3. Password hash compared using bcrypt
4. If valid, JWT token generated and returned
5. If invalid, error returned after rate limit check

### Password Reset Flow
1. User requests reset with email
2. Reset token generated and stored
3. Reset email sent with token link
4. User clicks link, submits new password
5. Token validated, password updated

---

## API Endpoints

### `POST /auth/register`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 123,
    "email": "user@example.com"
  }
}
```

**Errors:**
- `400` - Invalid email format
- `400` - Password too weak
- `409` - Email already exists

---

### `POST /auth/login`
Authenticate user and receive token.

[Continue for all endpoints...]

---

## Database Schema

### `users` Table

| Column        | Type      | Description                    |
|---------------|-----------|--------------------------------|
| id            | INTEGER   | Primary key                    |
| email         | VARCHAR   | User's email (unique)          |
| password_hash | VARCHAR   | Bcrypt hashed password         |
| created_at    | TIMESTAMP | Account creation time          |
| updated_at    | TIMESTAMP | Last update time               |

**Indexes:**
- Unique index on `email`

---

## Code Structure

```
authentication/
├── README.md              # This file
├── auth.controller.js     # HTTP request handlers
├── auth.service.js        # Business logic
├── auth.routes.js         # Route definitions
├── user.model.js          # Database model
├── middleware/
│   ├── authenticate.js    # JWT verification middleware
│   └── validate.js        # Input validation
└── tests/
    ├── auth.test.js       # Integration tests
    └── service.test.js    # Unit tests
```

---

## Integration Points

### Dependencies (this feature uses):

**Notification Service** (`src/notifications/`)
- Sends welcome emails on registration
- Sends password reset emails
- Integration: Calls `notificationService.sendEmail()`

**Database**
- Reads/writes to `users` table
- Uses connection pool from `database/connection.js`

**Configuration**
- JWT secret from environment variable `JWT_SECRET`
- Token expiration from `config/auth.js`

### Dependents (features that use this):

**Payment Processing** (`src/payments/`)
- Requires authenticated user to process payments
- Uses authentication middleware

**User Profile** (`src/profile/`)
- Requires authenticated user to view/edit profile
- Retrieves user ID from JWT token

---

## Security Considerations

- Passwords hashed with bcrypt (cost factor: 10)
- JWT tokens expire after 24 hours
- Rate limiting on login endpoint (5 attempts per 15 minutes)
- Password reset tokens expire after 1 hour
- Email verification prevents typosquatting

---

## Testing

### Unit Tests
- `tests/service.test.js` - Business logic tests
- Coverage: 95%

### Integration Tests
- `tests/auth.test.js` - API endpoint tests
- Tests registration, login, password reset flows

### Manual Testing Scenarios
1. Register new user - verify email sent
2. Login with correct credentials - verify token works
3. Login with wrong password - verify error handling
4. Request password reset - verify email sent
5. Use reset token - verify password updated

---

## Known Limitations

- Email verification is asynchronous - users can log in before verifying
- No support for 2FA yet (planned for future)
- Password reset tokens stored in database (consider Redis for production)

---

## Future Enhancements

- Multi-factor authentication (MFA)
- OAuth2 social login (Google, GitHub)
- Session management (logout all devices)
- Account lockout after failed attempts

---

## Troubleshooting

**Issue**: Login returns 401 for valid credentials
- Check JWT_SECRET environment variable is set
- Verify database connection is working
- Check bcrypt cost factor matches registration

**Issue**: Password reset emails not sending
- Verify notification service is running
- Check email queue for errors
- Validate SMTP credentials in config

---

## Related Documentation

- [Application README](../../README.md) - Overall architecture
- [Notification Service](../notifications/README.md) - Email sending
- [API Documentation](../../docs/API.md) - Complete API reference
```

---

### Step 10: Present README to Engineer

Show the generated README and ask:

**"Review the proposed feature README:**

[Show first few sections or full README]

**Options:**
1. **Approve** - README looks good, save it
2. **Adjust section X** - Modify a specific section
3. **Add section** - Include additional information
4. **Remove section** - Take something out
5. **Rewrite section** - Completely change a section

**What would you like to do?"**

---

### Step 11: Iterate Based on Feedback

Make requested changes and show updated sections.

Continue iterating until engineer approves.

---

### Step 12: Save Feature README

Once approved:

1. Write the README.md to the feature directory
2. Confirm to engineer:

```
✅ Feature README created/updated!

File: [feature-path]/README.md

Sections included:
- What It Does
- How It Works
- API Endpoints ([X] endpoints)
- Database Schema
- Code Structure
- Integration Points
- Security Considerations
- Testing
- Known Limitations (if any)
- [Additional sections...]

---

This feature is now documented and ready for Xoch workflow!

You can now:
1. Use #xoch-validate to verify this README before starting work
2. Use #xoch-spec to start new work on this feature
3. Use the full Xoch workflow for future changes

If you have other features to document:
- Run #xoch-init-feature for each feature directory
```

---

## Important Notes

- **Be specific about behavior** - Don't just list functions, explain what they do
- **Include examples** - Show request/response formats, code snippets, etc.
- **Document edge cases** - What happens when things go wrong?
- **Explain integration points** - How does this feature connect to others?
- **Keep it current** - Document what exists, not what's planned
- **Test scenarios are valuable** - Help QA understand how to test
- **Known limitations are honest** - Don't hide technical debt
- **Ask questions when unclear** - Better to clarify than document incorrectly

---

## Example Interaction

**Agent**: "Which feature would you like to document?"

**Engineer**: `src/authentication/`

**Agent**: [Reads existing README - finds it outdated]

**Agent**: [Reads application README for context]

**Agent**: [Analyzes auth.controller.js, auth.service.js, user.model.js, etc.]

**Agent**:
```
🔍 FEATURE ANALYSIS

Feature: Authentication
Location: src/authentication/

## Purpose
Provides user authentication and authorization for the application using JWT tokens.

## User Perspective
- Users can register with email/password
- Users can log in and receive auth token
- Users can reset forgotten passwords
- Token used for subsequent API requests

## Technical Implementation

### Key Components:
- **AuthController**: HTTP request handlers
  - File: auth.controller.js
  - Functions: register(), login(), resetPassword()

- **AuthService**: Business logic
  - File: auth.service.js  
  - Functions: hashPassword(), verifyPassword(), generateToken()

- **UserModel**: Database model
  - File: user.model.js
  - Functions: create(), findByEmail(), update()

### Database:
- **Tables**: users
- **Schema**: id, email, password_hash, created_at, updated_at

### API Endpoints:
- POST /auth/register - Create account
- POST /auth/login - Authenticate
- POST /auth/reset-password - Request reset
- POST /auth/reset-password/:token - Complete reset

### External Integrations:
- Notification service: Sends welcome and reset emails

## How It Works
[Detailed flow explanation for registration, login, password reset]

## Interactions with Other Features

### Dependencies:
- Notification Service: Sends emails

### Dependents:
- Payments: Requires auth to process payments
- Profile: Requires auth to view/edit profile
- Admin Panel: Requires auth with admin role

## Current State vs Documentation

README exists but is outdated:
- ✅ Accurate: Basic registration/login flow
- ⚠️ Outdated: Claims to use sessions, but JWT tokens are used now
- ❌ Missing: Password reset feature not documented at all
```

**Agent**: "Is my understanding correct?"

**Engineer**: "Mostly correct, but you missed the rate limiting on login - 5 attempts per 15 minutes. Also, the admin panel doesn't use this feature, it has separate auth."

**Agent**: "Updated: Authentication with JWT, rate limiting (5/15min), used by payments and profile (not admin). Correct?"

**Engineer**: "Yes, correct"

**Agent**: [Generates comprehensive README with all details]

**Agent**: "Review the proposed README: [shows full README]"

**Engineer**: "Looks good, but can you add a troubleshooting section for common JWT issues?"

**Agent**: [Adds troubleshooting section with JWT debugging tips]

**Agent**: "Updated. Approve now?"

**Engineer**: "Perfect, approved"

**Agent**:
```
✅ Feature README created!

File: src/authentication/README.md

Sections included:
- What It Does
- How It Works (registration, login, password reset flows)
- API Endpoints (4 endpoints documented)
- Database Schema (users table)
- Code Structure
- Integration Points (notifications, payments, profile)
- Security Considerations (bcrypt, JWT, rate limiting)
- Testing
- Troubleshooting
- Known Limitations

This feature is now documented and ready for Xoch workflow!
```
