# Orqestra

> The visual canvas for Claude-powered workflows.

Design, run, and observe multi-step AI flows from one canvas. Deploy-ready on Vercel + Supabase.

---

## What's inside

- **Visual editor** — React Flow canvas with a typed node library (Trigger · AI Step · Transform · Output) and a live inspector.
- **Streaming execution** — every AI step yields tokens over SSE; the editor renders them as they arrive.
- **Run history & replay** — every execution captures the full event log. Open any run to walk through it node by node.
- **Webhook triggers** — each workflow gets a unique, token-authenticated POST endpoint.
- **Cost guards** — token caps, step caps, wall-clock budgets, and rate limits keep a runaway demo from running up a bill.
- **Database-enforced isolation** — Postgres Row-Level Security scopes every query to its owner.
- **Full auth flow** — email + Google OAuth, password reset, email confirmation, resend.
- **Production polish** — error boundaries, mobile gate for the editor, plan limits, account deletion, legal pages.

## Stack

- **Next.js 14** App Router · **TypeScript** strict · **Tailwind** + Radix primitives
- **React Flow** canvas · **Zustand** store
- **Supabase** auth + Postgres (with RLS)
- **Anthropic Claude** with SSE streaming
- **Vercel-ready** — zero config

---

## Live URLs

| Path | What it does |
| --- | --- |
| `/` | Landing page (hero, features, pricing, FAQ-free zone) |
| `/workflows/demo` | Public demo workflow — no signup |
| `/signup` · `/login` · `/forgot-password` · `/verify-email` | Auth |
| `/dashboard` | Workspace overview + usage |
| `/workflows` | Saved workflows |
| `/workflows/new` · `/workflows/[id]` | Editor |
| `/runs` · `/runs/[id]` | Execution history + per-run timeline |
| `/settings` | Profile · password · billing · danger zone |
| `/terms` · `/privacy` | Legal |
| `POST /api/webhooks/[workflowId]` | External trigger (token-authenticated) |
| `POST /api/workflows/run` | Internal SSE run endpoint |

---

## Try it locally — 60 seconds, no keys

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The landing, dashboard, and `/workflows/demo` render with the demo fixture — no Supabase or Anthropic keys required.

To make the **Run** button actually call Claude and stream tokens, drop an `ANTHROPIC_API_KEY` into `.env.local` (see below).

---

## Full setup

### 1. Supabase

1. Create a free project at <https://supabase.com>.
2. **SQL Editor → New query** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - Creates the `workflows` and `runs` tables with full RLS policies.
   - Idempotent — safe to re-run after every migration.
3. **Authentication → Providers → Email** is on by default. (Optional) enable **Google** and paste your OAuth client + redirect URL.
4. **Authentication → URL Configuration**:
   - Site URL → `http://localhost:3000` (dev) or your production domain.
   - Redirect URLs → add `<your-origin>/auth/callback` for every environment.
5. Grab `Project URL` and `anon` key from **Settings → API**.

### 2. Anthropic

[console.anthropic.com](https://console.anthropic.com) → API keys → create one. The default model (Claude Haiku 4.5) is configured in [`lib/workflow/limits.ts`](src/lib/workflow/limits.ts).

### 3. Environment

```bash
cp .env.local.example .env.local
```

Fill in:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Required for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth, persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth, persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | Account deletion, webhook trigger |
| `ANTHROPIC_API_KEY` | Run button calls Claude |
| `NEXT_PUBLIC_APP_URL` | OAuth + password reset redirect URLs |

Without `SUPABASE_SERVICE_ROLE_KEY` the account-deletion flow and webhook endpoint return clean error messages instead of working. Set it for the full experience.

### 4. Run

```bash
npm run dev          # localhost:3000
npm run build        # production build
npm run typecheck    # strict TS check
npm run lint         # ESLint
```

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. <https://vercel.com/new> → import. Next.js auto-detected, no config tweaks.
3. **Environment Variables** → paste the five vars from `.env.local`. Mark `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as **Sensitive**.
4. Deploy.
5. **After the first deploy:** update Supabase's Site URL + Redirect URLs to the new origin, and set `NEXT_PUBLIC_APP_URL` in Vercel to match. Skipping this breaks OAuth sign-in and password reset.

The app fits comfortably on Hobby. The `/api/workflows/run` route uses the Node runtime with `maxDuration = 30s` — under the 60s Hobby cap, and well under our own 25s wall-clock budget.

---

## Demo path

For evaluators who want to see the product in 60 seconds:

1. Open `/workflows/demo` — the editor loads with a pre-built "Customer Feedback Router" flow.
2. Click **Run** (or `Cmd+Enter`) — watch tokens stream into the `Classify intent` node.
3. The run shows up live in `/runs` once you sign in.

To seed your own workflow after signing in:

```
/dashboard → New workflow → Drag Trigger → AI Step → Output → Save → Run
```

---

## Architecture

- **Three Supabase clients** (`client.ts`, `server.ts`, `middleware.ts`). The server client reads from `cookies()` in `next/headers`; the middleware client writes refreshed cookies. They're not interchangeable.
- **An admin client** (`admin.ts`) uses the service-role key and bypasses RLS. Reserved for account deletion and webhook-triggered runs. Every call site verifies identity first.
- **Workflow execution** is an async generator (`runWorkflow`) yielding `RunEvent`s. The SSE route streams them to the editor; the webhook route buffers them and returns JSON.
- **Cost limits** live in one file ([`lib/workflow/limits.ts`](src/lib/workflow/limits.ts)). Every executor reads from there.
- **Rate limits** are currently in-memory ([`lib/rate-limit.ts`](src/lib/rate-limit.ts)) — swap for Upstash Redis when traffic justifies it. The call signature stays identical.

### Project layout

```
src/
├── app/
│   ├── page.tsx                          # marketing landing
│   ├── (auth)/  login, signup, …         # split-screen auth shell
│   ├── (dashboard)/  dashboard, runs, …  # signed-in shell
│   ├── (editor)/  workflows/[id], new    # full-screen editor
│   ├── auth/callback                     # OAuth + recovery code exchange
│   ├── api/workflows/run                 # SSE orchestrator
│   ├── api/webhooks/[workflowId]         # external trigger
│   ├── terms · privacy                   # legal
│   ├── global-error.tsx                  # root error boundary
│   └── not-found.tsx                     # 404
│
├── components/
│   ├── ui/         shadcn-style primitives
│   ├── marketing/  Hero, Features, CodeSection, Pricing, Footer, …
│   ├── auth/       forms + split-screen aside
│   ├── dashboard/  Sidebar, Topbar, StatCard, WorkflowCard, RecentRuns
│   ├── flow/       Editor, Library, Inspector, RunConsole, nodes/
│   ├── settings/   settings-sections (account · password · billing · danger)
│   ├── legal/      LegalShell
│   └── shared/     ThemeProvider, Logo, BackgroundGrid
│
└── lib/
    ├── env.ts                            # requireEnv + isSupabaseConfigured
    ├── supabase/   client, server, middleware, admin
    ├── auth/safe-redirect.ts             # open-redirect guard
    ├── billing/    plans, types, usage (server-only)
    ├── rate-limit.ts                     # in-memory sliding window
    ├── anthropic.ts                      # streaming wrapper
    └── workflow/   types · store · serialize · persistence · limits ·
                    run (executor) · run-client · runs (persistence) ·
                    mock-workflow
```

---

## Cost & safety

The app is built to be hosted publicly with the demo path open. Combined defenses:

1. **Limits** ([`lib/workflow/limits.ts`](src/lib/workflow/limits.ts)) cap tokens × steps × wall-time per run. Worst-case ~$0.005/run.
2. **Rate limits** ([`lib/rate-limit.ts`](src/lib/rate-limit.ts)) — 8 runs/minute/IP for anonymous, keyed by `user_id` once signed in.
3. **RLS** ([`supabase/schema.sql`](supabase/schema.sql)) — Postgres-enforced row ownership on every table.
4. **No client-side secrets** — `ANTHROPIC_API_KEY` only exists server-side.
5. **Webhook auth** — per-workflow random UUID token, compared with `timingSafeEqual`.
6. **Webhook body cap** — 64 KB max trigger input before the run even starts.

---

## What's next

Roadmap items I'd ship next if this becomes a real product:

- **Stripe Checkout** wired to the existing pricing UI
- **Scheduled triggers** (the trigger node has the field; a worker hasn't shipped)
- **BYOK Anthropic** — bring your own key per workspace
- **Multi-input merging** in the run engine
- **Undo/redo** in the editor
- **Team workspaces** with invites and roles
- **Real branded transactional emails** (currently uses Supabase defaults)
- **Upstash Redis rate-limit** when traffic outgrows in-memory

These are intentionally out-of-scope of v1. The surface above is the surface the product ships with today.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Both `lint` and `typecheck` must pass before deployment.

---

## License

UNLICENSED — proprietary. Contact `hello@orqestra.ai` for licensing.
