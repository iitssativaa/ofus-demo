---
name: production-readiness
description: Audit a web or API project before deployment or release. Use for pre-production checks, launch readiness, Vercel/server deployment preparation, release gates, or requests asking whether a project is safe to ship. Do not use for ordinary feature implementation unless release readiness is part of the task.
---

# Production Readiness

Perform a focused release audit. Prioritize issues that can break production, leak secrets, corrupt data, or block users.

## Audit order

### 1. Build and runtime
- Run the production build and relevant type/lint/test commands.
- Check runtime/version assumptions and deployment configuration.
- Check server/client boundaries and production-only code paths when relevant.

### 2. Configuration and secrets
- Confirm required environment variables are documented and referenced safely.
- Ensure secrets are not committed, exposed to client bundles, logged, or embedded in public config.
- Check development fallbacks that could silently activate in production.

### 3. Data and migrations
- Verify pending migrations and deployment order.
- Check destructive or non-backward-compatible schema changes.
- Check defaults, nullability, backfills, indexes, and constraints when changed.
- Confirm production code and generated types match the intended schema.

### 4. Auth and authorization
- Verify protected routes and server actions enforce authorization, not only authentication.
- Check resource ownership, tenant/workspace boundaries, RLS or equivalent policies, and privileged credentials.

### 5. User-visible failure paths
- Check loading, empty, error, offline/retry, and permission-denied states that are relevant to the release.
- Check critical forms for validation and useful failure messages.

### 6. Web launch basics
When applicable, check:
- responsive behavior on critical screens
- accessibility blockers
- metadata/title/favicon/robots decisions
- broken links and obvious 404 paths
- production asset and image handling

### 7. Operations
When the project needs it, check:
- logging without sensitive data
- health/observability hooks
- rate limits or abuse-sensitive endpoints
- rollback or recovery path for risky releases

## Severity

Report findings as:

- **BLOCKER** — unsafe or likely to break release
- **HIGH** — serious production risk
- **MEDIUM** — should be fixed soon, not necessarily release-blocking
- **LOW** — polish or hardening

Do not inflate cosmetic issues into blockers.

## Finish

End with one verdict: `READY`, `READY WITH RISKS`, or `NOT READY`, followed by the smallest set of actions needed to reach `READY`.
