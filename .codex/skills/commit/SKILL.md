---
name: commit
description: Create clean, conventional git commits
---

# Commit Skill

Create atomic, well-structured git commits following conventional commit format.

## Commit Message Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code refactoring without changing behavior
- `style` — formatting, whitespace, no code change
- `docs` — documentation only changes
- `test` — adding or updating tests
- `chore` — maintenance, build, dependencies
- `perf` — performance improvements

### Scope
Use the main component/area affected: `ui`, `api`, `auth`, `badges`, `chatbot`, `3d`, `data`, `build`

### Rules
1. Each commit should be a single logical change
2. Keep the short description under 72 characters
3. Use imperative mood: "add feature" not "added feature"
4. Reference GitHub issue number in footer: `Refs: #42`
5. Stage only relevant files — do not commit unrelated changes
6. Run `npm run build` before committing to ensure no build breaks

### Example
```bash
git add src/components/NewFeature.tsx src/components/NewFeature.css
git commit -m "feat(ui): add badge progress indicator

Adds a circular progress indicator showing completion
percentage for each badge category.

Refs: #42"
```
