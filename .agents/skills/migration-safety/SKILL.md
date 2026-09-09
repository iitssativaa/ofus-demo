---
name: migration-safety
description: Design, review, or repair database schema migrations safely. Use for SQL migrations, table or column changes, constraints, indexes, backfills, RLS-affecting schema changes, destructive database changes, or deployment-order questions. Do not use for read-only queries or application changes that do not alter schema.
---

# Migration Safety

Treat a migration as a production change, not just a schema edit. Preserve existing data and keep application/schema rollout order explicit.

## Workflow

1. **Inspect current state**
   - Read the existing migration history and the schema objects touched by the task.
   - Identify current nullability, defaults, constraints, indexes, foreign keys, policies, generated types, and application assumptions.

2. **Classify the change**
   - additive and backward compatible
   - behavior-changing but reversible
   - destructive or difficult to roll back
   - data backfill required

3. **Plan rollout order**
   - Prefer expand/migrate/contract for changes that cannot be deployed atomically with application code.
   - Separate long or risky backfills from schema locks when appropriate.
   - Ensure old and new application versions can coexist during rollout when the deployment model requires it.

4. **Write a reproducible migration**
   - Use the repository's migration mechanism rather than manual console-only changes.
   - Make names, defaults, indexes, and constraints explicit.
   - Avoid destructive drops/renames when a staged migration can preserve compatibility.

5. **Protect data and authorization**
   - Check existing rows before adding NOT NULL or stricter constraints.
   - Check foreign-key behavior and cascade effects.
   - Re-evaluate RLS/policies, views, functions, triggers, grants, and generated types when affected.

6. **Verify**
   - Apply the migration in a disposable/local environment when possible.
   - Test representative existing data and the new application path.
   - Run relevant schema/type generation and application checks.
   - Inspect for irreversible operations and document recovery steps for risky changes.

## Red flags

Stop and call out the risk before proceeding when the change would:
- drop populated data without explicit approval
- rewrite a large production table synchronously without considering lock/runtime impact
- make a required column non-null without a valid backfill/default strategy
- remove an auth/RLS boundary
- depend on an undocumented manual production step

## Completion criteria

The migration is reproducible, the rollout order is clear, existing data remains valid, authorization implications are checked, and risky or irreversible steps are explicitly reported.
