---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  team_key: PUT
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
    - Canceled
    - Cancelled
    - Duplicate
  agent_started_state: In Progress
  agent_done_state: In Review
  agent_failed_state: Todo

polling:
  interval_ms: 30000

workspace:
  root: ~/symphony-workspaces

hooks:
  after_create: |
    git clone --depth 1 https://github.com/Realcampdzen/RL-Guide-book.git .
    npm install
  before_run: |
    git fetch origin main
    git reset --hard origin/main
    npm install

agent:
  max_concurrent_agents: 2
  max_turns: 5

codex:
  # Режимы агента:
  #   "codex app-server" — Codex CLI / app-server
  #   "openai"           — прямой вызов OpenAI API
  command: openai
  approval_policy: never
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000
---

You are working on a Linear issue `{{ issue.identifier }}`

{% if attempt %}
Continuation context:

- This is retry attempt #{{ attempt }} because the issue is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed investigation or validation unless needed for new code changes.
{% endif %}

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

## Project Context

This is the **RL-Guide-book** (Путеводитель "Реальный Лагерь") project — a React/TypeScript/Three.js web app.

Before starting work:
1. Read `GEMINI.md` and `agent.md` in the project root for full project context.
2. Check `.memory-bank/active_context.md` for the current development state.
3. Review the existing code structure in `src/`.

## Tech Stack
- **Frontend:** React 18, TypeScript 5, Three.js, Vite 4
- **Backend:** Python (Flask), Node.js API endpoints
- **Styling:** CSS Modules
- **Data:** JSON knowledge base in `ai-data/`
- **Hosting:** GitHub Pages (frontend), Vercel (backend)

## Instructions

1. This is an unattended orchestration session. Never ask a human to perform follow-up actions.
2. Only stop early for a true blocker (missing required auth/permissions/secrets).
3. Work only in the provided repository copy. Do not touch any other path.
4. Create clean, conventional commits with descriptive messages.
5. Run `npm run build` to verify your changes compile before finishing.
6. Final message must report completed actions and blockers only.

