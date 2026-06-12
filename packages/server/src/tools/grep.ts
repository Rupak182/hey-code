import { tool } from 'ai'
import { z } from "zod"
import { relative, resolve } from "path"

const MAX_MATCHES = 50
export function createGrepTool(cwd: string) {
    return tool({
        description: "Search file contents using a regex pattern.Returns matching lines with file paths and line numbers. Skips hidden directories,node modules and binary files.",
        inputSchema: z.object({
            pattern: z.string().describe("Regex pattern to search for"),
            path: z.string().describe("Relative directory to search in (default to project root").default("."),
            include: z.string().describe("Glob pattern to filter files (e.g. '*.ts', '*.tsx')")
        }),

        execute: async ({ pattern, path, include }) => {
            const resolved = resolve(cwd, path)
            const rel = relative(cwd, resolved)

            if (rel.startsWith("..")) {
                return {
                    error: "Path outside the project directory"
                }
            }
            try {
                const args = [
                    "-rn",
                    "--color=never",
                    "--exclude-dir=node_modules",
                    "--exclude-dir=.git",
                    "-E",

                ]
                if (include) {
                    args.push("--include", include)
                }
                args.push(
                    pattern,
                    resolved
                )

                const proc = Bun.spawn(["grep", ...args], {
                    stdout: "pipe",
                    stderr: "pipe",
                })

                const stdOut = await new Response(proc.stdout).text()
                const stdErr = await new Response(proc.stderr).text()
                const exitCode = await proc.exited

                const lines = stdOut.split("\n")

                if (proc.exitCode !== 0 && proc.exitCode !== 1) {
                    return {
                        error: `grep failed ${stdErr.trim()}`
                    }
                }

                if (!stdOut.trim()) {
                    return {
                        matches: [],
                        message: "No matches found"
                    }
                }

                let truncated = false
                const matches: { file: string; line: number, content: string }[] = []

                for (const line of lines) {
                    if (matches.length >= MAX_MATCHES) {
                        truncated = true
                        break
                    }

                    const match = line.match(/^(.+?):(\d+):(.*)$/)
                    if (match) {
                        matches.push({
                            file: relative(cwd, match[1]!),
                            line: parseInt(match[2]!),
                            content: match[3]!
                        });
                    }
                }

                return {
                    matches,
                    ...(truncated ? { truncated: true, totalMatches: lines.length } : {})
                }
                
            } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    return {
        error: `Failed to execute command :${message}`
    }
}
            
        }
    
    })
}