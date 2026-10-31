Create an ES module `src/ratelimit.js` with two named exports.

`TokenBucket`: constructor takes `{ capacity, refillPerSec, now }`. `capacity` is a positive integer and `refillPerSec` a positive number; otherwise throw `RangeError`. `now` is an optional function returning milliseconds (default `Date.now`). The bucket starts full. Tokens refill continuously at `refillPerSec` per second, never above `capacity`. `tryRemove(n = 1)` removes `n` tokens and returns `true` if at least `n` are available, else returns `false` and removes nothing. `n` must be a positive integer, else throw `RangeError`. An `available` getter returns the current token count rounded down to an integer.

`RateLimiter`: constructor takes the same options and keeps one independent `TokenBucket` per key. `allow(key)` returns the result of `tryRemove(1)` on that key's bucket, creating the bucket on first use. Add tests.
