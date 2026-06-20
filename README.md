# HeyCode 🚀

HeyCode is an interactive, AI-powered coding assistant designed to help developers build and edit codebases directly from their command line. Running entirely within your terminal, HeyCode pairs a premium Terminal User Interface (TUI) with a robust backend agent that can analyze context (PLAN mode) and apply file edits or execute terminal command workflows (BUILD mode) using Google Gemini models.

> [!NOTE]
> **Local-First Architecture:** HeyCode is now fully self-contained. No database server, no cloud authentication, and no external services are required. Everything runs locally on your machine.

<img width="1634" height="874" alt="image" src="https://github.com/user-attachments/assets/0a630efd-a936-494a-812b-a623422db0f4" />

---

<img width="1878" height="947" alt="image" src="https://github.com/user-attachments/assets/1c158e0b-fc70-4d8a-9266-75c525b9ed31" />

---

## 🏗️ Architecture & Monorepo Structure

HeyCode is organized as a monorepo containing the following packages:

*   **`packages/cli`**: The interactive Terminal User Interface (TUI) powered by React and `@opentui/core` / `@opentui/react`. It features streaming AI responses, past session browsing, configurable color themes, and quick-access command menus. On startup, it automatically boots an embedded Hono server on a random free port — no separate server process is needed.
*   **`packages/server`**: A Bun-powered Hono web server that processes and routes chat streams, integrates the Vercel AI SDK, executes local file tools, and stores sessions using Drizzle ORM.
*   **`packages/database`**: Drizzle ORM schema and migrations targeting a local SQLite database stored at `~/.heycode/heycode.db`. No external database is required.
*   **`packages/shared`**: Shared configurations, TypeScript interfaces, Zod validation schemas, and tool definitions used across the CLI and server.

---

## ✨ Features

- **Zero-Config Install:** A single `npm install -g heycode-cli` is all you need. No database server, no cloud account setup. Just add the API keys and use it.
- **Local-First Storage:** All session history is stored in a local SQLite file at `~/.heycode/heycode.db`, giving you complete ownership and privacy.
- **Multi-Instance Support:** Run multiple `heycode` instances simultaneously in different terminals. Each boots on a distinct random port and safely shares the same local SQLite database via WAL mode.
- **Interactive Terminal UI (TUI):** A rich, responsive UI built with React inside the terminal, enabling side-by-side chat streaming, session loading, status spinners, and command menus.
- **Dual Agent Modes:**
  - **`PLAN` Mode:** A safe, read-only analysis mode allowing the AI to query repository information using `readFile`, `listDirectory`, `glob`, `grep`, and `webSearch`.
  - **`BUILD` Mode:** An action-oriented execution mode where the AI can create and edit files (`writeFile`, `editFile`), run terminal tasks (`bash`), and perform web searches.
- **Inline Diff Previews:** Automatic, inline visual unified diff previews for all file creations (`writeFile`) and edits (`editFile`) rendered directly in the chat flow, color-coded for optimal readability.
- **Web Search Integration:** Powered by the official Exa SDK, allowing the agent to fetch highly relevant programming solutions, library APIs, and latest documentation snippets from the internet.
- **Multi-Provider AI Support:** Works with Google Gemini models (e.g. `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-2.5-flash-lite`) and Groq high-speed models (e.g. `openai/gpt-oss-120b`, `qwen/qwen3-32b`).

---

## ⚡ Getting Started (Global Install)

### Prerequisites

*   [Bun](https://bun.sh/) — required as the runtime
*   A Google Gemini API Key / Groq API Key
*   *(Optional)* An Exa API Key for web search capabilities

### Installation

```bash
npm install -g heycode-cli
```

### Configure API Keys

HeyCode reads its configuration from `~/.heycode/config.json`. The `~/.heycode` directory is created automatically on first launch. Just create the `config.json` file inside it:

```json
{
  "GOOGLE_GENERATIVE_AI_API_KEY": "AIzaSy...",
  "GROQ_API_KEY": "...",
  "EXA_API_KEY": "..."
}
```
> `EXA_API_KEY` is optional and only needed for web search capabilities.

### Run

```bash
heycode
```

That's it! On the first launch, HeyCode will automatically:
1. Create the `~/.heycode/` data directory.
2. Initialize and migrate the local SQLite database.
3. Start an embedded server on a random free port.
4. Open the TUI in your terminal.

---

## 🛠️ Developer Setup (Contributing)

### Prerequisites

*   [Bun](https://bun.sh/) (version 1.0 or higher)
*   Google Gemini API Key

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Rupak182/hey-code.git
    cd hey-code
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure API keys globally:**
    Create `~/.heycode/config.json` (the directory is auto-created on first launch):
    ```json
    {
      "GOOGLE_GENERATIVE_AI_API_KEY": "AIzaSy...",
      "GROQ_API_KEY": "...",
      "EXA_API_KEY": "..."
    }
    ```
    Alternatively, create a local `.env` file in the project root with the same keys.

4.  **Run in development mode:**
    ```bash
    bun run dev:cli
    ```
    The CLI will boot the embedded server automatically. No separate server terminal is needed.

### 📂 Configuring the Workspace Directory (CWD)

By default, the agent operates in the directory from which the CLI is launched. To target a different codebase:

1. **Via `~/.heycode/config.json`:**
   ```json
   {
     "HEYCODE_CWD": "/path/to/your/target-project"
   }
   ```
2. **Via `.env` file:**
   ```env
   HEYCODE_CWD=/path/to/your/target-project
   ```
3. **By running from the target directory:**
   ```bash
   cd /path/to/your/target-project
   heycode
   ```

### 🗄️ Inspect the Database

To visually browse your local SQLite database using Drizzle Studio:
```bash
bun db:studio
```

### Build & Publish

```bash
cd packages/cli
bun run build   # Compiles CLI and bundles SQL migrations into dist/
npm publish
```

---

## 🛠️ CLI Commands

Inside the HeyCode TUI, type `/` to open the command menu. Supported commands include:

| Command | Description |
| :--- | :--- |
| `/new` | Start a new AI coding session |
| `/agents` | Switch agent mode (PLAN / BUILD) |
| `/models` | Select between supported AI models (Gemini / Groq) |
| `/sessions`| Browse and restore past conversation sessions |
| `/theme` | Change the TUI color theme |
| `/exit` | Quit the TUI application |

---

This implementation is based on learning from [NightCode](https://github.com/code-with-antonio/nightcode).
