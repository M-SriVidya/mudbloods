export function evaluate(expr) {
  if (typeof expr !== "string") throw new SyntaxError("expr");
  const toks = []; let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { const m = /^(\d+\.?\d*|\.\d+)/.exec(expr.slice(i)); if (!m) throw new SyntaxError("num"); toks.push({ t: "n", v: Number(m[0]) }); i += m[0].length; continue; }
    if ("+-*/^()".includes(c)) { toks.push({ t: c }); i++; continue; }
    throw new SyntaxError("char " + c);
  }
  let p = 0;
  const peek = () => toks[p]?.t;
  function add() { let v = mul(); while (peek() === "+" || peek() === "-") { const o = toks[p++].t; const r = mul(); v = o === "+" ? v + r : v - r; } return v; }
  function mul() { let v = unary(); while (peek() === "*" || peek() === "/") { const o = toks[p++].t; const r = unary(); if (o === "/") { if (r === 0) throw new RangeError("div0"); v /= r; } else v *= r; } return v; }
  function unary() { if (peek() === "-") { p++; return -unary(); } return pow(); }
  function pow() { const b = prim(); if (peek() === "^") { p++; return b ** unary(); } return b; }
  function prim() { const k = toks[p]; if (!k) throw new SyntaxError("eof"); if (k.t === "n") { p++; return k.v; } if (k.t === "(") { p++; const v = add(); if (peek() !== ")") throw new SyntaxError(")"); p++; return v; } throw new SyntaxError("tok " + k.t); }
  const v = add(); if (p !== toks.length) throw new SyntaxError("trailing"); return v;
}
