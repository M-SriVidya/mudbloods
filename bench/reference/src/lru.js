export class LRUCache {
  constructor({ max, ttlMs, now = Date.now } = {}) {
    if (!Number.isInteger(max) || max <= 0) throw new RangeError("max");
    this.max = max; this.ttl = ttlMs; this.now = now; this.m = new Map();
  }
  #live(k) { const e = this.m.get(k); if (!e) return null; if (this.ttl != null && this.now() - e.t > this.ttl) { this.m.delete(k); return null; } return e; }
  get(k) { const e = this.#live(k); if (!e) return undefined; this.m.delete(k); this.m.set(k, e); return e.v; }
  set(k, v) { this.m.delete(k); this.m.set(k, { v, t: this.now() }); while (this.m.size > this.max) this.m.delete(this.m.keys().next().value); return this; }
  has(k) { return !!this.#live(k); }
  delete(k) { return !!this.#live(k) && this.m.delete(k); }
  get size() { for (const k of [...this.m.keys()]) this.#live(k); return this.m.size; }
  clear() { this.m.clear(); }
}
