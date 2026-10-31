# Flow: architecture

Produce one clean, unambiguous architecture diagram and get explicit user
sign-off on it.

## 1. Map the repo (once per run)

Skip if `repo-map.md` exists and the repo HEAD has not moved since.

Spawn one `mb-architect` with: the instruction, and the task "write
repo-map.md only". Output limits: 150 lines max. Content: purpose of the repo,
entry points, module boundaries, data stores, external services, test setup,
error-handling and logging conventions with one `path:line` example each.
The coder and blue-team agents reuse this file, so conventions matter most.

## 2. Draft (parallel)

Spawn 2 `mb-architect` agents in parallel with: `instruction.md`,
`repo-map.md`, the resolved `architect` playbook, and one stance each:

- **A, minimal change:** fit the instruction into existing structure; new
  modules only when unavoidable.
- **B, clean design:** best long-term shape, still honouring repo conventions.

Each returns a draft in the format below. Save as `architecture.v1a.md` and
`architecture.v1b.md`.

## 3. Critique and merge

Spawn 2 `mb-arch-critic` agents in parallel, each given both drafts:

- **Critic 1, repo fit:** does every box map to a real or clearly new path?
  Does it contradict a convention in `repo-map.md`?
- **Critic 2, ambiguity:** any arrow with no data named? Any flow without an
  error path? Any term used two ways? Any requirement in the instruction with
  no box?

Then you (the orchestrator, thinking tier) merge: take the stronger draft as
base, apply every critique point that has evidence, and write
`architecture.md`. If critics found a `critical` gap, loop once more (one
architect revises, one critic re-checks). Never more than 2 critique loops.

## 4. Architecture format

```markdown
# Architecture: <title>

## Goal
<2-3 sentences: what changes for the user of this repo>

## Diagram
```mermaid
flowchart LR
  ...   (every node labelled with its real path or "NEW: path")
  ...   (every edge labelled with what moves along it)
```

## Components
| Component | Path | New / changed / reused | Responsibility |

## Data and contracts
<types, schemas, endpoints, events: exact names and shapes>

## Error and edge paths
<what happens on each failure the diagram can hit>

## Acceptance criteria
1. <observable, testable statement>
...

## Out of scope
- ...

## Open questions
| # | Question | Default answer | Why this default |
```

Rules for the diagram: 25 nodes max; split into a second diagram if larger.
No node without a path. No edge without a label. Same name for the same thing
everywhere.

## 5. Sign-off gate

Show the user the Diagram, Components table, Acceptance criteria and Open
questions from `architecture.md`. Then ask, in full sentences:

1. Does this architecture match what you want built?
2. For each open question, the default is shown. Change any, or accept all
   defaults.

Wait for the answer. Then:

- **Changes requested:** apply them (small edits yourself; structural ones
  via one `mb-architect` revision plus one critic pass), save the previous
  file as `architecture.v<N>.md`, show the changed parts only, and ask again.
  Log each revision as an event with `"step":"arch-revision"` and the user's
  reason, because revisions train the architect playbook.
- **Explicit yes** ("yes", "approved", "go", "looks good, proceed"): write
  `signoff.md` with the user's words, timestamp, the answers to every open
  question, and `git rev-parse HEAD` as base commit. Continue.
- **Anything ambiguous** ("hmm ok", "maybe"): do not treat it as sign-off.
  Ask directly whether to proceed.

With `--auto`: accept all defaults, write `signoff.md` with
`"auto": true`, and continue without asking.

When run as the atomic verb, stop after sign-off and print:
`architecture approved -> next: /mudbloods plan`.
