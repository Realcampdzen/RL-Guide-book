# Путеводитель "Реальный Лагерь" - Цифровая Экосистема

This `GEMINI.md` file serves as the primary entry point for AI agents. 

## 🧠 AI Context Management (Memory Bank)

**IMPORTANT:** This project uses a **Memory Bank** system to ensure context hygiene and development precision. 

- **Entry Point:** [agent.md](agent.md)
- **Core Context:** [.memory-bank/](.memory-bank/)
- **Sync Board:** [agent-sync.md](agent-sync.md) (Use for inter-agent communication, handoffs, and short notes)
- **Rules:** [.cursor/rules/cursor_rules.mdc](.cursor/rules/cursor_rules.mdc)

Before starting any task, agents MUST read `agent.md` and the contents of `.memory-bank/` to understand the current state, logic, and roadmap.

---

## 🌍 Project Overview

**Name:** rl-guide-book (Путеводитель "Реальный Лагерь")
**Description:** A comprehensive digital ecosystem for the "Real Camp" (Реальный Лагерь) badge system. It features an interactive 3D web application, a comprehensive knowledge base of 119 badges, and an AI assistant named "NeuroValyusha" (НейроВалюша).

### Key Components
1.  **Frontend:** React (TypeScript) application with Three.js for 3D visualization.
2.  **AI Assistant:** "NeuroValyusha" (НейроВалюша) - a chatbot powered by OpenAI GPT models.
3.  **Backend:**
    *   **Python:** Flask/FastAPI based server for data and chatbot logic.
    *   **Node.js:** API endpoints (likely for serverless deployment like Vercel).
4.  **Data:** JSON-based structured knowledge base located in `ai-data/`.

## 🛠 Tech Stack

*   **Frontend:** React 18, TypeScript 5, Three.js, Vite 4.
*   **Backend:** Python 3.8+ (Flask, FastAPI), Node.js.
*   **AI:** OpenAI API (GPT-4o mini), Google Generative AI (listed in package.json).
*   **Styling:** CSS Modules, potentially Tailwind (check if present, otherwise standard CSS).
*   **Package Manager:** npm, pip.

## 📂 Directory Structure

*   `src/`: Main React source code.
    *   `components/`: Reusable UI components.
    *   `scenes/`: Three.js scenes.
    *   `App.tsx`: Main application component.
*   `api/`: Node.js API functions (Vercel-compatible).
*   `backend/`: Python Flask API server.
*   `chatbot/`: Python chatbot implementation ("NeuroValyusha").
*   `ai-data/`: JSON knowledge base for badges and categories.
*   `public/`: Static assets (images, models).
*   `scripts/`: Utility scripts (image verification, data normalization).

## 🚀 Development Workflow

### Prerequisites
*   Node.js 18+
*   Python 3.8+
*   OpenAI API Key (in `.env`)

### Setup
1.  Install Frontend dependencies: `npm install`
2.  Install Backend dependencies: `pip install -r requirements.txt`
3.  Install Chatbot dependencies: `cd chatbot && pip install -r requirements.txt`
4.  Configure `.env` (see `.env.example`).

### Running Services
*   **All-in-one (Windows):** `start_all_services.bat`
*   **Frontend:** `npm run dev` (http://localhost:3001)
*   **Backend API (Python):** `python backend/app.py` (http://localhost:4000)
*   **Chatbot:** `cd chatbot && python main.py` (http://localhost:8000)
*   **Node API:** `npm run start:api`

### Building
*   **Production Build:** `npm run build`
*   **Preview:** `npm run preview`

## 📝 Conventions & specific configurations

*   **Vite Configuration:** The `vite.config.ts` includes custom plugins for:
    *   Copying API files to `dist`.
    *   Serving files from `public/RL-Guide-book/` in dev mode.
    *   Handling URL encoding for Cyrillic filenames (specifically for badges).
*   **Data Integrity:** The project relies heavily on the integrity of JSON data in `ai-data/`. Several scripts (`check_badge_data.py`, `validate_ai_data.py`) exist to maintain this.
*   **Language:** Documentation is mixed (Russian/English). Code comments and commit messages should ideally follow existing patterns (likely English for code, Russian for content/data).

## 🔍 Common Tasks

*   **Linting:** `npm run lint`
*   **Self-Check:** `npm run self-check`
*   **Image Processing:** `npm run images:webp` (Generate WebP), `npm run verify-images`.

## ⚠️ Important Notes

*   **Cyrillic Paths:** Be careful with file paths containing Cyrillic characters (e.g., in `public/`). The Vite config has specific logic to handle this.
*   **Environment Variables:** Ensure `OPENAI_API_KEY` is set for the chatbot to function.
