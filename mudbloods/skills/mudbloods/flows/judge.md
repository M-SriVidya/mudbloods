# Flow: judge (final panel)

Decide whether the build delivers the approved architecture end to end and
matches what the user asked for.

## Panel

Spawn 3 `mb-judge` agents in parallel. Each gets `instruction.md`,
`architecture.md`, `signoff.md`, `plan.md`, `carry.md`, the full diff since
the base commit, and the resolved `judge` playbook. Stances:

1. **Architecture fidelity:** every component in the Components table exists
   at its path with its responsibility. Every contract matches exactly.
2. **Acceptance:** for each acceptance criterion, run or write a check and
   report pass/fail with evidence (command plus output line, or test name).
3. **User intent:** re-read `instruction.md` and the sign-off answers. Does
   the result do what the person wanted, including things implied but not
   written? Is anything built that nobody asked for?

## Verdict

- `pass`: all 3 judges pass, all acceptance criteria pass, no open
  `critical`/`high` anywhere.
- `fail`: anything else. Write a fix list to `judge.md`, each item with
  severity and the acceptance criterion or component it fails. Return it to
  `flows/build.md` as repair phase input.

Majority vote does not override evidence: one judge with a reproducible
failing check fails the build.

## Scorecard

After the verdict, write `scorecard.json` (format in `reference/state.md`)
and append it as one line to `.mudbloods/scores.jsonl`. Then run
`node <SKILL_DIR>/bench/score.mjs .mudbloods/runs/<run-id>/scorecard.json`
to compute the score; record it in the scorecard as `"score"`. If Node is not
available, compute it with the formula in `flows/bench.md` and say so.

When run as the atomic verb, print the verdict, acceptance count, and the
fix list if any.
