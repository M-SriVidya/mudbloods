import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const bin = join(cwd, "bin/wc.js");
const { countWords } = await import(pathToFileURL(join(cwd, "src/count.js")).href);
const dir = mkdtempSync(join(tmpdir(), "mbwc-"));
const f1 = join(dir, "a.txt");
const f2 = join(dir, "b.txt");
writeFileSync(f1, "The cat and the hat. Don't stop!");
writeFileSync(f2, "the end");

const run = (args, input) => spawnSync(process.execPath, [bin, ...args], { encoding: "utf8", input });

test("countWords returns Map, case-insensitive", () => {
  const m = countWords("A a B");
  assert.ok(m instanceof Map);
  assert.equal(m.get("a"), 2);
});
test("apostrophes kept", () => assert.equal(countWords("don't Don't").get("don't"), 2));
test("sorted by count then word", () => {
  const r = run([f1]);
  assert.equal(r.status, 0);
  assert.deepEqual(r.stdout.trim().split(/\r?\n/).slice(0, 3), ["2 the", "1 and", "1 cat"]);
});
test("multiple files", () => assert.match(run([f1, f2]).stdout, /^3 the/m));
test("stdin", () => assert.match(run([], "x y x").stdout, /^2 x/m));
test("--top", () => assert.equal(run(["--top", "2", f1]).stdout.trim().split(/\r?\n/).length, 2));
test("--top invalid exits 2", () => {
  const r = run(["--top", "zero", f1]);
  assert.equal(r.status, 2);
  assert.ok(r.stderr.length > 0);
});
test("--json", () => {
  const arr = JSON.parse(run(["--json", f2]).stdout);
  assert.deepEqual(arr[0], { word: "end", count: 1 });
});
test("missing file exits 1 but counts others", () => {
  const r = run([join(dir, "nope.txt"), f2]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /wc: cannot read/);
  assert.match(r.stdout, /1 the/);
});
test("empty input prints nothing", () => assert.equal(run([], "").stdout.trim(), ""));
