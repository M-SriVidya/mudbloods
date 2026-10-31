# Flow: bench (fixed tasks, deterministic score, gated learning)

The bench lives in the mudbloods source repo at `bench/`, outside the plugin
folder, so agents being scored cannot read the hidden tests.

When the user runs `/mudbloods bench`:

1. Find the mudbloods source repo: the current repo if it has
   `bench/evolve.mjs`, else ask the user for the path to a clone of
   https://github.com/M-SriVidya/mudbloods.
2. Tell the user what the full run costs: 8 tasks at v0, then 4 train tasks
   per learning iteration, then 4 held-out tasks. Each task is a full
   mudbloods build. Ask for a yes before starting.
3. Run `node bench/evolve.mjs --iterations 2` from that repo with Bash, in
   the background, and report the printed table when it finishes.

Other commands the user can run directly:

| Command | Does |
|---|---|
| `node bench/verify-tests.mjs` | Hidden tests vs reference solutions: must be 80/80 |
| `node bench/run.mjs --split train` | Score the train tasks once with current playbooks |
| `node bench/evolve.mjs` | v0, learn, gate, commit or roll back, held-out check |
| `node bench/score.mjs --compare` | Table of every version |
| `node bench/report.mjs` | `bench/REPORT.md` and `bench/chart.svg` |

## Score (0-100 per task, no LLM judgement)

```
score = 70 * hidden tests passed / total
      + 15 * max(0, 1 - (high + 2 * critical) / 10)
      + 15 * min(1, 2.00 / cost_usd)
```

Cost comes from Claude Code's own usage report (`total_cost_usd`), across
every model and subagent in the run.
