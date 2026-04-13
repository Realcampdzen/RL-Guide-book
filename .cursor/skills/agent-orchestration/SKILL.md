---
name: agent-orchestration
description: Reference framework for multi-agent coordination. Use when onboarding a new agent, orchestrating workflows with SWE, SRE, and Staff roles, or avoiding code conflicts.
---

# BigTech Agent Orchestration Framework (Фреймворк Мульти-Агентной Разработки)

Use this skill when initializing an agent in a complex repository to prevent context hallucinations, overlapping work, and production breaks. This introduces a role-based model (SWE, SRE, Tech Lead), a "Memory Bank", decentralized Claim Boards, and strict Git-Flow.

## When to Use

- When an agent first connects to a repository (read `agent.md` first).
- Before an agent starts writing code (must check `ROADMAP.md` and Claim Boards).
- When multiple agents are actively pushing to the codebase.
- Before doing architectural refactoring.

## Required Project Structure (The Framework)

To implement this framework in a new repository, ensure the following architecture exists:

```text
/ (Root)
├── agent.md                  # Точка входа. Указания, что читать перед стартом
├── agent-sync.md             # Живая доска онбординга и логгирования присутствия
├── docs/ROADMAP.md           # Глобальный To-Do и "Где мы сейчас"
├── .memory-bank/             # Мозг проекта (постоянный контекст)
│   ├── active_context.md     # Текущий фокус команды
│   ├── progress.md           # Что сделано и "Утвержденный UX"
│   └── tech_context.md       # Контракты API, стек, известные костыли
└── .cursor/agent orchestration/ # Администрирование
    ├── AGENT_ORCHESTRATION.md# Доски департаментов (Claim Boards)
    ├── AGENT_ROLES.md        # Матрица компетенций и ролей (L4 SWE, L5 Arch)
    ├── CODE_REVIEW_PROTOCOL.md # Инструкции по пулл-реквестам
    ├── reports/              # Отчеты о завершенных сессиях агентов
    └── pull_requests/        # Псевдо-PR от агентов для код-ревью
```

## Agent Pipeline (Памятка для Агента)

**СТРОГО соблюдайте следующий алгоритм работы:**

### Шаг 1: HR-Онбординг (Role Allocation)
1. Read `agent-sync.md` to see who is currently in the lab, and `docs/ROADMAP.md` to find bottlenecks.
2. Read `AGENT_ROLES.md` for role quotas.
3. **DO NOT WRITE CODE YET.** Propose a role to the user based on the bottlenecks: *"I see a bottleneck in backend testing. Should I act as L5 SRE or L4 SWE today?"*
4. After user approval, write your handle and grade to `agent-sync.md`.

### Шаг 2: Claiming the Task (The Claim Board)
1. Open `.cursor/agent orchestration/AGENT_ORCHESTRATION.md`.
2. Locate the department matching your role (e.g., Architecture, Product Dev, QA).
3. Ensure the task is not `In progress` by another agent.
4. Add yourself to the table: `[Agent Handle] | [Task Name] | In progress | [Date] | [Logical next step for the following agent]`.

### Шаг 3: Hybrid Git-Flow (Code Review Protocol)
- **Minor Fixes (<10 lines, text, CSS):** Commit directly to `main`.
- **Major Features / Architecture (>30 lines):**
  1. `git checkout -b feature/<task-name>`
  2. Write code, run local linter/tests (`npm run lint`).
  3. Create a Markdown PR file at `.cursor/pull_requests/PR_<TASK>.md` containing your logic and a `git diff`.
  4. Switch back to `main`: `git checkout main`.
  5. Ask the user to summon a Code Review Agent. **DO NOT MERGE YOUR OWN PR.**
- **Review Agent:** Reviews the PR branch for hardcoding, security leaks (JWTs), and monolith components (>300 lines). If clear, approve and merge to `main`.

### Шаг 4: Spec-Driven Development (SDD)
If your task involves building a new major feature/epic, you **MUST** first generate a machine-readable Specification (`SPEC_FEATURE.md` in `.cursor/specs/`) and get user approval. Do not write code without a spec.

### Шаг 5: Hand-off and Reporting
1. Change your task status in the Claim Board (`AGENT_ORCHESTRATION.md`) to `Done`.
2. Create a session report file in `.cursor/agent orchestration/reports/AGENT_[ROLE]_SESSION_REPORT_[TASK].md`. Include modified files and contracts.
3. Update `.memory-bank/progress.md` and `.memory-bank/active_context.md`.
4. Close your session.
