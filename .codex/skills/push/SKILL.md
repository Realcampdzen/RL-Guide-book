---
name: push
description: Push changes to remote and create/update pull requests
---

# Push Skill

Push local changes to the remote repository and manage pull requests.

## Branch Strategy

1. Create a feature branch from `main`:
   ```bash
   git checkout -b <issue-identifier>-<short-description> origin/main
   ```
   Example: `git checkout -b 42-add-badge-progress origin/main`

2. Push to remote:
   ```bash
   git push -u origin <branch-name>
   ```

## Creating a Pull Request

After pushing, create a PR using the GitHub CLI:

```bash
gh pr create \
  --title "<type>(<scope>): <description>" \
  --body "## Summary

<describe what this PR does>

## Changes
- <list of changes>

## Testing
- [ ] `npm run build` passes
- [ ] Manual testing completed

Closes #<issue-number>" \
  --label "symphony" \
  --base main
```

## PR Rules

1. Always add the `symphony` label to PRs created by Symphony
2. Link PR to the GitHub issue using `Closes #<number>` in body
3. Ensure CI passes before requesting review
4. Keep PRs focused — one issue per PR
5. Include validation steps in PR description

## Updating an Existing PR

If a PR already exists for the branch:
```bash
git push  # Updates the existing PR
```

Add a comment with what changed:
```bash
gh pr comment <pr-number> --body "Updated: <description of changes>"
```
