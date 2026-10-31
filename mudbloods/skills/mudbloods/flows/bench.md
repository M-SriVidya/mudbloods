# Flow: bench (fixed tasks, fixed scorer)

Proves improvement with a number: run 1 versus a later run on the same tasks,
with only the playbooks changed in between.

## Run it

```
node <SKILL_DIR>/bench/run.mjs            # all tasks
node <SKILL_DIR>/bench/run.mjs 02-lru-cache
```

`run.mjs` copies each task in `bench/tasks/` into a fresh temp workspace,
runs `claude -p "/mudbloods build --auto <task instruction>"` there, then runs
the task's hidden acceptance tests (`accept.test.mjs`, kept outside the
workspace until scoring so agents cannot read them). It writes one line per
task to `bench/results.jsonl` and prints the suite score.

From inside a session, `/mudbloods bench` runs the same script with Bash
(timeout 600000 ms per task, in the background) and reports the table when
it finishes.

## Score formula (0-100, per task)

```
score = 50 * hidden_tests_passed / hidden_tests_total
      + 20 * (judge_verdict == "pass")
      + 15 * max(0, 1 - (high_found + 2*critical_found) / 10)
      + 10 * phases_clean_first_round / phases
      +  5 * min(1, 400000 / tokens_total)     (term is 0 when tokens_total is null)
```

Suite score is the mean over tasks. `bench/score.mjs` implements this; the
formula above is the contract.

## Improvement loop for the demo

1. `node <SKILL_DIR>/bench/run.mjs` → run 1 score, playbook `seed`.
2. `/mudbloods learn` on each run, then `/mudbloods learn --promote`.
3. `node <SKILL_DIR>/bench/run.mjs` again → run 2 score, playbook `seed+N`.
4. `node <SKILL_DIR>/bench/score.mjs --compare` prints both runs side by side with the
   playbook diff summary.
