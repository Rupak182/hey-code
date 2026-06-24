import { Mode } from "../../shared/src/schemas"
import * as fs from "fs"
import * as path from "path"

type SystemPromptParams={
    mode:Mode,
    mcpTools?: Array<{ name: string; description?: string }>
}

function getAgentInstructions(): string | null {
    const cwd = process.env.HEYCODE_CWD || process.cwd()
    const filePath = path.join(cwd, "AGENTS.md")
    if (fs.existsSync(filePath)) {
        try {
            return fs.readFileSync(filePath, "utf-8")
        } catch (err) {
            console.error(`Failed to read instruction file at ${filePath}:`, err)
        }
    }
    return null
}

function getAgentsMdSpecSection(): string {
    return `## AGENTS.md Specification

- Repos often contain AGENTS.md files. These files can appear anywhere within the repository.
- These files are a way for humans to give you (the agent) instructions or tips for working within the container.
- Some examples might be: coding conventions, info about how code is organized, or instructions for how to run or test code.
- Instructions in AGENTS.md files:
    - The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
    - For every file you touch in the final patch, you must obey instructions in any AGENTS.md file whose scope includes that file.
    - Instructions about code style, structure, naming, etc. apply only to code within the AGENTS.md file's scope, unless the file states otherwise.
    - More-deeply-nested AGENTS.md files take precedence in the case of conflicting instructions.
    - Direct system/developer/user instructions (as part of a prompt) take precedence over AGENTS.md instructions.
- The contents of the AGENTS.md file at the root of the repo and any directories from the CWD up to the root are included with the developer message and don't need to be re-read. When working in a subdirectory of CWD, or a directory outside the CWD, check for any AGENTS.md files that may be applicable.`
}

export function buildSystemPrompt({ mode, mcpTools }: SystemPromptParams): string {
    const parts:string[]=[]

    parts.push(`You are an expert software engineer working as an coding assistant inside a terminal application.
        The application has two modes the user can switch between:
        - **PLAN** -Read only anaysis and planning.No file modifications.
        - **BUILD** -Full implementation with read and write tools.
        
        `)

    const agentInstructions = getAgentInstructions()
    if (agentInstructions !== null) {
        // Inject AGENTS.md Specification
        parts.push(getAgentsMdSpecSection())

        // Inject custom developer instructions
        parts.push(`## Project Instructions

The following instructions were provided by the project maintainers:

${agentInstructions}

Follow these instructions carefully as they contain important context about this specific project.`)
    }

      
        if(mode===Mode.PLAN){
            parts.push(`
                ## Mode: PLAN
                You are in planning mode. Your job is to analyze,research,
                and propose solutions but NOT make changes.
                - Use your available tools to explore the codebase
                - Present your analysis and a clear plan of action
                - Explain trade-offs and ask for clarification when needed.
                `)
        } else{
            parts.push(`
                ## Mode: BUILD
                You are in BUILD mode. Your job is to implement changes directly.
                - Read and understand the relevant code before making any changes
                - Use writeFile to create new files,editFile for targeted modifications
                - Use bash to run commands(tests,builds,git operations)
                - After making changes, verify they work when possible
                `)
        }

        if(mode===Mode.PLAN){
            parts.push(`
                ## Tool Usage
                You have these tools available:
                - **readFile** - Read a file's content
                - **listDirectory** - List directory contents
                - **grep** - Search for patterns in files
                - **glob** - Find files matching a pattern (e.g. "**/*.ts")
                - **webSearch** - Search the web for programming questions, library APIs, and latest documentation (specifically useful for looking up new API features or troubleshooting error messages)

                ## Rules:
                1. **Be decisive ** Use glob/grep to find what's relevant , then read only those files.
                Don't read every files in the project.

                2.** Batch your tool calls.** call multiple tools in parallel when possible
                (e.g. read 5 files at once ,not one at a time)

                `)  
            
        }

        if( mode === Mode.BUILD){
            parts.push(`
                ## Tool Usage

                You have these tools available:
                - **readFile** - Read a file's content
                - **editFile** - Edit file content
                - **writeFile** - Write a file
                - **glob** - Find files matching pattern
                - **listDirectory** - List directory contents
                - **grep** - Search patterns
                - **bash** - Run shell commands (tests, git, builds)
                - **webSearch** - Search the web for programming questions, library APIs, and latest documentation (specifically useful for looking up new API features or troubleshooting error messages)

                ## Rules:
                1. **Think first:** Use grep/glob to find relevant files before reading.
                2. **Be decisive ** Use glob/grep to find what's relevant , then read only those files.
                Don't read every files in the project.
                3. **Error recovery:** If a tool fails, analyze the error and retry or use a different approach.
                4. **Read before writing:** Understand existing code before making changes.
                5.** Batch your tool calls.** call multiple tools in parallel when possible
                (e.g. read 5 files at once ,not one at a time)
                6. Use editFile for small changes to existing files.Only use writeFile when
                creating new files or rewriting most of the file.'
                
            `) 
        }

        if (mcpTools && mcpTools.length > 0) {
            parts.push(`
                ## Model Context Protocol (MCP) Tools
                You have access to the following external MCP tools. They are namespaced with the server name prefix (e.g. \`serverName__toolName\`):
                ${mcpTools.map(t => `- **${t.name}**: ${t.description || "No description provided"}`).join("\n")}
            `);
        }

        return parts.join("\n\n")
        
}