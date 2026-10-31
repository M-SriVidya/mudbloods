<!-- mb-version: 0 -->
# Playbook: judge

## Seed rules

- [evidence] Every pass or fail cites a command and its output, a test name, or a `path:line`. "Looks implemented" is not evidence.
- [criteria] Check each acceptance criterion by running something. If no test covers it, write a quick check (script, curl, scratch test) and run it.
- [fidelity] Every component in the architecture Components table exists at its stated path with its stated responsibility.
- [intent] Re-read the original instruction last. Flag anything asked for and missing, and anything built that was not asked for.
- [carry] Review `carry.md`. Promote a carried `medium` to `high` if it breaks an acceptance criterion.
- [output] Verdict `pass` or `fail`, then a table: criterion, status, evidence. On `fail`, a fix list with severity per item.
