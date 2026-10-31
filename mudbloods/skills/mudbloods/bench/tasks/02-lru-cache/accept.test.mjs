import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { LRUCache } = await import(pathToFileURL(join(process.cwd(), "src/lru.js")).href);

test("get/set", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1);
  assert.equal(c.get("a"), 1);
  assert.equal(c.get("zz"), undefined);
});
test("evicts least recently used", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1); c.set("b", 2); c.get("a"); c.set("c", 3);
  assert.equal(c.has("b"), false);
  assert.equal(c.has("a"), true);
});
test("has does not refresh recency", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1); c.set("b", 2); c.has("a"); c.set("c", 3);
  assert.equal(c.has("a"), false);
});
test("update keeps size", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1); c.set("a", 2);
  assert.equal(c.size, 1);
  assert.equal(c.get("a"), 2);
});
test("delete returns boolean", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1);
  assert.equal(c.delete("a"), true);
  assert.equal(c.delete("a"), false);
});
test("clear", () => {
  const c = new LRUCache({ max: 2 });
  c.set("a", 1); c.clear();
  assert.equal(c.size, 0);
});
test("invalid max", () => {
  assert.throws(() => new LRUCache({ max: 0 }), RangeError);
  assert.throws(() => new LRUCache({ max: 1.5 }), RangeError);
});
test("ttl expiry", () => {
  let t = 0;
  const c = new LRUCache({ max: 5, ttlMs: 100, now: () => t });
  c.set("a", 1);
  t = 99; assert.equal(c.get("a"), 1);
  t = 101; assert.equal(c.get("a"), undefined);
});
test("expired not counted in size", () => {
  let t = 0;
  const c = new LRUCache({ max: 5, ttlMs: 10, now: () => t });
  c.set("a", 1); c.set("b", 2);
  t = 50;
  assert.equal(c.size, 0);
});
test("falsy values stored", () => {
  const c = new LRUCache({ max: 3 });
  c.set("z", 0); c.set("n", null);
  assert.equal(c.get("z"), 0);
  assert.equal(c.has("n"), true);
});
