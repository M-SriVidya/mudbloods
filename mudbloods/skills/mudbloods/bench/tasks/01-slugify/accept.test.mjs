import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { slugify } = await import(pathToFileURL(join(process.cwd(), "src/slugify.js")).href);

test("basic", () => assert.equal(slugify("Hello World"), "hello-world"));
test("accents", () => assert.equal(slugify("Crème Brûlée"), "creme-brulee"));
test("punctuation and repeats", () => assert.equal(slugify("  a -- b!!  c  "), "a-b-c"));
test("custom separator", () => assert.equal(slugify("Hello World", { separator: "_" }), "hello_world"));
test("maxLength keeps whole words", () => assert.equal(slugify("one two three", { maxLength: 9 }), "one-two"));
test("maxLength no trailing sep", () => assert.ok(!slugify("one two three", { maxLength: 8 }).endsWith("-")));
test("empty string", () => assert.equal(slugify(""), ""));
test("only symbols", () => assert.equal(slugify("!!!"), ""));
test("non-string throws TypeError", () => assert.throws(() => slugify(42), TypeError));
test("numbers kept", () => assert.equal(slugify("Top 10 Tips"), "top-10-tips"));
