export class TokenBucket {
  constructor({ capacity, refillPerSec, now = Date.now } = {}) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError("capacity");
    if (!(typeof refillPerSec === "number" && refillPerSec > 0)) throw new RangeError("refill");
    this.c = capacity; this.r = refillPerSec; this.now = now; this.tok = capacity; this.t = now();
  }
  #fill() { const n = this.now(); this.tok = Math.min(this.c, this.tok + ((n - this.t) / 1000) * this.r); this.t = n; }
  tryRemove(n = 1) { if (!Number.isInteger(n) || n <= 0) throw new RangeError("n"); this.#fill(); if (this.tok >= n) { this.tok -= n; return true; } return false; }
  get available() { this.#fill(); return Math.floor(this.tok); }
}
export class RateLimiter {
  constructor(o) { this.o = o; this.m = new Map(); new TokenBucket(o); }
  allow(k) { if (!this.m.has(k)) this.m.set(k, new TokenBucket(this.o)); return this.m.get(k).tryRemove(1); }
}
