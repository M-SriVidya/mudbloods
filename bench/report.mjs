#!/usr/bin/env node
// Turns bench/history.jsonl into bench/REPORT.md and bench/chart.svg.
// Usage: node bench/report.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readHistory, summarize } from "./score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const rows = summarize(readHistory());
if (!rows.length) {
  console.error("no history yet: run node bench/evolve.mjs");
  process.exit(1);
}

const versions = [...new Set(rows.map((r) => r.version))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
const get = (v, split) => rows.find((r) => r.version === v && r.split === split);
const train = versions.map((v) => get(v, "train"));
const held = versions.map((v) => get(v, "heldout"));
const final = [...versions].reverse().find((v) => get(v, "train")?.accepted !== false) ?? "v0";
const per = (r) => (r ? r.cost_usd / r.tasks : null);

// ---- markdown ----
const fmt = (x) => (x == null ? "-" : String(x));
let md = `# Bench report\n\n`;
const t0 = get("v0", "train"), tF = get(final, "train"), h0 = get("v0", "heldout"), hF = get(final, "heldout");
md += `| | v0 (seed) | ${final} (learned) |\n|---|---|---|\n`;
md += `| Train score | ${fmt(t0?.score)} | ${fmt(tF?.score)} |\n`;
md += `| **Held-out score** (never learned from) | ${fmt(h0?.score)} | ${fmt(hF?.score)} |\n`;
md += `| Hidden tests passed, held-out | ${fmt(h0?.tests)} | ${fmt(hF?.tests)} |\n`;
md += `| Cost per task, train | $${fmt(per(t0)?.toFixed(2))} | $${fmt(per(tF)?.toFixed(2))} |\n\n`;
md += `## Every version\n\n| Version | Split | Gate | Score | Hidden tests | High + critical | Cost | Tokens |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  const gate = r.version === "v0" ? "baseline" : r.accepted === true ? "kept" : r.accepted === false ? "rolled back" : "pending";
  md += `| ${r.version} | ${r.split} | ${gate} | ${r.score} | ${r.tests} | ${r.high_critical} | $${r.cost_usd} | ${r.tokens.toLocaleString("en-US")} |\n`;
}
md += `\nPlaybook diffs: \`git diff skills-v0 skills-${final} -- mudbloods/skills/mudbloods/playbooks\`\n\n![chart](chart.svg)\n`;
writeFileSync(join(HERE, "REPORT.md"), md);

// ---- chart ----
const W = 720, H = 360, L = 60, R = 70, T = 40, B = 50;
const x = (i) => L + (versions.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (versions.length - 1));
const y = (s) => T + (H - T - B) * (1 - s / 100);
const maxCost = Math.max(0.01, ...train.concat(held).filter(Boolean).map(per)) * 1.2;
const yc = (c) => T + (H - T - B) * (1 - c / maxCost);
const line = (pts) => pts.filter(Boolean).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const dot = (cx, cy, color, hollow) =>
  `<circle cx="${cx}" cy="${cy}" r="5" fill="${hollow ? "var(--bg)" : color}" stroke="${color}" stroke-width="2"/>`;

const trainPts = train.map((r, i) => (r ? [x(i), y(r.score), r.accepted === false] : null));
const keptPts = trainPts.filter((p) => p && !p[2]);
const heldPts = held.map((r, i) => (r ? [x(i), y(r.score)] : null));
const costPts = train.map((r, i) => (r && r.accepted !== false ? [x(i), yc(per(r))] : null));

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif" font-size="12">
<style>
  :root { --bg:#ffffff; --fg:#1f2328; --mute:#8c959f; --grid:#e6e8eb; --a:#2f6fdb; --b:#d9480f; --c:#2b8a3e; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1117; --fg:#e6edf3; --mute:#7d8590; --grid:#30363d; --a:#6ea8fe; --b:#ff8c5a; --c:#57c26b; } }
  text { fill: var(--fg); }
</style>
<rect width="${W}" height="${H}" fill="var(--bg)"/>
<text x="${L}" y="22" font-size="14" font-weight="600">Score up, cost down: mudbloods learning on fixed tasks</text>\n`;
for (const s of [0, 25, 50, 75, 100]) {
  svg += `<line x1="${L}" x2="${W - R}" y1="${y(s)}" y2="${y(s)}" stroke="var(--grid)"/><text x="${L - 8}" y="${y(s) + 4}" text-anchor="end" fill="var(--mute)">${s}</text>\n`;
}
svg += `<text x="${W - R + 8}" y="${T - 8}" fill="var(--mute)">$/task</text>`;
for (const f of [0, 0.5, 1]) svg += `<text x="${W - R + 8}" y="${yc(maxCost * f) + 4}" fill="var(--mute)">${(maxCost * f).toFixed(2)}</text>`;
versions.forEach((v, i) => (svg += `<text x="${x(i)}" y="${H - B + 20}" text-anchor="middle">${v}</text>`));
svg += `<path d="${line(keptPts)}" fill="none" stroke="var(--a)" stroke-width="2.5"/>`;
svg += `<path d="${line(costPts)}" fill="none" stroke="var(--c)" stroke-width="2" stroke-dasharray="5 4"/>`;
trainPts.forEach((p) => p && (svg += dot(p[0], p[1], "var(--a)", p[2])));
heldPts.forEach((p) => p && (svg += dot(p[0], p[1], "var(--b)", false)));
costPts.forEach((p) => p && (svg += `<rect x="${p[0] - 4}" y="${p[1] - 4}" width="8" height="8" fill="var(--c)"/>`));
const lg = H - 12;
svg += `<circle cx="${L}" cy="${lg - 4}" r="5" fill="var(--a)"/><text x="${L + 10}" y="${lg}">train score (hollow = rolled back)</text>`;
svg += `<circle cx="${L + 230}" cy="${lg - 4}" r="5" fill="var(--b)"/><text x="${L + 240}" y="${lg}">held-out score</text>`;
svg += `<rect x="${L + 356}" y="${lg - 8}" width="8" height="8" fill="var(--c)"/><text x="${L + 370}" y="${lg}">cost per task</text>`;
svg += `\n</svg>\n`;
writeFileSync(join(HERE, "chart.svg"), svg);

console.log(md);
console.log(`wrote ${join(HERE, "REPORT.md")} and chart.svg`);
