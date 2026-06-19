# HeyCode 🚀

HeyCode is an interactive, AI-powered coding assistant designed to help developers build and edit codebases directly from their command line. Running entirely within your terminal, HeyCode pairs a premium Terminal User Interface (TUI) with a robust backend agent that can analyze context (PLAN mode) and apply file edits or execute terminal command workflows (BUILD mode) using Google Gemini models.


<img width="1634" height="874" alt="image" src="https://github.com/user-attachments/assets/0a630efd-a936-494a-812b-a623422db0f4" />

---

<img width="1878" height="947" alt="image" src="https://github.com/user-attachments/assets/1c158e0b-fc70-4d8a-9266-75c525b9ed31" />

---

## 🏗️ Architecture & Monorepo Structure

HeyCode is organized as a monorepo containing the following packages:

*   **`packages/cli`**: The interactive Terminal User Interface (TUI) powered by React and `@opentui/core` / `@opentui/react`. It features streaming AI responses, past session browsing, configurable color themes, and quick-access command menus.
*   **`packages/server`**: A Bun-powered Hono web server that processes and routes chat streams, integrates the Vercel AI SDK, executes local file tools, and stores sessions using Prisma.
*   **`packages/database`**: Prisma-based database models (Neon serverless / PostgreSQL) that store session history and message states.
*   **`packages/shared`**: Shared configurations, TypeScript interfaces, Zod validation schemas, and tool definitions used across the CLI and server.

---

## ✨ Features

- **Interactive Terminal UI (TUI):** A rich, responsive UI built with React inside the terminal, enabling side-by-side chat streaming, session loading, status spinners, and command menus.
- **Dual Agent Modes:**
  - **`PLAN` Mode:** A safe, read-only analysis mode allowing the AI to query repository information using `readFile`, `listDirectory`, `glob`, `grep`, and `webSearch`.
  - **`BUILD` Mode:** An action-oriented execution mode where the AI can create and edit files (`writeFile`, `editFile`), run terminal tasks (`bash`), and perform web searches.
- **Web Search Integration:** Powered by the official Exa SDK, allowing the agent to fetch highly relevant programming solutions, library APIs, and latest documentation snippets from the internet with optimized token usage (via semantic highlights) and cache-priority execution.
- **Google Gemini Integration:** Designed to work with Google Gemini reasoning/thinking models (e.g. `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-2.5-flash-lite`).

---

## ⚡ Getting Started

### Prerequisites

Before starting, ensure you have:
*   [Bun](https://bun.sh/) (version 1.0 or higher)
*   A PostgreSQL database (such as a free [Neon](https://neon.tech/) database)
*   Google Gemini API Key

### Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Rupak182/hey-code.git
    cd hey-code
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure environment variables:**
    Copy the template and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    Ensure the following keys in `.env` are configured:
    - `API_URL` (defaults to `http://localhost:3000`)
    - `DATABASE_URL` (NeonDB PostgreSQL Connection String)
    - `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini API Key)
    - `EXA_API_KEY` (Exa AI search API key for web search capabilities)

4.  **Generate Database Client:**
    Initialize the database ORM client:
    ```bash
    bun run --cwd packages/database db:generate
    ```

---

## 🚀 Running the Application

To run HeyCode, you need to launch both the server backend and the CLI application.

### 1. Start the Server Backend
```bash
bun run dev:server
```
*The server will start listening on port `3000`.*

### 2. Start the CLI (in a separate terminal)
```bash
bun run dev:cli
```
*This will open the interactive TUI interface in your terminal.*

---

## 🛠️ CLI Commands

Inside the HeyCode TUI, type `/` to open the command menu. Supported commands include:

| Command | Description |
| :--- | :--- |
| `/new` | Start a new AI coding session |
| `/agents` | Switch agent mode (PLAN / BUILD) |
| `/models` | Select between supported Gemini models |
| `/sessions`| Browse and restore past conversation sessions |
| `/theme` | Change the TUI color theme |
| `/exit` | Quit the TUI application |

---

This implementation is based on learning from [NightCode](https://github.com/code-with-antonio/nightcode).
