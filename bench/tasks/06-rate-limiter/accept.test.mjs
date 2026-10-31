import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { TokenBucket, RateLimiter } = await import(pathToFileURL(join(process.cwd(), "src/ratelimit.js")).href);

test("starts full", () => {
  const b = new TokenBucket({ capacity: 3, refillPerSec: 1, now: () => 0 });
  assert.equal(b.available, 3);
});
test("removes until empty", () => {
  const b = new TokenBucket({ capacity: 2, refillPerSec: 1, now: () => 0 });
  assert.equal(b.tryRemove(), true);
  assert.equal(b.tryRemove(), true);
  assert.equal(b.tryRemove(), false);
});
test("refills over time", () => {
  let t = 0;
  const b = new TokenBucket({ capacity: 2, refillPerSec: 2, now: () => t });
  b.tryRemove(2);
  t = 500;
  assert.equal(b.available, 1);
  assert.equal(b.tryRemove(), true);
});
test("never above capacity", () => {
  let t = 0;
  const b = new TokenBucket({ capacity: 2, refillPerSec: 10, now: () => t });
  t = 60000;
  assert.equal(b.available, 2);
});
test("failed removal takes nothing", () => {
  const b = new TokenBucket({ capacity: 3, refillPerSec: 1, now: () => 0 });
  assert.equal(b.tryRemove(5), false);
  assert.equal(b.available, 3);
});
test("fractional refill accumulates", () => {
  let t = 0;
  const b = new TokenBucket({ capacity: 1, refillPerSec: 1, now: () => t });
  b.tryRemove();
  t = 400; assert.equal(b.tryRemove(), false);
  t = 1000; assert.equal(b.tryRemove(), true);
});
test("invalid constructor options", () => {
  assert.throws(() => new TokenBucket({ capacity: 0, refillPerSec: 1 }), RangeError);
  assert.throws(() => new TokenBucket({ capacity: 1.5, refillPerSec: 1 }), RangeError);
  assert.throws(() => new TokenBucket({ capacity: 1, refillPerSec: 0 }), RangeError);
});
test("invalid n", () => {
  const b = new TokenBucket({ capacity: 3, refillPerSec: 1, now: () => 0 });
  assert.throws(() => b.tryRemove(0), RangeError);
  assert.throws(() => b.tryRemove(1.5), RangeError);
});
test("limiter keys are independent", () => {
  const l = new RateLimiter({ capacity: 1, refillPerSec: 1, now: () => 0 });
  assert.equal(l.allow("a"), true);
  assert.equal(l.allow("a"), false);
  assert.equal(l.allow("b"), true);
});
test("limiter refills per key", () => {
  let t = 0;
  const l = new RateLimiter({ capacity: 1, refillPerSec: 1, now: () => t });
  l.allow("a");
  t = 1000;
  assert.equal(l.allow("a"), true);
});
