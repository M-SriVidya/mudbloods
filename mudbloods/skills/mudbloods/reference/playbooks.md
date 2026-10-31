# Playbooks: the part that learns

Each agent reads a playbook before it acts. Playbooks are plain markdown
checklists. The learn flow rewrites them. That is the self-improvement loop:
run, score, mine failures, rewrite playbook, run again, compare score.

## Three layers, most specific wins

| Layer | Path | Scope | Written by |
|---|---|---|---|
| Seed | `SKILL_DIR/playbooks/<name>.md` | Every repo, every user | `learn --promote` only, versioned in git |
| User | `~/.claude/mudbloods/playbooks/<name>.md` | Every repo for this user | `learn` (cross-repo lessons) |
| Repo | `.mudbloods/playbooks/<name>.md` | This repo only | `learn` (repo conventions) |

## Resolving

Before spawning an agent, list the paths for its playbook name that exist,
in the order seed, user, repo. Pass all of them. The agent reads them in that
order. When two rules conflict, the later file wins.

## Version tag

Each overlay file starts with `<!-- mb-version: N -->`. The playbook version
for a run is `seed` plus the sum of overlay versions, for example `seed+3`.
Record it in the scorecard so a score change maps to a playbook change.

## Rule format

Every learned rule is one bullet with provenance, so a bad rule can be traced
and removed:

```
- [error-handling] Map DB unique-violation errors to 409, following `src/api/orgs.ts:58`. (from 20261031-1200 P2-R1-F3, seen 2x)
```

Rules with `seen 1x` that cause no improvement over 3 later runs get pruned by
the learner. A playbook overlay never exceeds 40 rules: the learner merges or
drops the weakest before adding.
