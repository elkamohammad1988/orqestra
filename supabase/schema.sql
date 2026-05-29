-- ============================================================================
-- Orqestra — Supabase schema
-- ============================================================================
-- Run this once in your Supabase project: SQL Editor → New query → paste → run.
-- Idempotent: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
--
-- What you'll get:
--   1. A `workflows` table that stores the full workflow graph as JSONB.
--   2. Row-Level Security policies that scope every row to its owner.
--   3. An auto-updating `updated_at` trigger so we don't have to set it
--      manually on every UPDATE.
-- ============================================================================


-- ─── workflows ───────────────────────────────────────────────────────────────
-- We store nodes and edges as JSONB rather than as separate tables. Reasons:
--   • A workflow is opened/saved/run as a single unit. Joining 3 tables on
--     every fetch is needless overhead for a document-shaped artifact.
--   • The shape evolves rapidly (new node kinds, new config fields). Schema
--     migrations every time we add a field would be painful — JSONB lets the
--     application own the shape, with the discriminated union in
--     lib/workflow/types.ts as the canonical contract.
--   • Postgres can still index INTO the JSON (e.g. GIN index on `nodes`) if
--     we later need to query "workflows that use claude-3-5-sonnet".
-- ============================================================================
create table if not exists public.workflows (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null default 'Untitled workflow',
  description   text,
  nodes         jsonb not null default '[]'::jsonb,
  edges         jsonb not null default '[]'::jsonb,
  -- Random per-workflow token used to authenticate inbound webhook calls.
  -- Lives in the column rather than encoded in the URL so it can be rotated
  -- without changing the workflow id.
  webhook_token uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Add the column on existing installs that pre-dated webhook support.
-- Idempotent — Postgres skips the ADD when the column already exists.
alter table public.workflows
  add column if not exists webhook_token uuid not null default gen_random_uuid();

-- Lookup index — the dashboard and editor both query by user_id.
create index if not exists workflows_user_id_idx
  on public.workflows (user_id, updated_at desc);


-- ─── updated_at auto-update trigger ──────────────────────────────────────────
-- Postgres has no `ON UPDATE CURRENT_TIMESTAMP` like MySQL. We emulate it
-- with a trigger so every UPDATE refreshes `updated_at` without the app
-- needing to send it.
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workflows_set_updated_at on public.workflows;
create trigger workflows_set_updated_at
  before update on public.workflows
  for each row
  execute function public.set_updated_at();


-- ─── Row-Level Security (RLS) ────────────────────────────────────────────────
-- WHAT IS RLS?
--   Postgres enforces that every query against `workflows` is filtered by a
--   policy expression. Even if a malicious client bypasses our backend and
--   talks directly to PostgREST with the anon key, the database itself
--   refuses to return rows that don't match the policy.
--
-- THE POLICY: `user_id = auth.uid()`
--   `auth.uid()` is a Supabase helper that returns the JWT's `sub` claim —
--   the authenticated user's id. If the user is anonymous, it returns NULL,
--   so the policy fails and zero rows are visible. This makes the entire
--   `workflows` table effectively private-by-default.
--
-- We create FOUR policies (one per operation) because RLS is granular:
--   SELECT  → which rows can be read
--   INSERT  → what new rows are allowed (the WITH CHECK clause)
--   UPDATE  → which rows can be updated AND what the new values must satisfy
--   DELETE  → which rows can be deleted
-- ============================================================================

alter table public.workflows enable row level security;

drop policy if exists "Users can read their own workflows" on public.workflows;
create policy "Users can read their own workflows"
  on public.workflows
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workflows" on public.workflows;
create policy "Users can insert their own workflows"
  on public.workflows
  for insert
  with check (auth.uid() = user_id);
  -- WITH CHECK runs on the *new* row. Without this, a user could insert
  -- a workflow with someone else's user_id. WITH CHECK forbids that.

drop policy if exists "Users can update their own workflows" on public.workflows;
create policy "Users can update their own workflows"
  on public.workflows
  for update
  using (auth.uid() = user_id)        -- which existing rows can be updated
  with check (auth.uid() = user_id);  -- and they must STAY owned by the user

drop policy if exists "Users can delete their own workflows" on public.workflows;
create policy "Users can delete their own workflows"
  on public.workflows
  for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Done. The application can now do `supabase.from("workflows").select("*")`
-- and trust that it only ever sees the caller's own rows.
-- ============================================================================


-- ─── runs ────────────────────────────────────────────────────────────────────
-- One row per workflow execution. The full event log is captured as JSONB so
-- a run detail page can replay the timeline (which node started when, what
-- tokens streamed back, what error, etc.) without a separate `events` table.
--
-- Design notes:
--   • `status` is a checked string instead of a Postgres enum because adding
--     enum values requires DDL and we expect to iterate fast on this set.
--   • `duration_ms` is denormalized from finished_at - started_at so the
--     dashboard can show it without a subtraction expression in every query.
--   • `token_count` is an APPROXIMATION (sum of streamed delta lengths / 4).
--     Real Anthropic token usage comes back on `message.usage` — Phase 4 will
--     wire that in. For now the value is good enough to drive the UI.
-- ============================================================================
create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references public.workflows (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  status        text not null check (status in ('running','success','failed','canceled')),
  trigger       text not null default 'manual' check (trigger in ('manual','schedule','webhook','api')),
  trigger_input text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer,
  token_count   integer not null default 0,
  error_message text,
  events        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists runs_user_id_idx
  on public.runs (user_id, started_at desc);
create index if not exists runs_workflow_id_idx
  on public.runs (workflow_id, started_at desc);


alter table public.runs enable row level security;

drop policy if exists "Users can read their own runs" on public.runs;
create policy "Users can read their own runs"
  on public.runs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own runs" on public.runs;
create policy "Users can insert their own runs"
  on public.runs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own runs" on public.runs;
create policy "Users can update their own runs"
  on public.runs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE is intentionally not granted — runs are an immutable audit trail.
-- They cascade-delete with the parent workflow, which is the only path that
-- should ever remove a run row.

-- ─── upgrade_requests ───────────────────────────────────────────────────────
-- Pre-Stripe waitlist. When a user clicks "Upgrade to Pro" we record their
-- intent here instead of pretending Stripe Checkout is live. Once Stripe is
-- wired, this table doubles as the audit trail for who asked to upgrade,
-- what plan + period they picked, and any free-form note they left.
--
-- Designed to be self-serve: a small dashboard query (or even a SQL Editor
-- one-liner) is enough to triage requests until the checkout flow ships.
-- ============================================================================
create table if not exists public.upgrade_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan_id     text not null check (plan_id in ('pro','team')),
  period      text not null check (period in ('monthly','yearly')),
  email       text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists upgrade_requests_user_id_idx
  on public.upgrade_requests (user_id, created_at desc);
create index if not exists upgrade_requests_created_at_idx
  on public.upgrade_requests (created_at desc);


alter table public.upgrade_requests enable row level security;

drop policy if exists "Users can read their own upgrade requests"
  on public.upgrade_requests;
create policy "Users can read their own upgrade requests"
  on public.upgrade_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own upgrade requests"
  on public.upgrade_requests;
create policy "Users can insert their own upgrade requests"
  on public.upgrade_requests
  for insert
  with check (auth.uid() = user_id);

-- No UPDATE / DELETE policies — requests are immutable from the client.
-- Operations team uses the service role key to mark them as fulfilled.

-- ============================================================================
-- Done. Apply with: SQL Editor → New query → paste this file → Run.
-- ============================================================================
