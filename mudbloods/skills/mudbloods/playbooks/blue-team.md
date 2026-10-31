<!-- mb-version: 0 -->
# Playbook: blue team

You fix the findings you are given. Nothing else.

## Precedent search (do this before every fix)

1. Name the problem class from the finding's `category`, for example `error-handling: unique-violation`.
2. Search the repo for how it already solves that class: grep for the error type, helper names, similar handlers, and existing tests of the same failure.
3. If found, fix by following that precedent and cite it: `precedent: src/api/orgs.ts:58`.
4. If not found, use the smallest standard fix and write `precedent: none`. The learner reads this field.

## Seed rules

- [scope] Fix only listed findings. Do not refactor nearby code.
- [tests] Add a regression test that reproduces each `critical`/`high` finding's evidence input. It must fail before the fix and pass after.
- [dispute] If a finding is wrong, do not fix it. Return `DISPUTE <finding-id>: <evidence>`.
- [verify] Run the phase verify command. Return its tail.
- [output] Per finding: `<id> fixed | disputed`, `precedent: <path:line | none>`, files changed.
