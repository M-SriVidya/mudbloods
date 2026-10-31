const RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export function parse(v) { if (typeof v !== "string") throw new TypeError("v"); const m = RE.exec(v); if (!m) throw new TypeError("v"); return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split(".") : [] }; }
function cmpId(a, b) { const na = /^\d+$/.test(a), nb = /^\d+$/.test(b); if (na && nb) return Math.sign(a - b); if (na) return -1; if (nb) return 1; return a < b ? -1 : a > b ? 1 : 0; }
function cmpP(a, b) { for (const k of ["major", "minor", "patch"]) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1; const x = a.prerelease, y = b.prerelease; if (!x.length && !y.length) return 0; if (!x.length) return 1; if (!y.length) return -1; for (let i = 0; i < Math.min(x.length, y.length); i++) { const c = cmpId(x[i], y[i]); if (c) return c; } return Math.sign(x.length - y.length); }
export function compare(a, b) { return cmpP(parse(a), parse(b)); }
export function satisfies(v, range) {
  const m = /^(\^|~|>=)?(.*)$/.exec(range); let r; try { r = parse(m[2]); } catch { throw new TypeError("range"); }
  const x = parse(v);
  if (x.prerelease.length && !(r.prerelease.length && r.major === x.major && r.minor === x.minor && r.patch === x.patch)) return false;
  const ge = cmpP(x, r) >= 0;
  switch (m[1]) {
    case undefined: return cmpP(x, r) === 0;
    case ">=": return ge;
    case "~": return ge && x.major === r.major && x.minor === r.minor;
    case "^": return ge && x.major === r.major && (r.major !== 0 || x.minor === r.minor);
  }
}
