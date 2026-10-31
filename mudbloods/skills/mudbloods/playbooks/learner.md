<!-- mb-version: 0 -->
# Playbook: learner

## Seed rules

- [signal] Learn from fixed `critical`/`high` findings, escalations, rejected findings, judge failures, architecture revisions, and changed defaults. Ignore `low`.
- [rule-shape] A rule is one bullet: `[category] <imperative, testable instruction>. (from <run-id> <finding-id>, seen Nx)`.
- [rule-shape] Prefer rules that cite a repo precedent (`path:line`) over generic advice. Generic advice the model already follows is noise.
- [dedupe] Before adding, search all layers for a rule with the same category and intent. Increment its `seen` count instead of adding a duplicate.
- [layer] A rule that mentions a repo path goes to the repo layer. Otherwise it goes to the user layer. Never write the seed layer without `--promote` and user approval.
- [prune] Remove rules added 3+ runs ago that are still `seen 1x` with no score gain since. Cap each overlay at 40 rules.
- [safety] Never relax a `security` rule after a single rejection.
- [output] `lessons.md`: rules added, incremented and pruned, each with evidence ids, then the score trend from `scores.jsonl`.
