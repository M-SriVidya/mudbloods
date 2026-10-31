import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { Shortener } = await import(pathToFileURL(join(process.cwd(), "src/shortener.js")).href);
const codeOf = (link) => link.split("/").pop();

test("short link shape", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  const link = s.shorten("https://example.com/a");
  assert.match(link, /^https:\/\/sho\.rt\/[A-Za-z0-9]{6}$/);
});
test("no double slash", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt/", codeLength: 4 });
  assert.match(s.shorten("https://example.com"), /^https:\/\/sho\.rt\/[A-Za-z0-9]{4}$/);
});
test("same url same link", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  assert.equal(s.shorten("https://example.com/x"), s.shorten("https://example.com/x"));
});
test("resolve by code and by link", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  const link = s.shorten("https://example.com/y");
  assert.equal(s.resolve(link), "https://example.com/y");
  assert.equal(s.resolve(codeOf(link)), "https://example.com/y");
});
test("hits counted, unknown is null", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  const code = codeOf(s.shorten("https://example.com/z"));
  s.resolve(code); s.resolve(code); s.resolve("nope00");
  assert.deepEqual(s.stats(code), { url: "https://example.com/z", hits: 2 });
  assert.equal(s.resolve("nope00"), null);
  assert.equal(s.stats("nope00"), null);
});
test("rejects non-http urls and missing baseUrl", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  for (const bad of ["ftp://x.com", "javascript:alert(1)", "not a url", "/relative"]) {
    assert.throws(() => s.shorten(bad), TypeError, bad);
  }
  assert.throws(() => new Shortener({}), TypeError);
});
test("alias", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  assert.equal(s.shorten("https://example.com/al", { alias: "my-link" }), "https://sho.rt/my-link");
  assert.equal(s.resolve("my-link"), "https://example.com/al");
});
test("alias taken", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  s.shorten("https://example.com/1", { alias: "dup" });
  assert.throws(() => s.shorten("https://example.com/2", { alias: "dup" }), (e) => e.code === "ALIAS_TAKEN");
});
test("invalid alias", () => {
  const s = new Shortener({ baseUrl: "https://sho.rt" });
  assert.throws(() => s.shorten("https://example.com", { alias: "bad alias!" }), TypeError);
  assert.throws(() => s.shorten("https://example.com", { alias: "x".repeat(33) }), TypeError);
});
test("retries on collision", () => {
  // random yields the same code twice, then a different one.
  const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  let i = 0;
  const s = new Shortener({ baseUrl: "https://sho.rt", random: () => seq[i++ % seq.length] });
  const a = codeOf(s.shorten("https://example.com/c1"));
  const b = codeOf(s.shorten("https://example.com/c2"));
  assert.notEqual(a, b);
  assert.equal(s.resolve(b), "https://example.com/c2");
});
