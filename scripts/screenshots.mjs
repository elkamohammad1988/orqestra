/**
 * Orqestra — Upwork gallery screenshot automation.
 *
 * Captures the 7 highest-impact screens at 1440x900 @ 2x DPR in dark mode
 * and writes them to /gallery-screenshots/01.png … 07.png.
 *
 * USAGE
 *   1. Run the dev server (Supabase blanked, ANTHROPIC_API_KEY live):
 *        NEXT_PUBLIC_SUPABASE_URL="" \
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY="" \
 *        SUPABASE_SERVICE_ROLE_KEY="" \
 *        npm run dev
 *   2. In a separate terminal:
 *        npm run screenshots
 *      Or, if the dev server picked a non-default port:
 *        SCREENSHOT_BASE_URL="http://localhost:3002" npm run screenshots
 *
 * DESIGN NOTES
 *   • Dark mode: app uses next-themes with defaultTheme="dark", so the
 *     default IS dark. We also seed localStorage with `theme=dark` for
 *     paranoia (covers a future config flip).
 *   • Each shot is isolated in its own try/catch — a single failed shot
 *     (e.g. shot 01 if Anthropic errors) does not block the other 6.
 *     The script always reports which shots succeeded and which need
 *     manual retake.
 *   • Dev server MUST be unconfigured (no Supabase keys), so /dashboard,
 *     /runs, /runs/[id], /upgrade, /settings all render with the mock
 *     fixtures we wired in src/lib/mock-data.ts.
 */

import { chromium } from "playwright";
import { mkdirSync, statSync } from "fs";
import { join, resolve } from "path";

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("gallery-screenshots");
const VIEWPORT = { width: 1440, height: 900 };
const DPR = 2;
const RUN_TIMEOUT_MS = 60_000;

// ─── Tiny logger ────────────────────────────────────────────────────────────
const log = {
  step: (n, label) => console.log(`\n[${String(n).padStart(2, "0")}] ${label}`),
  ok: (msg) => console.log(`     ✓ ${msg}`),
  warn: (msg) => console.warn(`     ! ${msg}`),
  err: (msg) => console.error(`     ✗ ${msg}`),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function shot(page, filename, opts = {}) {
  const path = join(OUT_DIR, filename);
  await page.screenshot({ path, fullPage: false, animations: "disabled", ...opts });
  const sizeKb = (statSync(path).size / 1024).toFixed(0);
  log.ok(`wrote ${filename} (${sizeKb} KB)`);
}

async function waitForDevServer() {
  // GET / instead of HEAD — Next 14 dev mode returns 500 on HEAD due to a
  // known tracer.js bug. GET works reliably.
  try {
    const res = await fetch(BASE_URL, { method: "GET" });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    log.err(`dev server not reachable at ${BASE_URL}`);
    log.err(`start it with: npm run dev  (or set SCREENSHOT_BASE_URL)`);
    log.err(`underlying error: ${err.message}`);
    process.exit(1);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await waitForDevServer();
  mkdirSync(OUT_DIR, { recursive: true });
  log.step(0, `output dir: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    colorScheme: "dark",
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem("theme", "dark");
    } catch {}
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (err) => log.warn(`page error: ${err.message}`));

  // Each shot is wrapped so one failure doesn't block the rest of the gallery.
  const failures = [];
  const captured = [];

  // ── 01 · /workflows/demo AFTER running to completion ──────────────────────
  try {
    log.step(1, "/workflows/demo — running the demo workflow");
    await page.goto(`${BASE_URL}/workflows/demo`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".react-flow__node", { state: "visible" });
    await page.waitForTimeout(800);

    const runBtn = page.getByRole("button", { name: /^Run/i });
    await runBtn.waitFor({ state: "visible" });
    await runBtn.click();

    log.ok("clicked Run — waiting up to 60s for completion");
    await page.waitForFunction(
      () => {
        const txt = document.body.innerText;
        return /complete\s*·\s*\d+\s*steps/i.test(txt) || /\bfailed\b/i.test(txt);
      },
      { timeout: RUN_TIMEOUT_MS },
    );

    // Look for the actual error banner (not the badge that just says
    // "failed"). The banner is a div with bg-destructive/5 containing a
    // span with the message text.
    const errBanner = await page
      .locator(".bg-destructive\\/5 span")
      .first()
      .textContent()
      .catch(() => null);
    if (errBanner) {
      const msg = errBanner.trim();
      // The friendly "AI provider isn't configured" error means the
      // server doesn't have a live ANTHROPIC_API_KEY. Tell the user how
      // to fix it instead of just dumping the runtime message.
      if (/AI provider isn't configured/i.test(msg)) {
        throw new Error(
          "ANTHROPIC_API_KEY is empty in .env.local. " +
            "Get a free key at console.anthropic.com/settings/keys, " +
            "set ANTHROPIC_API_KEY in .env.local, restart `npm run dev`, " +
            "then re-run this script.",
        );
      }
      throw new Error(`Run failed: ${msg}`);
    }

    await page.locator(".react-flow__pane").click({ position: { x: 60, y: 60 } });
    await page.waitForTimeout(500);
    await shot(page, "01.png");
    captured.push("01");
  } catch (err) {
    log.err(`shot 01: ${err.message}`);
    failures.push({ shot: "01", reason: err.message });
  }

  // ── 02 · / (landing hero) ─────────────────────────────────────────────────
  try {
    log.step(2, "/ — landing hero");
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "visible" });
    await page.waitForTimeout(1400);
    await shot(page, "02.png");
    captured.push("02");
  } catch (err) {
    log.err(`shot 02: ${err.message}`);
    failures.push({ shot: "02", reason: err.message });
  }

  // ── 03 · /runs/[id] — completed run detail ────────────────────────────────
  try {
    log.step(3, "/runs/run_c3d4 — completed run detail");
    await page.goto(`${BASE_URL}/runs/run_c3d4`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "visible" });
    await page.waitForTimeout(500);
    await shot(page, "03.png");
    captured.push("03");
  } catch (err) {
    log.err(`shot 03: ${err.message}`);
    failures.push({ shot: "03", reason: err.message });
  }

  // ── 04 · /dashboard with demo data ────────────────────────────────────────
  try {
    log.step(4, "/dashboard — populated with mock fixtures");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "visible" });
    await page.waitForTimeout(900);
    await shot(page, "04.png");
    captured.push("04");
  } catch (err) {
    log.err(`shot 04: ${err.message}`);
    failures.push({ shot: "04", reason: err.message });
  }

  // ── 05 · /workflows/demo with the AI step selected ────────────────────────
  try {
    log.step(5, "/workflows/demo — AI step selected (Inspector populated)");
    await page.goto(`${BASE_URL}/workflows/demo`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".react-flow__node", { state: "visible" });
    await page.waitForTimeout(800);
    await page.locator('[data-id="n_classify"]').click({ force: true });
    await page.waitForTimeout(500);
    await shot(page, "05.png");
    captured.push("05");
  } catch (err) {
    log.err(`shot 05: ${err.message}`);
    failures.push({ shot: "05", reason: err.message });
  }

  // ── 06 · /upgrade (pricing) ───────────────────────────────────────────────
  try {
    log.step(6, "/upgrade — pricing + comparison");
    await page.goto(`${BASE_URL}/upgrade`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "visible" });
    await page.waitForTimeout(700);
    await shot(page, "06.png");
    captured.push("06");
  } catch (err) {
    log.err(`shot 06: ${err.message}`);
    failures.push({ shot: "06", reason: err.message });
  }

  // ── 07 · /settings ────────────────────────────────────────────────────────
  try {
    log.step(7, "/settings — account + billing");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { state: "visible" });
    await page.waitForTimeout(500);
    await shot(page, "07.png");
    captured.push("07");
  } catch (err) {
    log.err(`shot 07: ${err.message}`);
    failures.push({ shot: "07", reason: err.message });
  }

  await browser.close();

  console.log("\n────────────────────────────────────────");
  console.log(`Captured: ${captured.length}/7 → ${OUT_DIR}`);
  if (captured.length > 0) console.log(`  ✓ ${captured.join(", ")}`);
  if (failures.length > 0) {
    console.log(`Failed:   ${failures.length}/7`);
    for (const f of failures) console.log(`  ✗ ${f.shot} — ${f.reason}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log.err(`fatal: ${err.message}`);
  process.exit(1);
});
