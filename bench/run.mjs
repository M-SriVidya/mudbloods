#!/usr/bin/env node
// Runs mudbloods on fixed tasks, each in a fresh throwaway git repo, then runs
// the task's hidden tests. The skill is loaded from THIS repo with
// --plugin-dir, so the playbooks being scored are the ones in git.
//
// Usage:
//   node bench/run.mjs [--split train|heldout|all] [--version label] [--parallel N] [task-id ...]
//
// Env:
//   MB_PERMISSION   "allowlist" (default): acceptEdits plus a fixed tool allowlist.
//                   "bypass": --permission-mode bypassPermissions. Only use this on
//                   a machine or container you are happy for agents to modify.
//   MB_TIMEOUT_MS   per-task timeout, default 2700000 (45 min)
//   MB_CLAUDE_ARGS  extra args appended to every `claude` call
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync,
  readdirSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { score, CONFIG, HISTORY } from "./score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "..");
export const PLUGIN_DIR = join(REPO, "mudbloods");
export const PLAYBOOKS = join(PLUGIN_DIR, "skills", "mudbloods", "playbooks");
export const ARTIFACTS = join(HERE, "artifacts");
const TASKS = join(HERE, "tasks");
const TIMEOUT = Number(process.env.MB_TIMEOUT_MS ?? 2700000);

const ALLOW = [
  "Read", "Write", "Edit", "Glob", "Grep", "Agent", "Task", "Skill", "TodoWrite",
  "Bash(node:*)", "Bash(npm:*)", "Bash(npx:*)", "Bash(git:*)", "Bash(ls:*)", "Bash(cat:*)",
  "Bash(mkdir:*)", "Bash(find:*)", "Bash(grep:*)", "Bash(wc:*)", "Bash(head:*)", "Bash(tail:*)",
  "Bash(echo:*)", "Bash(date:*)", "Bash(pwd)",
];

// Arguments shared by every headless claude call the bench makes.
export function claudeArgs(prompt) {
  const perm = process.env.MB_PERMISSION === "bypass"
    ? ["--permission-mode", "bypassPermissions"]
    : ["--permission-mode", "acceptEdits", "--allowedTools", ALLOW.join(",")];
  const extra = (process.env.MB_CLAUDE_ARGS ?? "").split(" ").filter(Boolean);
  return [
    "-p", prompt,
    "--plugin-dir", PLUGIN_DIR,
    // Only project settings: the user's own plugins, hooks and memory stay out,
    // so every run sees the same skill and nothing else.
    "--setting-sources", "project",
    "--output-format", "json",
    ...perm, ...extra,
  ];
}

// MB_DRYRUN=1 tests the harness plumbing for free: no model calls. Builds copy
// the reference solutions; findings and cost improve with each "[dry-run]" rule
// in coder.md; the learner appends one such rule. Never use it for real scores.
function dryRun(prompt, cwd) {
  const coder = join(PLAYBOOKS, "coder.md");
  const text = readFileSync(coder, "utf8");
  const rules = (text.match(/^- \[dry-run\]/gm) ?? []).length;
  const harmful = (text.match(/^- \[dry-run\] harmful/gm) ?? []).length;
  if (prompt.includes(" learn ")) {
    // MB_DRYRUN_BAD=K makes the K-th learned rule harmful, to exercise rollback.
    const kind = Number(process.env.MB_DRYRUN_BAD) === rules + 1 ? "harmful" : "fake";
    appendFileSync(coder, `- [dry-run] ${kind} learned rule ${rules + 1}. (from dry-run, seen 1x)\n`);
    return { code: 0, json: { total_cost_usd: 0.1, modelUsage: {} }, stderr: "" };
  }
  const ref = join(HERE, "reference");
  for (const sub of ["src", "bin"]) {
    if (!existsSync(join(ref, sub))) continue;
    mkdirSync(join(cwd, sub), { recursive: true });
    for (const f of readdirSync(join(ref, sub))) copyFileSync(join(ref, sub, f), join(cwd, sub, f));
  }
  const ph = join(cwd, ".mudbloods", "runs", "dry", "phases", "P1");
  mkdirSync(ph, { recursive: true });
  const highs = Math.max(0, 3 - (rules - harmful)) + 4 * harmful;
  writeFileSync(join(ph, "findings.jsonl"), Array.from({ length: highs }, (_, i) =>
    JSON.stringify({ id: `P1-R1-F${i}`, severity: "high", category: "correctness", status: "fixed", evidence: "dry-run" })).join("\n"));
  const cost = 3 - 0.5 * rules;
  return { code: 0, json: { total_cost_usd: cost, modelUsage: { dry: { inputTokens: 1000 * cost, outputTokens: 100 } } }, stderr: "" };
}

export function runClaude(prompt, cwd) {
  if (process.env.MB_DRYRUN === "1") return Promise.resolve(dryRun(prompt, cwd));
  return new Promise((done) => {
    const child = spawn("claude", claudeArgs(prompt), { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => child.kill(), TIMEOUT);
    child.on("close", (code) => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.trim().split("\n").pop()); } catch { /* not JSON */ }
      done({ code, json, stderr: err.slice(-2000) });
    });
    child.on("error", (e) => { clearTimeout(timer); done({ code: -1, json: null, stderr: String(e) }); });
  });
}

// Cost and tokens come from Claude Code's own usage report, summed over every
// model the run used (main agent and all subagents).
export function usageOf(json) {
  if (!json) return { cost_usd: null, tokens: null, by_model: {} };
  const by = {};
  let tokens = 0;
  for (const [model, u] of Object.entries(json.modelUsage ?? {})) {
    const t = (u.inputTokens ?? 0) + (u.outputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0);
    by[model] = { tokens: t, cost_usd: u.costUSD ?? null };
    tokens += t;
  }
  return { cost_usd: json.total_cost_usd ?? null, tokens, by_model: by };
}

function hiddenTests(ws, task) {
  const dest = join(ws, ".mb-accept");
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(TASKS, task, "accept.test.mjs"), join(dest, "accept.test.mjs"));
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", join(dest, "accept.test.mjs")], {
    cwd: ws, encoding: "utf8", timeout: 120000,
  });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const passed = Number(/# pass (\d+)/.exec(out)?.[1] ?? 0);
  const failed = Number(/# fail (\d+)/.exec(out)?.[1] ?? 0);
  const failures = [];
  const lines = out.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*not ok \d+ - (.+)$/.exec(lines[i]);
    if (!m) continue;
    let error = "";
    for (let j = i + 1; j < lines.length && !/^\s*\.\.\.\s*$/.test(lines[j]); j++) {
      const e = /^\s*error:\s*(.*)$/.exec(lines[j]);
      if (e) { error = /^[|>]-?$/.test(e[1]) ? (lines[j + 1] ?? "").trim() : e[1].replace(/^'|'$/g, ""); break; }
    }
    failures.push({ test: m[1].trim(), error });
  }
  // A module that fails to import shows as 0/0: count it as 0/10.
  const total = passed + failed || 10;
  return { hidden: { passed, total }, failures };
}

function findingsOf(ws) {
  const runs = join(ws, ".mudbloods", "runs");
  const byId = new Map();
  if (existsSync(runs)) {
    for (const run of readdirSync(runs)) {
      const phases = join(runs, run, "phases");
      if (!existsSync(phases)) continue;
      for (const ph of readdirSync(phases)) {
        const f = join(phases, ph, "findings.jsonl");
        if (!existsSync(f)) continue;
        for (const line of readFileSync(f, "utf8").split("\n").filter(Boolean)) {
          try { const x = JSON.parse(line); byId.set(x.id ?? `${ph}-${byId.size}`, x); } catch { /* skip bad line */ }
        }
      }
    }
  }
  const all = [...byId.values()];
  const count = { critical: 0, high: 0, medium: 0, low: 0, rejected: 0, escalated: 0 };
  for (const x of all) {
    if (x.status === "rejected") { count.rejected++; continue; }
    if (x.severity in count) count[x.severity]++;
    if (x.escalated) count.escalated++;
  }
  return { findings: count, details: all };
}

function makeWorkspace(task) {
  const ws = mkdtempSync(join(tmpdir(), `mb-${task}-`));
  writeFileSync(join(ws, "package.json"), JSON.stringify({
    name: task, version: "0.0.0", type: "module", private: true, scripts: { test: "node --test" },
  }, null, 2));
  const g = (args) => spawnSync("git", args, { cwd: ws });
  g(["init", "-q"]);
  g(["add", "-A"]);
  g(["-c", "user.email=bench@local", "-c", "user.name=bench", "commit", "-qm", "init"]);
  return ws;
}

export function playbookCommit() {
  const r = spawnSync("git", ["log", "-1", "--format=%h", "--", PLAYBOOKS], { cwd: REPO, encoding: "utf8" });
  const dirty = spawnSync("git", ["status", "--porcelain", "--", PLAYBOOKS], { cwd: REPO, encoding: "utf8" }).stdout.trim();
  return (r.stdout.trim() || "none") + (dirty ? "+dirty" : "");
}

export async function runTask(task, split, version) {
  const ws = makeWorkspace(task);
  const instruction = readFileSync(join(TASKS, task, "instruction.md"), "utf8").trim();
  const t0 = Date.now();
  const res = await runClaude(`/mudbloods:mudbloods build --bench ${instruction}`, ws);
  const seconds = Math.round((Date.now() - t0) / 1000);
  const { hidden, failures } = hiddenTests(ws, task);
  const { findings, details } = findingsOf(ws);
  const usage = usageOf(res.json);
  const s = score({ hidden, findings, cost_usd: usage.cost_usd });
  const row = {
    version, split, task, at: new Date().toISOString(), playbooks: playbookCommit(),
    seconds, hidden, findings, cost_usd: usage.cost_usd, tokens: usage.tokens,
    score: s.score, parts: s.parts, exit: res.code, workspace: ws,
  };
  // Full detail (failures, findings, per-model usage) feeds the learner.
  const dir = join(ARTIFACTS, version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${task}.json`), JSON.stringify({
    ...row, failures, finding_details: details, usage_by_model: usage.by_model,
    claude_error: res.json?.is_error ? res.json.result : res.code !== 0 ? res.stderr : null,
  }, null, 2));
  return row;
}

export async function runTasks(tasks, version, { parallel = 4, accepted = true } = {}) {
  const rows = [];
  const queue = tasks.map((t) => ({ task: t, split: CONFIG.train.includes(t) ? "train" : "heldout" }));
  async function worker() {
    while (queue.length) {
      const { task, split } = queue.shift();
      console.log(`[${version}] ${task} (${split}) started`);
      const row = { ...(await runTask(task, split, version)), accepted };
      appendFileSync(HISTORY, JSON.stringify(row) + "\n");
      console.log(`[${version}] ${task}: tests ${row.hidden.passed}/${row.hidden.total}  high+crit ${row.findings.high + row.findings.critical}  $${row.cost_usd ?? "?"}  score ${row.score}`);
      rows.push(row);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, tasks.length) }, worker));
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const a = process.argv.slice(2);
  const opt = (name, dflt) => { const i = a.indexOf(name); if (i < 0) return dflt; const v = a[i + 1]; a.splice(i, 2); return v; };
  const split = opt("--split", "all");
  const version = opt("--version", `adhoc-${playbookCommit()}`);
  const parallel = Number(opt("--parallel", 4));
  const tasks = a.length ? a : split === "all" ? [...CONFIG.train, ...CONFIG.heldout] : CONFIG[split];
  const rows = await runTasks(tasks, version, { parallel });
  const m = rows.reduce((s, r) => s + r.score, 0) / rows.length;
  console.log(`mean score ${m.toFixed(1)} over ${rows.length} tasks`);
}
