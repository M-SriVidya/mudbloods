import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const file = join(process.cwd(), "src/calc.js");
const { evaluate } = await import(pathToFileURL(file).href);

test("precedence", () => assert.equal(evaluate("2 + 3 * 4"), 14));
test("parentheses", () => assert.equal(evaluate("(2 + 3) * 4"), 20));
test("power is right-associative", () => assert.equal(evaluate("2^3^2"), 512));
test("unary minus", () => {
  assert.equal(evaluate("-3 + 5"), 2);
  assert.equal(evaluate("2*-3"), -6);
  assert.equal(evaluate("-(2+1)"), -3);
});
test("unary minus looser than power", () => assert.equal(evaluate("-2^2"), -4));
test("decimals", () => assert.equal(evaluate(".5 + 0.25 * 2"), 1));
test("left-assoc subtraction and division", () => {
  assert.equal(evaluate("10 - 4 - 3"), 3);
  assert.equal(evaluate("100 / 10 / 5"), 2);
});
test("division by zero throws RangeError", () => assert.throws(() => evaluate("1/0"), RangeError));
test("bad syntax throws SyntaxError", () => {
  for (const bad of ["", "2 +", "(1 + 2", "1 + 2)", "2 $ 3", "*3"]) {
    assert.throws(() => evaluate(bad), SyntaxError, `input: ${JSON.stringify(bad)}`);
  }
});
test("no eval or Function", () => {
  const src = readFileSync(file, "utf8");
  assert.ok(!/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/.test(src));
});
