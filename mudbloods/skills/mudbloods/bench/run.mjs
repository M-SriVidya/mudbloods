#!/usr/bin/env node
// Mudbloods bench runner: fixed tasks, fresh workspace per task, hidden tests.
//
// Usage: node run.mjs [task-id ...]
// Env:
//   MB_COMMAND      slash command to invoke (default "/mudbloods:mudbloods"; use
//                   "/mudbloods" after install.mjs)
//   MB_CLAUDE_ARGS  extra args for `claude -p` (default "--permission-mode acceptEdits")
//   MB_TIMEOUT_MS   per-task timeout (default 1800000 = 30 min)
import { execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, copyFileSync,
  existsSync, mkdirSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { score } from "./score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TASKS = join(HERE, "tasks");
const RESULTS = join(HERE, "results.jsonl");
const COMMAND = process.env.MB_COMMAND ?? "/mudbloods:mudbloods";
const CLAUDE_ARGS = (process.env.MB_CLAUDE_ARGS ?? "--permission-mode acceptEdits").split(" ").filter(Boolean);
const TIMEOUT = Number(process.env.MB_TIMEOUT_MS ?? 1800000);

const benchRun = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
const wanted = process.argv.slice(2);
const tasks = readdirSync(TASKS).filter((t) => wanted.length === 0 || wanted.includes(t)).sort();

function sh(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" });
}

function hiddenTests(ws, taskDir) {
  // Tests stay outside the workspace until the build is over.
  const dest = join(ws, ".mb-accept");
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(taskDir, "accept.test.mjs"), join(dest, "accept.test.mjs"));
  const r = spawnSync(process.execPath, ["--test", join(dest, "accept.test.mjs")], {
    cwd: ws, encoding: "utf8",
  });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const pass = Number(/# pass (\d+)/.exec(out)?.[1] ?? 0);
  const fail = Number(/# fail (\d+)/.exec(out)?.[1] ?? 0);
  return { passed: pass, total: pass + fail };
}

function readScorecard(ws) {
  const cur = join(ws, ".mudbloods", "current");
  if (!existsSync(cur)) return null;
  const id = readFileSync(cur, "utf8").trim();
  const p = join(ws, ".mudbloods", "runs", id, "scorecard.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

for (const task of tasks) {
  const taskDir = join(TASKS, task);
  const instruction = readFileSync(join(taskDir, "instruction.md"), "utf8").trim();
  const ws = mkdtempSync(join(tmpdir(), `mb-bench-${task}-`));
  writeFileSync(join(ws, "package.json"), JSON.stringify({
    name: task, version: "0.0.0", type: "module", scripts: { test: "node --test" },
  }, null, 2));
  sh("git init -q && git add -A && git -c user.email=bench@local -c user.name=bench commit -qm init", ws);

  console.log(`[${task}] building in ${ws}`);
  const t0 = Date.now();
  const prompt = `${COMMAND} build --auto ${instruction}`;
  const r = spawnSync("claude", ["-p", prompt, ...CLAUDE_ARGS], {
    cwd: ws, encoding: "utf8", timeout: TIMEOUT, shell: process.platform === "win32",
  });
  const seconds = Math.round((Date.now() - t0) / 1000);
  if (r.error) console.log(`[${task}] claude error: ${r.error.message}`);

  const hidden = hiddenTests(ws, taskDir);
  const card = readScorecard(ws) ?? { phases: 0, findings: {}, judge_verdict: "missing" };
  const s = score(card, hidden);
  const row = {
    bench_run: benchRun, task, workspace: ws, seconds,
    hidden, playbook_version: card.playbook_version ?? "unknown",
    score: s.score, parts: s.parts,
  };
  appendFileSync(RESULTS, JSON.stringify(row) + "\n");
  console.log(`[${task}] hidden ${hidden.passed}/${hidden.total}  score ${s.score}  (${seconds}s)`);
}

execSync(`"${process.execPath}" "${join(HERE, "score.mjs")}" --compare "${RESULTS}"`, { stdio: "inherit" });
