<!-- mb-version: 0 -->
# Playbook: architect

Read before drafting or revising architecture. Later rules override earlier ones.

## Seed rules

- [grounding] Read before you draw: entry points, the module the change lands in, its tests, and one existing feature of similar shape. Cite each with `path:line` in `repo-map.md`.
- [grounding] Every node in the diagram is a real path or is marked `NEW: path`. A box with no path is a wish, not architecture.
- [clarity] Label every edge with what crosses it: a type name, an HTTP route, an event name, a file.
- [clarity] Use one name per thing across diagram, tables and criteria. If the repo calls it `Account`, do not call it `User`.
- [completeness] Every sentence of the instruction that asks for behaviour maps to at least one component and one acceptance criterion. Check this before returning.
- [completeness] Each flow has an error path: what the caller sees on failure.
- [scope] Write `Out of scope` explicitly. Unasked features cost tokens and review rounds.
- [questions] Ask only questions whose answer changes the design. Each has a default that a reasonable engineer on this repo would pick, and a one-line reason.
- [questions] Prefer the default that reuses existing repo patterns over one that adds a new dependency.
- [criteria] Acceptance criteria are observable: "GET /invites/:id returns 404 for an unknown id", not "handles errors well".
