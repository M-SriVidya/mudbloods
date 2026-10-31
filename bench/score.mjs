#!/usr/bin/env node
// Deterministic scorer. No LLM grades anything here: every input is a count
// read from a file or from Claude Code's own usage report.
//
//   score = 70 * hidden tests passed / total
//         + 15 * max(0, 1 - (high + 2 * critical) / 10)    bugs the red team had to catch
//         + 15 * min(1, ref_cost_usd / cost_usd)           0 if cost unknown
//
// Usage:
//   node bench/score.mjs --compare [history.jsonl]   table of every version
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CONFIG = JSON.parse(readFileSync(join(HERE, "tasks.json"), "utf8"));
export const HISTORY = join(HERE, "history.jsonl");

export function score({ hidden, findings = {}, cost_usd }) {
  const w = CONFIG.weights;
  const tests = hidden && hidden.total > 0 ? hidden.passed / hidden.total : 0;
  const bugs = Math.max(0, 1 - ((findings.high ?? 0) + 2 * (findings.critical ?? 0)) / CONFIG.bug_cap);
  const cost = cost_usd ? Math.min(1, CONFIG.ref_cost_usd / cost_usd) : 0;
  const parts = {
    tests: round(w.tests * tests),
    bugs: round(w.bugs * bugs),
    cost: round(w.cost * cost),
  };
  return { score: round(parts.tests + parts.bugs + parts.cost), parts };
}

const round = (x) => Math.round(x * 10) / 10;
const mean = (xs) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function readHistory(file = HISTORY) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// One summary row per (version, split): mean score, pass rate, cost, tokens.
export function summarize(rows) {
  const key = (r) => `${r.version}\u0000${r.split}`;
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(key(r))) groups.set(key(r), []);
    groups.get(key(r)).push(r);
  }
  return [...groups.values()].map((g) => ({
    version: g[0].version,
    split: g[0].split,
    accepted: g[0].accepted,
    tasks: g.length,
    score: mean(g.map((r) => r.score)),
    tests: `${g.reduce((a, r) => a + r.hidden.passed, 0)}/${g.reduce((a, r) => a + r.hidden.total, 0)}`,
    high_critical: g.reduce((a, r) => a + (r.findings.high ?? 0) + (r.findings.critical ?? 0), 0),
    cost_usd: round(g.reduce((a, r) => a + (r.cost_usd ?? 0), 0) * 100) / 100,
    tokens: g.reduce((a, r) => a + (r.tokens ?? 0), 0),
  }));
}

function printCompare(file) {
  const rows = summarize(readHistory(file));
  if (!rows.length) {
    console.error(`no history at ${file}; run node bench/evolve.mjs first`);
    process.exit(1);
  }
  const cols = ["version", "split", "accepted", "score", "tests", "high_critical", "cost_usd", "tokens"];
  console.log(cols.map((c) => c.padEnd(14)).join(""));
  for (const r of rows) console.log(cols.map((c) => String(r[c] ?? "").padEnd(14)).join(""));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const a = process.argv.slice(2);
  if (a[0] === "--compare") printCompare(a[1] ?? HISTORY);
  else {
    console.error("usage: node bench/score.mjs --compare [history.jsonl]");
    process.exit(2);
  }
}
