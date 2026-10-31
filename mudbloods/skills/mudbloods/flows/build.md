# Flow: build (end to end)

`/mudbloods build <instruction>` chains the atomic flows. Each step is the
same flow the atomic verb runs, so a run interrupted at any step resumes with
that step's verb.

## Steps

1. **Start the run.** Create `.mudbloods/runs/<run-id>/`, write
   `instruction.md`, point `.mudbloods/current` at it. If `.mudbloods/current`
   names an unfinished run, ask the user: resume it, or start fresh.
2. **Architecture.** Run `flows/architecture.md`. It ends only on explicit
   sign-off (or `--auto`). Do not continue without `signoff.md`.
3. **Plan.** Run `flows/plan.md`.
4. **Code, phase by phase.** For each phase in `plan.md`, in order, run
   `flows/code.md` for that phase. Do not start phase N+1 while phase N has
   an open `critical` or `high` finding.
5. **Judge.** Run `flows/judge.md`. If the verdict is `fail`, it returns a
   fix list. Feed that list to `flows/code.md` as a repair phase `PX`, then
   judge again. Maximum 2 repair cycles. After that, stop and report what is
   still unmet.
6. **Learn.** Unless `--no-learn`, run `flows/learn.md` (without `--promote`).
7. **Report** to the user, in this shape and nothing more:

```
mudbloods build: <verdict>
phases: <n>   review rounds: <n>   repair cycles: <n>
code: +<lines added> -<lines removed> across <files> files
findings: <c> critical, <h> high fixed | <m> medium, <l> low open (see carry.md)
acceptance: <passed>/<total>
score: <score> (prev <prev score or "none">)
learned: <k> new rules, <j> pruned -> playbook <version>
run: .mudbloods/runs/<run-id>/
```

Get line counts from `git diff --shortstat <base>` where `<base>` is the commit
recorded in `signoff.md`. If the repo is not a git repo, count lines in the
files listed in `plan.md` and say the counts are approximate.
