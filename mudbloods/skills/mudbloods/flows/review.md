# Flow: review (standalone)

`/mudbloods review [target]` runs the red/blue loop on code mudbloods did not
write. Target forms:

| Target | How to get the diff |
|---|---|
| none | `git diff HEAD` plus staged changes; if empty, `git diff <default-branch>...HEAD` |
| `123` or `#123` | `gh pr diff 123` and `gh pr view 123` for intent |
| branch name | `git diff <default-branch>...<branch>` |
| path | the file or directory as it stands |

## Steps

1. If no current run exists, create a lightweight one with run id
   `<date>-review-<target>`. Write a short `repo-map.md` if missing (one
   `mb-architect`, conventions section only).
2. Run the red step from `flows/code.md` section 2 on the diff, with the PR
   description (if any) standing in for acceptance criteria.
3. Show findings grouped by severity, one line each:
   `path:line [high/error-handling] <problem>. <fix hint>.`
4. Ask whether to fix. Default: report only. On `fix` (or `--fix` flag),
   run the blue loop from `flows/code.md` until no `critical`/`high` remain.
5. On a PR target with `--comment`, post each `critical`/`high` finding as an
   inline review comment with `gh`. Confirm with the user before posting:
   it is visible to others.
6. Log events and findings as usual: standalone reviews train the
   red-team playbook too.
