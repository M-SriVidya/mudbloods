#!/usr/bin/env node
// Proves the hidden tests are fair: every suite must pass 10/10 against the
// hand-written reference solutions in bench/reference/.
// Usage: node bench/verify-tests.mjs
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ref = join(HERE, "reference");
let bad = 0;
for (const task of readdirSync(join(HERE, "tasks")).sort()) {
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", join(HERE, "tasks", task, "accept.test.mjs")], {
    cwd: ref, encoding: "utf8",
  });
  const pass = Number(/# pass (\d+)/.exec(r.stdout)?.[1] ?? 0);
  const fail = Number(/# fail (\d+)/.exec(r.stdout)?.[1] ?? 0);
  if (fail || !pass) bad++;
  console.log(`${task.padEnd(20)} ${pass}/${pass + fail}${fail || !pass ? "  FAIL" : ""}`);
}
process.exit(bad ? 1 : 0);
