# Supabase foundation

Business screens intentionally continue to use `AppProvider` and mock data in
M2.2A. Supabase-backed business repositories and screens belong to M2.2B.

## Configure

1. Copy `.env.example` to `.env.local` and set the project URL and public
   publishable key. Never expose a service-role key to this application.
2. In Supabase Auth, keep email/password enabled and configure the Site URL and
   allowed redirect URLs for the deployed app, `http://localhost:3000`, and
   `http://localhost:3000/auth/callback`.
3. Use either a local Supabase stack or link a remote project:

```bash
npx supabase start
# or, for an existing remote project:
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The schema is reproducible from `supabase/migrations`. Avoid `db reset` against
any environment containing data.

## Authentication

- `lib/supabase/client.ts` creates browser clients.
- `lib/supabase/server.ts` creates cookie-aware server clients.
- `proxy.ts` refreshes cookie sessions without protecting or redesigning the
  current mock UI.
- `lib/supabase/auth.ts` exposes minimal email/password sign-up, sign-in, and
  sign-out operations. A profile trigger copies `display_name` from sign-up
  metadata and falls back to the email prefix.

`/giris` and `/kayit` provide the Turkish email/password UI. The session proxy
redirects anonymous application requests to `/giris` and signed-in users away
from auth screens. The protected route layout verifies the user, ensures a
profile, and calls `ensure_default_workspace()`. That RPC uses a per-user
transaction lock, so repeat or concurrent logins reuse one membership instead
of creating duplicate workspaces.

## Database types

Generate types after the migrations have been applied:

```bash
npx supabase gen types typescript --local --schema public > lib/supabase/database.types.ts
```

For a linked remote project, replace `--local` with `--linked`. Never hand-edit
the generated file. Pass its `Database` type to the client factories after
generation.

## Integrity and deletion choices

- Workspace deletion cascades workspace-owned operational data.
- Company and project deletion is blocked while dependent records exist;
  historical work must be moved or handled deliberately first.
- Removing an assigned workspace member is blocked until their tasks are
  reassigned.
- Task activity rows follow their task. Mistaken-entry deletion simply deletes
  the task; it has no cancellation reason in the database enum.

## RLS model

All application tables have RLS enabled. Operational data is readable and
writable only by workspace members. Workspace updates, deletion, and membership
management require an owner. Membership/ownership checks use narrowly scoped
`SECURITY DEFINER` functions in a non-exposed `private` schema with an empty
search path, avoiding recursive policies on `workspace_members`.
