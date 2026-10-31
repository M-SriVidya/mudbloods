# State layout

All pipeline state lives in `.mudbloods/` at the repo root. Add it to
`.gitignore` except `playbooks/` and `scores.jsonl`, which the team may want
to commit.

```
.mudbloods/
  current                      # text file: id of the active run
  scores.jsonl                 # one line per finished run (see scorecard)
  playbooks/                   # repo-level learned overlays (see playbooks.md)
  runs/<run-id>/
    instruction.md             # the user's instruction, verbatim
    repo-map.md                # architect's summary of the repo
    architecture.md            # final diagram + decisions + answered questions
    architecture.v<N>.md       # earlier drafts, kept for the learner
    signoff.md                 # user's acknowledgement text and timestamp
    plan.md                    # phases, tasks, acceptance criteria
    phases/<phase-id>/
      tasks.md                 # task split and file ownership
      findings.jsonl           # every finding, every round
      rounds.md                # one line per round with counts
    carry.md                   # open medium/low findings
    judge.md                   # final panel verdict
    events.jsonl               # telemetry, append-only
    scorecard.json             # written by judge flow, read by scorer
    lessons.md                 # written by learn flow
```

Run id format: `YYYYMMDD-HHMM-<slug>`, slug from the first 4 words of the
instruction.

## events.jsonl

Append one line after every agent returns:

```json
{"t":"2026-10-31T12:04:11Z","step":"red","phase":"P2","round":1,"agent":"mb-red","model":"sonnet","tokens":18342,"duration_s":41,"result":{"critical":0,"high":2,"medium":3,"low":1}}
```

`tokens` comes from the agent result's usage line when the host reports it.
When it does not, write `null`. Never invent numbers.

## scorecard.json

Written at the end of `flows/judge.md`:

```json
{
  "run_id": "20261031-1200-add-user-invites",
  "playbook_version": "seed+3",
  "phases": 3,
  "acceptance": {"total": 14, "passed": 13},
  "findings": {"critical": 0, "high": 4, "medium": 6, "low": 3},
  "findings_open": {"critical": 0, "high": 0, "medium": 4, "low": 3},
  "review_rounds": 5,
  "phases_clean_first_round": 1,
  "judge_verdict": "pass",
  "tokens_total": 412000,
  "lines_added": 640,
  "lines_removed": 38,
  "files_touched": 11
}
```
