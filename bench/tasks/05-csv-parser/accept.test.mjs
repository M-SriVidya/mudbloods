import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { parseCSV } = await import(pathToFileURL(join(process.cwd(), "src/csv.js")).href);

test("simple rows", () => assert.deepEqual(parseCSV("a,b\n1,2"), [["a", "b"], ["1", "2"]]));
test("trailing newline ignored", () => assert.deepEqual(parseCSV("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]));
test("CRLF", () => assert.deepEqual(parseCSV("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]));
test("quoted delimiter and newline", () =>
  assert.deepEqual(parseCSV('"x,y","line1\nline2"'), [["x,y", "line1\nline2"]]));
test("escaped quotes", () => assert.deepEqual(parseCSV('"say ""hi"""'), [['say "hi"']]));
test("empty fields and no trimming", () => assert.deepEqual(parseCSV("a,, b ,"), [["a", "", " b ", ""]]));
test("custom delimiter", () => assert.deepEqual(parseCSV("a;b\n1;2", { delimiter: ";" }), [["a", "b"], ["1", "2"]]));
test("header mode", () =>
  assert.deepEqual(parseCSV("name,age\nAda,36\nAlan,41", { header: true }), [
    { name: "Ada", age: "36" },
    { name: "Alan", age: "41" },
  ]));
test("header field-count mismatch names the record", () =>
  assert.throws(() => parseCSV("a,b\n1,2\n3", { header: true }), (e) => e instanceof Error && /3/.test(e.message)));
test("empty input and unterminated quote", () => {
  assert.deepEqual(parseCSV(""), []);
  assert.throws(() => parseCSV('a,"oops\n1,2'), SyntaxError);
});
