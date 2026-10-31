import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { parse, compare, satisfies } = await import(pathToFileURL(join(process.cwd(), "src/semver.js")).href);

test("parse full", () =>
  assert.deepEqual(parse("v1.2.3-beta.1+build.5"), { major: 1, minor: 2, patch: 3, prerelease: ["beta", "1"] }));
test("parse plain", () => assert.deepEqual(parse("0.0.0"), { major: 0, minor: 0, patch: 0, prerelease: [] }));
test("parse rejects invalid", () => {
  for (const bad of ["1.2", "1.2.3.4", "01.2.3", "1.2.x", "", "1.2.3-", 123]) {
    assert.throws(() => parse(bad), TypeError, String(bad));
  }
});
test("compare core numerically", () => {
  assert.equal(compare("1.10.0", "1.9.0"), 1);
  assert.equal(compare("1.2.3", "1.2.3"), 0);
  assert.equal(compare("0.9.9", "1.0.0"), -1);
});
test("prerelease below release", () => assert.equal(compare("1.0.0-alpha", "1.0.0"), -1));
test("prerelease ordering (spec example)", () => {
  const order = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0"];
  for (let i = 0; i < order.length - 1; i++) {
    assert.equal(compare(order[i], order[i + 1]), -1, `${order[i]} < ${order[i + 1]}`);
    assert.equal(compare(order[i + 1], order[i]), 1);
  }
});
test("build metadata ignored", () => assert.equal(compare("1.0.0+a", "1.0.0+b"), 0));
test("caret and tilde", () => {
  assert.equal(satisfies("1.9.9", "^1.2.3"), true);
  assert.equal(satisfies("2.0.0", "^1.2.3"), false);
  assert.equal(satisfies("1.2.2", "^1.2.3"), false);
  assert.equal(satisfies("0.2.5", "^0.2.3"), true);
  assert.equal(satisfies("0.3.0", "^0.2.3"), false);
  assert.equal(satisfies("1.2.9", "~1.2.3"), true);
  assert.equal(satisfies("1.3.0", "~1.2.3"), false);
});
test("exact and >=", () => {
  assert.equal(satisfies("1.2.3", "1.2.3"), true);
  assert.equal(satisfies("1.2.4", "1.2.3"), false);
  assert.equal(satisfies("5.0.0", ">=1.2.3"), true);
  assert.equal(satisfies("1.2.2", ">=1.2.3"), false);
});
test("prerelease range rules", () => {
  assert.equal(satisfies("1.3.0-beta", "^1.2.3"), false);
  assert.equal(satisfies("1.2.3-beta.2", "^1.2.3-beta.1"), true);
  assert.throws(() => satisfies("1.0.0", "^banana"), TypeError);
});
