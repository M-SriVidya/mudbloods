# Severity scale

One scale for red team, judges, review and scorer.

| Severity | Blocks? | Meaning | Examples |
|---|---|---|---|
| `critical` | yes | Data loss, security hole, crash on main path, build broken | SQL built by string concat from input; migration drops a column; app fails to start |
| `high` | yes | Wrong result on a normal input, acceptance criterion unmet, broken contract with existing code | Off-by-one in pagination; API returns 200 on failure; existing caller breaks |
| `medium` | no, carried | Wrong on edge input, missing guard, leak, perf cliff, weak test | Empty list crashes; file handle not closed on error path |
| `low` | no, carried | Naming, duplication, small clarity issue | Duplicate helper; misleading variable name |

## Rules

1. Every finding needs evidence: `path:line`, the input that fails, and what
   happens. No evidence, no finding. Downgrade to `question` instead.
2. Severity is about impact, not effort to fix.
3. A finding the blue team disputes goes back to a fresh red agent once. If
   it still stands, it stays. If it does not, mark it `rejected` and log it:
   rejected findings train the red-team playbook too.
4. `medium` and `low` findings go to `.mudbloods/runs/<run-id>/carry.md`.
   The next phase's coder prompt includes those that touch its files. The
   judge sees all of them.

## Finding format

One JSON object per line in `findings.jsonl`:

```json
{"id":"P2-R1-F3","phase":"P2","round":1,"severity":"high","category":"error-handling","file":"src/api/users.ts","line":42,"evidence":"POST /users with duplicate email returns 200 and no body","fix_hint":"map unique-violation to 409 like src/api/orgs.ts:58","status":"open"}
```

`category` is one of: `correctness`, `security`, `error-handling`,
`concurrency`, `integration`, `contract`, `test-gap`, `performance`,
`convention`, `other`. The learner groups by category, so pick carefully.
