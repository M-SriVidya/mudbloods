# Flow: learn (self-improvement)

`/mudbloods learn [--promote]`. Turns what went wrong in a run into rules the
next run follows. This is how mudbloods gets better each time it runs.

## Inputs

The latest finished run (or `--run <id>`): `events.jsonl`, all
`findings.jsonl`, `architecture.v*.md` revisions with the user's reasons,
`judge.md`, `scorecard.json`, plus `.mudbloods/scores.jsonl` for trend.

## Steps

1. **Spawn one `mb-learner`** (sonnet) with those inputs, the current
   playbooks (all three layers), and `reference/playbooks.md`.
2. The learner extracts signals. Each signal maps to one playbook:

| Signal | Means | Playbook to change |
|---|---|---|
| `critical`/`high` finding fixed by blue team | Coder made a preventable mistake | `coder.md`: rule to prevent it, citing the repo precedent the blue team used |
| Same category found in 2+ phases or runs | Systemic weakness | `coder.md` rule plus `red-team.md` check, both marked `seen Nx` |
| Finding escalated to sonnet | Haiku cannot fix this class unaided | `blue-team.md`: step-by-step recipe for this class |
| Finding `rejected` after dispute | Red team false positive | `red-team.md`: "do not flag X when Y" |
| Judge failed a criterion the red team never flagged | Red team blind spot | `red-team.md`: new check |
| User revised the architecture | Architect misread intent | `architect.md`: what to ask or assume next time |
| Open question where the user changed the default | Wrong default | `architect.md`: better default for this repo |
| Phase needed >2 rounds | Task too vague for Haiku | `planner.md`: rule for splitting or specifying |

3. **Repo precedent mining.** For each `critical`/`high` category in the run,
   the learner greps the repo for how it already handles that category
   (for example `error-handling`: search for existing error classes, retry
   helpers, HTTP error mappers). It writes the findings into
   `.mudbloods/playbooks/coder.md` as concrete rules with `path:line`. This
   is repo-specific, so it goes to the repo layer, never the seed.
4. **Write.** Repo-specific rules go to `.mudbloods/playbooks/`. Rules with
   no repo path in them go to `~/.claude/mudbloods/playbooks/`. Bump the
   `mb-version` header of each changed file.
5. **Prune.** Using `scores.jsonl`: a rule added 3+ runs ago, still
   `seen 1x`, while the score did not improve, is removed. Keep each overlay
   at 40 rules max.
6. **Write `lessons.md`** in the run folder: rules added, rules pruned, and
   the evidence for each.

## --promote

Copies user-layer rules that have `seen 3x` or more, across at least 2 repos,
into the seed playbooks in `SKILL_DIR/playbooks/`. This edits the skill's own
files. Show the diff and get an explicit yes before writing. In the mudbloods
source repo, commit with message `learn: promote <n> rules (score <a> -> <b>)`
only when the user asks to commit.

## --bench --evidence <file> --version <vK>

Called only by `bench/evolve.mjs`. No user is present. The evolve script, not
a human, approves the change: it re-scores the train tasks and rolls the
playbooks back if the score drops.

1. Read the evidence JSON. Per train task it holds:
   - `missed_by_red_team`: hidden tests that failed in the finished code.
     These are bugs that got past both the coder and the red team.
   - `caught_by_red_team`: critical/high findings, with the blue team's
     `precedent` and `escalated` fields.
   - `false_alarms`: red-team findings the blue team proved wrong.
   - `rejected_candidates`: earlier rewrites that lowered the score, with
     their diffs. Do not propose them again.
2. Spawn one `mb-learner` with the evidence path, the seed playbooks in
   `SKILL_DIR/playbooks/`, and `reference/playbooks.md`.
3. Turn signals into rules, editing **only** the seed playbooks in
   `SKILL_DIR/playbooks/`:

| Evidence | Playbook | Rule shape |
|---|---|---|
| `missed_by_red_team` | `red-team.md` and `coder.md` | A check the red team must run, and a rule that stops the coder writing the bug. Write them for the general bug class, never the task. |
| `caught_by_red_team` | `coder.md` | A rule that prevents the mistake. Use the blue team's fix as the recipe. |
| `escalated: true` | `blue-team.md` | A step-by-step fix recipe for that class, so Haiku can fix it without help. |
| `false_alarms` | `red-team.md` | "Do not flag X when Y", with the evidence that disproved it. |
| A rule whose bug class did not appear in this version, after 2+ versions | any | Delete it (prune). |

4. **No overfitting.** Never name a bench task, test name, function name or
   file path from the evidence in a rule. "Handle unary minus after an
   operator" is a good rule. "In `src/calc.js` handle `2*-3`" is overfitting,
   and held-out tasks will expose it.
5. Each rule ends with `(from <vK-1> <task>/<finding or test>, seen Nx)`.
   Merge with an existing rule of the same intent by incrementing `seen`.
   Keep each playbook at 40 rules max.
6. Bump each changed file's `<!-- mb-version: N -->` header.
7. Write `bench/artifacts/<vK>/lessons.md`: rules added, merged and pruned,
   each with its evidence. Do not commit: the evolve script commits only if
   the gate passes.

## Guardrails

- Never write a rule without a run id and finding id behind it.
- Never weaken a security check because it was rejected once; require 2
  rejections on different runs.
- Never edit `SKILL.md` or `flows/` automatically. Only playbooks learn.
  Structural changes to the pipeline are for humans.
