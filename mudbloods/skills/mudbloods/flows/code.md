# Flow: code (one phase plus its review loop)

`/mudbloods code [phase-id]`. No id: take the first phase in `plan.md` that
has no `rounds.md` ending in `clean`.

## 1. Build

1. Write `phases/<id>/tasks.md`: group tasks by file ownership, one group per
   coder, max 4 groups.
2. Spawn one `mb-coder` (haiku) per group, in parallel. Each prompt contains
   only:
   - its tasks, verbatim from `plan.md`
   - the relevant sections of `architecture.md` (contracts, not the whole file)
   - `repo-map.md` conventions section
   - entries from `carry.md` that touch its files
   - the resolved `coder` playbook paths
3. Coders do not talk to each other. If a coder reports a blocker that needs
   a design decision, you (thinking tier) decide, record the decision in
   `architecture.md` under a `## Decisions during build` heading, and resend.
4. Run the phase's `Verify` commands yourself. Failing build or tests become
   `critical` findings with category `correctness`, round 0, and go straight
   to the blue team.

## 2. Review loop (red team / blue team)

Repeat until a round has zero open `critical` and `high` findings:

1. **Red.** Spawn 2 `mb-red` in parallel on the phase diff
   (`git diff <phase-start-commit>` or the changed files list). Stances:
   correctness and security; integration and edge cases. Give each the
   phase's tasks, acceptance criteria covered, `repo-map.md`, and the
   resolved `red-team` playbook. Each returns findings in the format in
   `reference/severity.md`.
2. **Dedupe.** Merge by `file` plus `line` plus same root cause. Keep the
   higher severity. Append to `findings.jsonl` with round number.
3. **Gate.** No open `critical`/`high`: the phase is clean. Go to step 6.
4. **Blue.** Spawn one `mb-blue` (haiku) per file group that has
   `critical`/`high` findings. Give it those findings, `repo-map.md`
   conventions, and the resolved `blue-team` playbook. The blue team must,
   before fixing, search the repo for how the same problem is already
   handled (see blue-team playbook: precedent search) and cite it.
5. **Verify** with the phase commands, then go to step 1 with a fresh red
   pair, scoped to the files the blue team changed plus their callers.
6. **Close the phase.** Move open `medium`/`low` findings to `carry.md`.
   Write the final line of `rounds.md`: `clean after <n> rounds`.

## Limits

- Max 4 rounds per phase. After round 4 with blockers still open: stop, show
  the user the open blockers, and ask whether to continue fixing, accept
  them as known issues, or revise the architecture.
- If the same finding (same file, same category) reopens twice, escalate it:
  the next fix attempt runs `mb-blue` with model `sonnet` instead of `haiku`,
  and log `"escalated": true`. The learner uses these escalations.

## Status lines

One per round:
`P2 round 1: 0 critical, 2 high, 3 medium, 1 low -> blue fixing 2`
`P2 round 2: 0 critical, 0 high, 1 medium -> clean`
