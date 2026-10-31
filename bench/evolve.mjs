#!/usr/bin/env node
// The self-improvement loop, end to end:
//
//   v0: score TRAIN and HELD-OUT tasks with the current playbooks
//   repeat N times:
//     learner rewrites the playbooks from the last accepted TRAIN run
//       (bugs red caught, bugs red missed = hidden test failures, false alarms)
//     re-score TRAIN with the candidate playbooks
//     candidate score >= best  -> git commit + tag skills-vK   (kept)
//     otherwise                -> git checkout the playbooks   (rolled back)
//   final: score HELD-OUT with the last accepted playbooks
//
// Held-out tasks never feed the learner, so a held-out gain is not memorising.
//
// Usage: node bench/evolve.mjs [--iterations 2] [--parallel 4] [--reuse-v0]
//   --reuse-v0   take v0 scores from history.jsonl instead of re-running them
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CONFIG, readHistory } from "./score.mjs";
import { runTasks, runClaude, usageOf, REPO, PLAYBOOKS, ARTIFACTS, playbookCommit } from "./run.mjs";

const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(n); return i < 0 ? d : a[i + 1]; };
const ITER = Number(opt("--iterations", 2));
const PAR = Number(opt("--parallel", 4));
const REUSE = a.includes("--reuse-v0");

const git = (...args) => spawnSync("git", args, { cwd: REPO, encoding: "utf8" });
// Commits need an identity; fall back to a bench one on fresh machines.
const ID = git("config", "user.email").stdout.trim() ? [] : ["-c", "user.name=mudbloods-bench", "-c", "user.email=bench@mudbloods.local"];
const mean = (rows) => Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10) / 10;
const log = (s) => console.log(`\n== ${s}`);

function requireCleanPlaybooks() {
  if (git("status", "--porcelain", "--", PLAYBOOKS).stdout.trim()) {
    console.error(`playbooks have uncommitted changes; commit or stash them first:\n${PLAYBOOKS}`);
    process.exit(1);
  }
}

function tag(name) {
  git("tag", "-f", name);
}

// Everything the learner may use. Built only from TRAIN rows.
function buildEvidence(version, trainRows, rejected) {
  const tasks = trainRows.map((r) => {
    const full = JSON.parse(readFileSync(join(ARTIFACTS, version, `${r.task}.json`), "utf8"));
    const blocking = full.finding_details.filter((f) => ["critical", "high"].includes(f.severity) && f.status !== "rejected");
    return {
      task: r.task,
      instruction: readFileSync(join(REPO, "bench", "tasks", r.task, "instruction.md"), "utf8").trim(),
      score: r.score,
      hidden_tests: r.hidden,
      // Bugs that reached the finished code: the red team missed these.
      missed_by_red_team: full.failures,
      // Bugs the coder wrote and the red team caught.
      caught_by_red_team: blocking.map(({ id, severity, category, file, evidence, fix_hint, precedent, escalated }) =>
        ({ id, severity, category, file, evidence, fix_hint, precedent, escalated })),
      // Red-team findings the blue team proved wrong.
      false_alarms: full.finding_details.filter((f) => f.status === "rejected")
        .map(({ id, category, evidence }) => ({ id, category, evidence })),
      cost_usd: r.cost_usd,
      tokens: r.tokens,
    };
  });
  return { version, train_score: mean(trainRows), rejected_candidates: rejected, tasks };
}

async function learn(version, evidence, nextVersion) {
  const dir = join(ARTIFACTS, nextVersion);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "evidence.json");
  writeFileSync(file, JSON.stringify(evidence, null, 2));
  const res = await runClaude(`/mudbloods:mudbloods learn --bench --evidence ${file} --version ${nextVersion}`, REPO);
  const u = usageOf(res.json);
  console.log(`learner: exit ${res.code}, $${u.cost_usd ?? "?"}`);
  return u;
}

// ---- v0 ----
requireCleanPlaybooks();
let best, bestVersion = "v0", bestTrain;
const all = [...CONFIG.train, ...CONFIG.heldout];
if (REUSE && readHistory().some((r) => r.version === "v0")) {
  log("v0: reusing scores from history.jsonl");
  bestTrain = readHistory().filter((r) => r.version === "v0" && r.split === "train");
} else {
  log(`v0: scoring ${all.length} tasks with playbooks ${playbookCommit()}`);
  const rows = await runTasks(all, "v0", { parallel: PAR });
  bestTrain = rows.filter((r) => r.split === "train");
}
best = mean(bestTrain);
tag("skills-v0");
console.log(`v0 train score ${best}`);

// ---- improve, gated ----
const rejected = [];
for (let k = 1; k <= ITER; k++) {
  const v = `v${k}`;
  log(`${v}: learner rewrites playbooks from ${bestVersion} train results`);
  await learn(bestVersion, buildEvidence(bestVersion, bestTrain, rejected), v);

  const diff = git("diff", "--stat", "--", PLAYBOOKS).stdout.trim();
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", PLAYBOOKS).stdout.trim();
  if (!diff && !untracked) {
    console.log("learner proposed no change; stopping");
    break;
  }
  console.log(diff || untracked);
  const patch = git("diff", "--", PLAYBOOKS).stdout;
  writeFileSync(join(ARTIFACTS, v, "playbooks.diff"), patch);

  log(`${v}: gate, re-scoring ${CONFIG.train.length} train tasks with candidate playbooks`);
  const rows = await runTasks(CONFIG.train, v, { parallel: PAR, accepted: null });
  const cand = mean(rows);
  const kept = cand >= best;

  if (kept) {
    git("add", "--", PLAYBOOKS);
    git(...ID, "commit", "-q", "-m", `skills ${v}: train score ${best} -> ${cand}`, "-m", `Learned by bench/evolve.mjs from ${bestVersion} train results. Gate passed.`);
    tag(`skills-${v}`);
    console.log(`KEPT ${v}: ${best} -> ${cand} (tag skills-${v})`);
    best = cand; bestVersion = v; bestTrain = rows;
  } else {
    git("checkout", "--", PLAYBOOKS);
    git("clean", "-fdq", "--", PLAYBOOKS);
    rejected.push({ version: v, score: cand, best, diff: patch.slice(0, 6000) });
    console.log(`ROLLED BACK ${v}: ${cand} < ${best}`);
  }
  // Mark the gate decision on this version's history rows.
  markAccepted(v, kept);
}

// ---- held-out check ----
if (bestVersion !== "v0") {
  log(`final: held-out tasks with ${bestVersion} playbooks (never seen by the learner)`);
  await runTasks(CONFIG.heldout, bestVersion, { parallel: PAR });
}

spawnSync(process.execPath, [join(REPO, "bench", "report.mjs")], { stdio: "inherit" });

function markAccepted(version, ok) {
  const file = join(REPO, "bench", "history.jsonl");
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => {
    const r = JSON.parse(l);
    if (r.version === version && r.accepted === null) r.accepted = ok;
    return JSON.stringify(r);
  });
  writeFileSync(file, lines.join("\n") + "\n");
}
