# OpenClaw skills for Путеводитель

This folder is loaded by OpenClaw when the **workspace** is set to this project root (`<workspace>/skills`). No extra setup needed when you run OpenClaw from this repo.

## Shared use (all agents on this machine)

To use the Путеводитель skill for any workspace, copy it to OpenClaw’s managed skills:

```powershell
# Windows (PowerShell)
$dest = "$env:USERPROFILE\.openclaw\skills\putevoditel"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path "skills\putevoditel\*" -Destination $dest -Recurse -Force
```

Then the skill will be available from `~/.openclaw/skills` (shared) as well as from this repo’s `skills/` (workspace) when the workspace is this project.

## Skill: putevoditel

- **Triggers:** "чек", "синк", "индексы", "вебп", "деплой-чек", "active_context", "ROADMAP".
- **Details:** See `skills/putevoditel/SKILL.md`.
- **Full context:** See [docs/OPENCLAW_CONTEXT.md](../docs/OPENCLAW_CONTEXT.md) and [docs/OPENCLAW_ONBOARDING.md](../docs/OPENCLAW_ONBOARDING.md).
