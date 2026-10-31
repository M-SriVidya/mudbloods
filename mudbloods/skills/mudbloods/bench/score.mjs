#!/usr/bin/env node
// Mudbloods fixed scorer. The formula here is the contract in flows/bench.md.
//
// Usage:
//   node score.mjs <scorecard.json> [--hidden passed/total]   score one run
//   node score.mjs --compare [results.jsonl]                  compare bench runs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export function score(card, hidden) {
  const f = card.findings ?? {};
  const acc = card.acceptance ?? { total: 0, passed: 0 };
  // Hidden tests are the fixed-task ground truth. Outside bench, fall back to
  // the judge's acceptance counts.
  const h = hidden ?? acc;
  const testPart = h.total > 0 ? h.passed / h.total : 0;
  const judgePart = card.judge_verdict === "pass" ? 1 : 0;
  const bugPart = Math.max(0, 1 - ((f.high ?? 0) + 2 * (f.critical ?? 0)) / 10);
  const phases = card.phases || 0;
  const cleanPart = phases > 0 ? (card.phases_clean_first_round ?? 0) / phases : 0;
  const tokenPart = card.tokens_total ? Math.min(1, 400000 / card.tokens_total) : 0;
  const total = 50 * testPart + 20 * judgePart + 15 * bugPart + 10 * cleanPart + 5 * tokenPart;
  return {
    score: Math.round(total * 10) / 10,
    parts: {
      tests: +(50 * testPart).toFixed(1),
      judge: 20 * judgePart,
      bugs: +(15 * bugPart).toFixed(1),
      clean: +(10 * cleanPart).toFixed(1),
      tokens: +(5 * tokenPart).toFixed(1),
    },
  };
}

function compare(file) {
  if (!existsSync(file)) {
    console.error(`no results at ${file}; run bench/run.mjs first`);
    process.exit(1);
  }
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const runs = new Map();
  for (const r of rows) {
    if (!runs.has(r.bench_run)) runs.set(r.bench_run, []);
    runs.get(r.bench_run).push(r);
  }
  const tasks = [...new Set(rows.map((r) => r.task))].sort();
  const ids = [...runs.keys()];
  const header = ["task".padEnd(22), ...ids.map((id) => id.slice(-13).padStart(14))].join("");
  console.log(header);
  for (const t of tasks) {
    const cells = ids.map((id) => {
      const r = runs.get(id).find((x) => x.task === t);
      return (r ? String(r.score) : "-").padStart(14);
    });
    console.log(t.padEnd(22) + cells.join(""));
  }
  const means = ids.map((id) => {
    const rs = runs.get(id);
    return (rs.reduce((s, r) => s + r.score, 0) / rs.length).toFixed(1).padStart(14);
  });
  console.log("SUITE".padEnd(22) + means.join(""));
  const versions = ids.map((id) => (runs.get(id)[0].playbook_version ?? "?").padStart(14));
  console.log("playbook".padEnd(22) + versions.join(""));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === "--compare") {
    compare(args[1] ?? join(HERE, "results.jsonl"));
  } else if (args[0]) {
    const card = JSON.parse(readFileSync(args[0], "utf8"));
    const i = args.indexOf("--hidden");
    let hidden;
    if (i > -1) {
      const [p, t] = args[i + 1].split("/").map(Number);
      hidden = { passed: p, total: t };
    }
    console.log(JSON.stringify(score(card, hidden)));
  } else {
    console.error("usage: score.mjs <scorecard.json> [--hidden p/t] | --compare [results.jsonl]");
    process.exit(2);
  }
}
