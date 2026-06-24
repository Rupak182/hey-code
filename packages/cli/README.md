# HeyCode 🚀

HeyCode is an interactive, AI-powered coding assistant designed to help developers build and edit codebases directly from their command line. Running entirely within your terminal, HeyCode pairs a premium Terminal User Interface (TUI) with a robust backend agent that can analyze context (PLAN mode) and apply file edits or execute terminal command workflows (BUILD mode) using Google Gemini models.

> [!NOTE]
> **Local-First Architecture:** HeyCode is self-contained. No cloud database server, no cloud authentication, and no external services (except your API keys) are required. Everything runs locally on your machine.

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
- **Git-Backed Version Control (Fork, Revert, & Undo):** Every message automatically creates a shadow Git checkpoint in your workspace. Easily revert files back to any previous prompt state, fork a new session branch, or type `/undo` to discard the last turn and revert your changes.
- **Inline Diff Previews:** Automatic, inline visual unified diff previews for all file creations (`writeFile`) and edits (`editFile`) rendered directly in the chat flow, color-coded for optimal readability.
- **Web Search Integration:** Powered by the official Exa SDK, allowing the agent to fetch highly relevant programming solutions, library APIs, and latest documentation snippets from the internet.
- **AGENTS.md Custom Instructions:** Place an `AGENTS.md` file in your workspace root to inject project-specific rules, style guides, or build commands directly into the AI's system prompt context.
- **Multi-Provider AI Support:** Works with Google Gemini models (e.g. `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-2.5-flash-lite`), Groq high-speed models (e.g. `openai/gpt-oss-120b`, `qwen/qwen3-32b`), OpenAI models (e.g. `gpt-5.5`, `gpt-5.4`), and Anthropic models (e.g. `claude-sonnet-4-6`, `claude-opus-4-8`).

---

## ⚡ Getting Started (Global Install)

### Prerequisites

*   [Bun](https://bun.sh/) — required as the runtime
*   A Google Gemini, Groq, OpenAI, or Anthropic API Key
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
  "OPENAI_API_KEY": "...",
  "ANTHROPIC_API_KEY": "...",
  "EXA_API_KEY": "..."
}
```
> [!NOTE]
> You only need to provide the API keys for the model providers you intend to use (e.g. only `GOOGLE_GENERATIVE_AI_API_KEY` if using Gemini models). `EXA_API_KEY` is optional and only needed if you want web search capabilities.

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
      "OPENAI_API_KEY": "...",
      "ANTHROPIC_API_KEY": "...",
      "EXA_API_KEY": "..."
    }
    ```
    Alternatively, create a local `.env` file in the project root with the same keys. Only the keys for the providers you wish to use are required.

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

### 🤖 Developer Instructions (`AGENTS.md`)

You can steer the agent's behavior by placing an `AGENTS.md` file in the root of your target project. 

When `AGENTS.md` is present in the CWD:
- Its contents are automatically loaded as custom project instructions and appended to the system prompt.
- An `AGENTS.md Specification` block is included to instruct the agent on scope, precedence, and rule hierarchy.
- If no `AGENTS.md` file is found, it is completely skipped to save prompt tokens.

> [!NOTE]
> **Git Checkpoint Isolation:** Each workspace directory gets its own hidden shadow Git repository located at `${HEYCODE_CWD}/.heycode/git`. Git checkpoints and branches are completely isolated to each individual directory. If you change your workspace directory, the session history in the database persists, but you can only perform revert/fork operations on sessions that match your currently active directory.

### 🔌 Model Context Protocol (MCP) Support

HeyCode supports Model Context Protocol (MCP), enabling you to dynamically connect external tools (like filesystem servers, database interfaces, or APIs) directly to the AI agent.

#### 1. Configuring MCP Servers
HeyCode automatically loads MCP server configurations from:
1. **Workspace-specific config**: `heycode.json` in your workspace root.
2. **Global user-config**: `~/.heycode/mcp.json`.

Below is an example config (`heycode.json`) to register a filesystem tool server:
```json
{
  "mcp": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/your/workspace"
      ],
      "enabled": true
    }
  }
}
```

#### 2. Transport Protocol Options
*   **`stdio`**: Spawns a local executable. Requires `"command"` (e.g. `npx`, `python3`, `node`) and optional `"args"` and `"env"` variables.
*   **`sse`**: Connects to a remote server. Requires `"url"` (e.g. `http://localhost:5000/sse`).

#### 3. Execution & Namespacing
*   **Automatic Namespace**: Dynamic tools are registered with a namespace prefix based on the server name: `serverName__toolName` (e.g., `filesystem__read_file`).
*   **Dynamic Prompt Injection**: Descriptions and schemas of active tools are automatically appended to the LLM's system instructions.

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
| `/mcps` | View and monitor active Model Context Protocol (MCP) server statuses |
| `/theme` | Change the TUI color theme |
| `/undo` | Discard the last user message and revert code changes |
| `/exit` | Quit the TUI application |

---

This implementation is based on learning from [NightCode](https://github.com/code-with-antonio/nightcode).

