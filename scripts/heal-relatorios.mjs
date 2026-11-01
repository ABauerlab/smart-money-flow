#!/usr/bin/env node
// Inspect + self-heal the reports pipeline (crypto-analysis edge function).
//
//   check  -> GET health (retrying transient failures: 429, 5xx, timeouts)
//   fix    -> depending on the diagnosis:
//               function down (no JSON / 5xx)  -> redeploy it (needs SUPABASE_ACCESS_TOKEN)
//               report_without_analysis        -> action=repair (regenerates the AI report)
//   verify -> poll health until it is green or the budget runs out
//
// Things that cannot be fixed from here (VPS/Make stopped sending, wrong access code,
// totals that do not reconcile) are reported as "needs a person" and the script exits 1,
// so the workflow opens/updates an issue and GitHub emails the owners.
//
// Env: FUNCTION_URL, PUBLISHABLE_KEY, HEALTH_ACCESS_CODE (required)
//      SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF (optional, enable redeploy)
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";

const { FUNCTION_URL, PUBLISHABLE_KEY, HEALTH_ACCESS_CODE, SUPABASE_ACCESS_TOKEN } = process.env;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "xinzvskuxnxgjrcqncmy";

if (!FUNCTION_URL || !HEALTH_ACCESS_CODE) {
  console.log("FUNCTION_URL / HEALTH_ACCESS_CODE not set, skipping.");
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (m) => { console.log(m); log.push(m); };

async function call(action) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const resp = await fetch(`${FUNCTION_URL}?action=${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        apikey: PUBLISHABLE_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessCode: HEALTH_ACCESS_CODE }),
      signal: ctrl.signal,
    });
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON: platform error page */ }
    return { status: resp.status, json, text: text.slice(0, 300), retryAfter: Number(resp.headers.get("retry-after")) || 0 };
  } catch (e) {
    return { status: 0, json: null, text: String(e.message || e), retryAfter: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// Health with retries for failures that are transient by nature.
async function health(attempts = 3) {
  let r;
  for (let i = 0; i < attempts; i++) {
    r = await call("health");
    const transient = r.status === 0 || r.status === 429 || (r.status >= 500 && !r.json);
    if (!transient) return r;
    const wait = r.status === 429 ? Math.min(Math.max(r.retryAfter, 5), 60) : 10 * (i + 1);
    say(`health attempt ${i + 1}/${attempts}: HTTP ${r.status}; retrying in ${wait}s`);
    await sleep(wait * 1000);
  }
  return r;
}

const describe = (r) => (r.json?.problems?.length
  ? r.json.problems.map((p) => `${p.code}: ${p.detail}`).join("; ")
  : `HTTP ${r.status} ${r.text}`);

async function waitGreen(maxMinutes) {
  const deadline = Date.now() + maxMinutes * 60_000;
  let r;
  do {
    await sleep(30_000);
    r = await health(1);
    if (r.json?.ok) return r;
  } while (Date.now() < deadline);
  return r;
}

function finish(code, headline) {
  const body = `## Relatórios: ${headline}\n\n${log.map((l) => `- ${l}`).join("\n")}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
  writeFileSync("heal-report.md", body);
  console.log(`\n${headline}`);
  process.exit(code);
}

let r = await health();
if (r.json?.ok) {
  say(`healthy (last round ${r.json.minutesSinceLastRound} min ago)`);
  finish(0, "saudável");
}
say(`unhealthy: ${describe(r)}`);

// ---- 1. Function not answering with JSON: redeploy it ----
if (!r.json) {
  if (!SUPABASE_ACCESS_TOKEN) {
    say("function is not answering and SUPABASE_ACCESS_TOKEN is not set, so it cannot be redeployed automatically");
  } else {
    say("function is not answering: redeploying crypto-analysis");
    try {
      execFileSync("npx", ["-y", "supabase@latest", "functions", "deploy", "crypto-analysis", "--project-ref", PROJECT_REF, "--no-verify-jwt"], {
        stdio: "inherit", env: process.env,
      });
      await sleep(20_000);
      r = await health();
      say(r.json?.ok ? "healthy after redeploy" : `after redeploy: ${describe(r)}`);
    } catch (e) {
      say(`redeploy failed: ${e.message}`);
    }
  }
}

// ---- 2. Report without AI analysis: regenerate it ----
if (r.json?.problems?.some((p) => p.code === "report_without_analysis")) {
  const fix = await call("repair");
  say(`repair: HTTP ${fix.status} ${JSON.stringify(fix.json ?? fix.text)}`);
  if (fix.status === 202 || fix.status === 200) {
    r = await waitGreen(6);
    say(r.json?.ok ? "healthy after repair" : `after repair: ${describe(r)}`);
  }
}

if (r.json?.ok) finish(0, "corrigido automaticamente");

// ---- 3. What is left needs a person ----
const left = r.json?.problems ?? [];
const hints = {
  stale: "o envio da VPS/Make parou: confira a macro da VPS, o cenário do Make e a pasta do Drive",
  no_round: "nenhuma rodada registrada: confira o código de acesso e o cenário do Make",
  aggregate_mismatch: "totais não conferem entre o agregado e as linhas: confira a função crypto_window_sums e as migrações",
  db_unreachable: "banco inacessível: confira o status do projeto Supabase",
  report_without_analysis: "a IA continua falhando: confira GEMINI_API_KEY, cota e LOVABLE_API_KEY",
};
if (r.status === 401) say("access code rejected (401): HEALTH_ACCESS_CODE is invalid or inactive");
for (const p of left) say(`needs a person [${p.code}]: ${hints[p.code] ?? p.detail}`);
if (!left.length && r.status !== 401) say(`needs a person: ${describe(r)}`);
finish(1, "precisa de atenção humana");
