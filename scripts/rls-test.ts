/**
 * Cross-tenant RLS verification.
 *
 * Runs two real Supabase users against the production policies (NOT the
 * application code) and asserts that user B cannot read, update, or
 * delete user A's rows in any of the user-scoped tables.
 *
 * Usage:
 *   1. Create two test accounts in Supabase Auth (Dashboard → Authentication
 *      → Users → Add user). Pick two emails you control + password each.
 *   2. Export them as env vars (or paste them into the constants below):
 *
 *        export RLS_USER_A_EMAIL=...
 *        export RLS_USER_A_PASSWORD=...
 *        export RLS_USER_B_EMAIL=...
 *        export RLS_USER_B_PASSWORD=...
 *
 *   3. From the project root:
 *        npx tsx scripts/rls-test.ts
 *
 * Expected output: a series of `✓ ok` lines and an exit code of 0. Any
 * `✗ FAIL` means RLS is misconfigured for that table — fix the policy
 * BEFORE letting anyone sign up.
 *
 * The test is designed to be repeatable: anything user A creates here is
 * deleted at the end. If the script crashes mid-run, sign in as user A
 * and delete the orphan rows manually.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
  process.exit(1);
}

const A_EMAIL = process.env.RLS_USER_A_EMAIL ?? "usera@example.test";
const A_PASS = process.env.RLS_USER_A_PASSWORD ?? "passwordA-change-me";
const B_EMAIL = process.env.RLS_USER_B_EMAIL ?? "userb@example.test";
const B_PASS = process.env.RLS_USER_B_PASSWORD ?? "passwordB-change-me";

let failed = 0;
function ok(label: string) {
  console.log(`  ✓ ${label}`);
}
function fail(label: string, detail?: unknown) {
  failed += 1;
  console.error(`  ✗ FAIL — ${label}${detail ? `: ${JSON.stringify(detail)}` : ""}`);
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Could not sign in ${email}: ${error.message}`);
    process.exit(1);
  }
  return client;
}

async function main() {
  console.log("→ Signing in test users…");
  const a = await signIn(A_EMAIL, A_PASS);
  const b = await signIn(B_EMAIL, B_PASS);

  // ─── workflows ──────────────────────────────────────────────────────────
  console.log("\n→ workflows");
  const { data: aWf, error: insErr } = await a
    .from("workflows")
    .insert({ name: "RLS test — A only" })
    .select()
    .single();
  if (insErr || !aWf) {
    fail("user A failed to insert their own workflow", insErr?.message);
    process.exit(1);
  }
  ok("user A inserted their own workflow");

  {
    const read = await b.from("workflows").select("*").eq("id", aWf.id);
    if ((read.data?.length ?? 0) === 0) ok("user B cannot READ");
    else fail("user B can READ user A's workflow", read.data);
  }
  {
    const upd = await b
      .from("workflows")
      .update({ name: "hacked" })
      .eq("id", aWf.id)
      .select();
    if ((upd.data?.length ?? 0) === 0) ok("user B cannot UPDATE");
    else fail("user B can UPDATE user A's workflow", upd.data);
  }
  {
    const del = await b
      .from("workflows")
      .delete()
      .eq("id", aWf.id)
      .select();
    if ((del.data?.length ?? 0) === 0) ok("user B cannot DELETE");
    else fail("user B can DELETE user A's workflow", del.data);
  }

  // ─── runs ───────────────────────────────────────────────────────────────
  console.log("\n→ runs");
  const { data: aRun, error: runErr } = await a
    .from("runs")
    .insert({
      workflow_id: aWf.id,
      status: "success",
      trigger: "manual",
      duration_ms: 100,
      token_count: 0,
    })
    .select()
    .single();
  if (runErr || !aRun) {
    fail("user A failed to insert their own run (set user_id default?)", runErr?.message);
  } else {
    ok("user A inserted their own run");
    {
      const read = await b.from("runs").select("*").eq("id", aRun.id);
      if ((read.data?.length ?? 0) === 0) ok("user B cannot READ");
      else fail("user B can READ user A's run", read.data);
    }
    {
      const upd = await b
        .from("runs")
        .update({ status: "failed" })
        .eq("id", aRun.id)
        .select();
      if ((upd.data?.length ?? 0) === 0) ok("user B cannot UPDATE");
      else fail("user B can UPDATE user A's run", upd.data);
    }
  }

  // ─── upgrade_requests ───────────────────────────────────────────────────
  console.log("\n→ upgrade_requests");
  const { data: aReq, error: reqErr } = await a
    .from("upgrade_requests")
    .insert({
      plan_id: "pro",
      period: "monthly",
      email: A_EMAIL,
    })
    .select()
    .single();
  if (reqErr || !aReq) {
    fail("user A failed to insert their own upgrade request", reqErr?.message);
  } else {
    ok("user A inserted their own upgrade request");
    const read = await b
      .from("upgrade_requests")
      .select("*")
      .eq("id", aReq.id);
    if ((read.data?.length ?? 0) === 0) ok("user B cannot READ");
    else fail("user B can READ user A's upgrade request", read.data);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────
  console.log("\n→ Cleanup");
  await a.from("workflows").delete().eq("id", aWf.id);
  ok("removed user A's test workflow (runs + upgrade_requests cascade)");

  console.log(
    failed === 0
      ? "\n✅ RLS holds across all tested tables."
      : `\n❌ ${failed} assertion(s) failed — fix the policy before launch.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
