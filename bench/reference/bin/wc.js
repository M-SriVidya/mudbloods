import { readFileSync } from "node:fs";
import { countWords } from "../src/count.js";
const a = process.argv.slice(2); let top, json = false, files = [], code = 0;
for (let i = 0; i < a.length; i++) { if (a[i] === "--json") json = true; else if (a[i] === "--top") { top = Number(a[++i]); if (!Number.isInteger(top) || top <= 0) { console.error("wc: --top needs a positive integer"); process.exit(2); } } else files.push(a[i]); }
let text = "";
if (!files.length) text = readFileSync(0, "utf8"); else for (const f of files) { try { text += "\n" + readFileSync(f, "utf8"); } catch { console.error(`wc: cannot read ${f}`); code = 1; } }
let rows = [...countWords(text)].map(([word, count]) => ({ word, count })).sort((x, y) => y.count - x.count || (x.word < y.word ? -1 : x.word > y.word ? 1 : 0));
if (top) rows = rows.slice(0, top);
process.stdout.write(json ? JSON.stringify(rows) : rows.map(r => `${r.count} ${r.word}`).join("\n") + (rows.length ? "\n" : ""));
process.exitCode = code;
