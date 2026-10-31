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

## Guardrails

- Never write a rule without a run id and finding id behind it.
- Never weaken a security check because it was rejected once; require 2
  rejections on different runs.
- Never edit `SKILL.md` or `flows/` automatically. Only playbooks learn.
  Structural changes to the pipeline are for humans.
