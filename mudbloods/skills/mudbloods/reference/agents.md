# Agent roster

Installed as a plugin, agent types are namespaced: `mudbloods:mb-coder`.
Installed with `install.mjs` into `~/.claude/agents/`, they are bare: `mb-coder`.
Try the namespaced name first, then the bare one, then the fallback.

Other hosts:

- **Generic subagents only** (TrueForge dynamic sub-agents, Codex, others):
  use the fallback column for every role. If the host cannot pick a model
  per subagent, keep the split as close as it allows: strongest model for
  thinking roles, cheapest capable model for coder and blue team.
- **No subagents at all:** play each role yourself, in sequence, with the
  same inputs and the same output format. Finish one role's output file
  before starting the next role, so roles do not leak into each other.

| Agent | Model | Role | Playbook | Fallback |
|---|---|---|---|---|
| `mb-architect` | opus | Reads repo plus instruction, drafts architecture diagram and open questions | `architect.md` | `general-purpose`, model `opus` |
| `mb-arch-critic` | sonnet | Attacks a draft diagram: gaps, ambiguity, wrong fit with repo | `architect.md` | `general-purpose`, model `sonnet` |
| `mb-planner` | opus | Splits approved architecture into phases with acceptance criteria | `planner.md` | `general-purpose`, model `opus` |
| `mb-coder` | haiku | Implements one phase task, nothing else | `coder.md` | `general-purpose`, model `haiku` |
| `mb-red` | sonnet | Red team: finds bugs in a diff, severity-tagged, with evidence | `red-team.md` | `general-purpose`, model `sonnet` |
| `mb-blue` | haiku | Blue team: fixes listed findings, matching repo precedent | `blue-team.md` | `general-purpose`, model `haiku` |
| `mb-judge` | opus | Final panel member: built result against architecture and criteria | `judge.md` | `general-purpose`, model `opus` |
| `mb-learner` | sonnet | Mines run events, proposes playbook rewrites | `learner.md` | `general-purpose`, model `sonnet` |

## Fan-out sizes

Defaults. Scale down for small tasks. Never scale up past these without the
user asking: each agent starts cold and re-reads context.

| Step | Count | Diversity rule |
|---|---|---|
| Architecture draft | 2 architects | One optimises for minimal change, one for clean long-term design |
| Architecture critique | 2 critics | One checks repo fit, one checks ambiguity and missing flows |
| Coders per phase | 1 per independent task, max 4 in parallel | Tasks touching the same file go to the same coder |
| Red team per round | 2 | One correctness and security, one integration and edge cases |
| Blue team per round | 1 per file group | Never two blue agents on one file |
| Final panel | 3 judges | Architecture fidelity, acceptance criteria, user intent |

## Fallback prompt prefix

When falling back to `general-purpose`, start the prompt with:

```
You are acting as <agent name>. Read <resolved playbook paths> first and follow
them exactly. Your role: <role column>. Return only the output format the
playbook defines.
```
