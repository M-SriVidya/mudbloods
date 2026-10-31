#!/usr/bin/env node
// Installs mudbloods as a user-level skill so it runs as `/mudbloods ...`
// (plugin installs are namespaced as `/mudbloods:mudbloods ...`).
//
// Usage: node install.mjs [--uninstall]
import { cpSync, rmSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAUDE = join(homedir(), ".claude");
const skillDest = join(CLAUDE, "skills", "mudbloods");
const agentDest = join(CLAUDE, "agents");
const agents = readdirSync(join(HERE, "agents")).filter((f) => f.endsWith(".md"));

if (process.argv.includes("--uninstall")) {
  rmSync(skillDest, { recursive: true, force: true });
  for (const a of agents) rmSync(join(agentDest, a), { force: true });
  // Learned user-layer playbooks in ~/.claude/mudbloods are kept on purpose.
  console.log("mudbloods removed (learned playbooks in ~/.claude/mudbloods kept)");
  process.exit(0);
}

if (existsSync(skillDest)) rmSync(skillDest, { recursive: true, force: true });
mkdirSync(skillDest, { recursive: true });
cpSync(join(HERE, "skills", "mudbloods"), skillDest, { recursive: true });
mkdirSync(agentDest, { recursive: true });
for (const a of agents) cpSync(join(HERE, "agents", a), join(agentDest, a));
mkdirSync(join(CLAUDE, "mudbloods", "playbooks"), { recursive: true });

console.log(`skill  -> ${skillDest}`);
console.log(`agents -> ${agentDest} (${agents.length})`);
console.log("restart Claude Code, then: /mudbloods build <instruction>");
