<!-- mb-version: 0 -->
# Playbook: planner

## Seed rules

- [haiku-fit] Each task must be executable without a design decision. Name the function, signature, file, behaviour, and the existing code to copy (`path:line`).
- [haiku-fit] One task changes at most 3 files and about 120 lines. Split larger tasks.
- [ordering] Each phase leaves the repo building and its tests passing. Contracts and types come first; wiring and surface come later.
- [ordering] Put tests in the same task as the code they test, not in a later phase.
- [ownership] No two parallel coders write the same file in one phase.
- [verify] Every phase has exact verify commands copied from the repo (package.json scripts, Makefile, CI config). Do not invent commands.
- [coverage] Map every acceptance criterion to a phase. An unmapped criterion is a planning error, not a footnote.
- [carry] Medium and low findings carried from earlier phases that touch a task's files are listed under that task.
