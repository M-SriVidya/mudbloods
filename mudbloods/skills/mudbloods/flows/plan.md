# Flow: plan

Split the approved architecture into phases a Haiku coder can execute
without making design decisions.

## Preconditions

`architecture.md` and `signoff.md` exist in the current run. If not, stop and
say: `no approved architecture -> run /mudbloods architecture first`.

## Steps

1. Spawn one `mb-planner` with `architecture.md`, `signoff.md`,
   `repo-map.md`, and the resolved `planner` playbook.
2. Planner sizes the work:
   - 1 phase: under ~150 changed lines, one module.
   - 2-3 phases: one feature across 2-4 modules.
   - 4-6 phases: anything larger. Never more than 6; respect `--phases N`.
   Phases are ordered so each one leaves the repo building and tests passing.
   Typical order: contracts and types, core logic, integration and wiring,
   UI or CLI surface, hardening and tests.
3. Each phase in `plan.md` has:

```markdown
## P2: <name>
Goal: <one sentence>
Depends on: P1
Acceptance criteria covered: 3, 4, 7
Tasks:
- T2.1 [files: src/a.ts, src/a.test.ts] <exact instruction: what function, what signature, what behaviour, which existing pattern to copy (path:line)>
- T2.2 [files: src/b.ts] ...
Verify: <exact commands: build, test, lint>
Done when: <observable check>
```

4. Check the plan yourself before saving:
   - Every acceptance criterion is covered by at least one phase.
   - No task needs a design choice (if it says "decide" or "choose", rewrite it).
   - No two tasks in one phase write the same file, unless assigned to one coder.
   - Every task names the existing pattern to copy when one exists.
5. Save `plan.md`. Log the event.

When run as the atomic verb, print the phase list (one line each) and:
`plan ready -> next: /mudbloods code`.
