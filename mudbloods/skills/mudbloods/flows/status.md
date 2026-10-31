# Flow: status

Read-only. Print, from `.mudbloods/`:

```
run: <current run id> (<step reached: architecture | signed-off | planned | P2 round 3 | judged | learned>)
phases: P1 clean(1) P2 clean(3) P3 pending
open: 0 critical, 0 high, 4 medium, 2 low
playbook: seed+5 (repo 3 rules, user 2 rules)
scores: 61 -> 68 -> 74 (last 3 runs)
next: /mudbloods code P3
```

No `.mudbloods/`: print `no mudbloods state here -> /mudbloods build <instruction>`.
