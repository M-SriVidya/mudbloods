---
name: mudbloods
description: >
  Architecture-first build pipeline with self-improving playbooks. Use for
  "/mudbloods build <instruction>" (full end-to-end run) or an atomic verb:
  "/mudbloods architecture", "/mudbloods plan", "/mudbloods code",
  "/mudbloods review", "/mudbloods judge", "/mudbloods learn",
  "/mudbloods bench", "/mudbloods status". Also triggers on "mudbloods build",
  "run the mudbloods pipeline", "red team / blue team this code".
argument-hint: "build <instruction> | architecture | plan | code [phase] | review [target] | judge | learn | bench | status"
---

# mudbloods

A build pipeline that plans like a senior engineer, codes with cheap models,
reviews adversarially, and rewrites its own playbooks after every run.

`SKILL_DIR` below means the directory holding this file. The host prints it as
"Base directory for this skill" when the skill loads; use that exact absolute
path. All paths under it are relative to it. `.mudbloods/` means the folder at
the root of the user's repo.

**Subagents start cold in the user's repo and cannot find skill files on
their own.** Every path you put in an agent prompt (playbooks, flow files,
reference files, run files) must be absolute: `SKILL_DIR/...` resolved, or
`<repo root>/.mudbloods/...` resolved.

## 1. Route the command

Read the first word of the arguments and load exactly one flow file. Do not
load flows you will not run: every file costs tokens.

| Verb | Flow file | What it does |
|---|---|---|
| `build <instruction>` | `flows/build.md` | End to end: architecture, sign-off, plan, code, review loops, judge, learn |
| `build architecture <instruction>` or `architecture` / `arch` | `flows/architecture.md` | Architecture diagram plus open questions only |
| `plan` | `flows/plan.md` | Split the approved architecture into phases |
| `code [phase-id]` | `flows/code.md` | Build one phase (or the next pending one) and run its review loop |
| `review [PR# / branch / path]` | `flows/review.md` | Standalone red/blue review of a PR, diff or path |
| `judge` | `flows/judge.md` | Final panel: built result against architecture and acceptance criteria |
| `learn [--promote]` | `flows/learn.md` | Mine the last run, rewrite the playbooks |
| `bench` | `flows/bench.md` | Run the fixed task suite and record the score |
| `status` | `flows/status.md` | Show run state, score history and playbook version |

Plugin installs also expose one command per verb (`/mudbloods:build`,
`/mudbloods:review`, ...). Each passes `<verb> <arguments>` to this skill, so
route them the same way.

No verb, or an unknown verb: treat the whole argument string as a `build`
instruction, and say so in one line. Empty arguments: print the table above.

Flags valid on any verb:

- `--auto`: accept every default answer and skip the sign-off wait. Use only
  when the user passed it, and always for `bench`.
- `--phases N`: cap the planner at N phases.
- `--no-learn`: skip the learn step at the end of `build`.

## 2. Rules for every flow

1. **Model split.** Thinking agents (architect, critic, planner, red team,
   judge, learner) run on `opus` or `sonnet`. Code-writing agents (coder,
   blue team) run on `haiku` only. Never let a thinking-tier agent write
   product code, and never let a Haiku agent make an architecture decision.
2. **Agents.** Spawn the named agents in `reference/agents.md`. When an agent
   type is missing, fall back to `general-purpose` with the model and the
   playbook path listed there.
3. **Playbooks first.** Before spawning any agent, resolve its playbook
   (see `reference/playbooks.md`) and pass the resolved file paths in the
   prompt. Agents read them before acting. This is how learning reaches
   the next run.
4. **State on disk.** Every flow reads and writes `.mudbloods/` as described
   in `reference/state.md`. Never keep pipeline state only in chat: the
   atomic verbs must work in a fresh session.
5. **Severity scale.** Use `reference/severity.md` everywhere. `critical`
   and `high` block progress. `medium` and `low` carry forward.
6. **Telemetry.** Every agent result appends one line to
   `.mudbloods/runs/<run-id>/events.jsonl` (format in `reference/state.md`).
   The scorer and the learner read only this file and the scorecard.
7. **Gates need a human** unless `--auto` is set: the architecture sign-off
   in `flows/architecture.md` is mandatory and needs an explicit yes.
8. **Brief status.** One line per phase change, one line per review round
   with severity counts. Findings, diagrams and plans go to files and are
   linked, not pasted, except the architecture diagram at sign-off.
