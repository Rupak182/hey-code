import { Mode, toolInputSchemas } from "@heycode/shared"
import Exa from "exa-js"
import { match } from "assert"
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises"
import { dirname, isAbsolute, join, relative, resolve } from "path"
import { createPatch } from "diff"
import { executeMcpTool } from "./mcp/client"


const MAX_FILE_SIZE = 10_000
const MAX_RESULT_SIZE = 200
const MAX_MATCHES = 50
const MAX_OUTPUT = 20_000
const DEFAULT_TIMEOUT = 30_000

function resolveInsideCwd(path: string) {
    const cwd = process.env.HEYCODE_CWD || process.cwd()
    const resolved = resolve(cwd, path)
    const rel = relative(cwd, resolved)

    if (rel.startsWith('..') || isAbsolute(path)) {
        throw new Error("Path outside the project directory")
    }
    return { cwd, resolved }
}

function truncate(value: string, limit: number) {
    return value.length > limit ? `${value.slice(0, limit)}\n... (truncated), ${value.length - limit} more chars` : value
}

export async function executeLocalTool(toolName: string, input: unknown, mode: Mode) {
    if (mode == Mode.PLAN && !["readFile", "listDirectory", "glob", "grep", "webSearch"].includes(toolName)) {
        throw new Error(`Tool ${toolName} is not allowed in PLAN mode`)
    }

    switch (toolName) {
        case "readFile":
            const { path } = toolInputSchemas.readFile.parse(input)
            const { resolved } = resolveInsideCwd(path)
            const content = await readFile(resolved, { encoding: 'utf-8' })

            return content.length > MAX_FILE_SIZE ?
                {
                    content: content.slice(0, MAX_FILE_SIZE)
                    , truncated: true, totalLength: content.length
                } :
                { content }

        case "listDirectory": {
            const { path } = toolInputSchemas.listDirectory.parse(input)
            const { cwd, resolved } = resolveInsideCwd(path)

            const entries = await readdir(resolved)

            const results: { name: string; type: "file" | "directory" }[] = []

            for (const entry of entries) {
                if (entry.startsWith(".") || entry === "node_modules")
                    continue
                const info = await stat(join(resolved, entry))
                results.push({
                    name: entry,
                    type: info.isDirectory() ? "directory" : "file",
                })
            }

            results.sort((a, b) => {
                if ((a.type === "directory" && b.type === "file")) return -1
                if (a.type === "file" && b.type === "directory") return 1
                return a.name.localeCompare(b.name)
            })

            return {
                path: relative(cwd, resolved) || ".",
                entries: results,
            }
        }

        case "glob": {
            const { pattern, path } = toolInputSchemas.glob.parse(input)
            const { cwd, resolved } = resolveInsideCwd(path)
            const glob = new Bun.Glob(pattern)

            const files: string[] = []
            let truncated = false
            for await (const match of glob.scan({ cwd: resolved, dot: false, onlyFiles: true })) {
                if (match.includes("node_modules")) {
                    continue
                }

                if (files.length >= MAX_RESULT_SIZE) {
                    truncated = true
                    break
                }
                files.push(relative(cwd, resolve(resolved, match)))
            }

            files.sort()
            return {
                files,
                ... (truncated ? { truncated: true } : {})
            }
        }


        case "grep": {
            const { pattern, path, include } = toolInputSchemas.grep.parse(input)
            const { cwd, resolved } = resolveInsideCwd(path)
            const args = [
                "-rn",
                "--color=never",
                "--exclude-dir=node_modules",
                "--exclude-dir=.git",
                "-E",
            ]
            if (include) {
                args.push(`--include=${include}`)
            }
            args.push(
                pattern,
                resolved
            )

            const proc = Bun.spawn(["grep", ...args], {
                stdout: "pipe",
                stderr: "pipe",
            })

            const [stdOut, stdErr] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text()
            ])

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

        }
        case "writeFile": {
            const { path, content } = toolInputSchemas.writeFile.parse(input)
            const { cwd, resolved } = resolveInsideCwd(path)
            const rel = relative(cwd, resolved)

            let oldContent = ""
            try {
                oldContent = await readFile(resolved, "utf-8")
            } catch (e) {
                // File does not exist yet (expected for new files)
            }

            await mkdir(dirname(resolved), { recursive: true })
            await writeFile(resolved, content, "utf-8")

            const diff = createPatch(path, oldContent, content, 'Original', 'Modified')

            return {
                success: true as const,
                path: relative(cwd, resolved),
                bytesWritten: Buffer.byteLength(content, "utf-8"),
                diff
            }

        }
        case "editFile": {
            const { path, oldString, newString } = toolInputSchemas.editFile.parse(input)
            const { cwd, resolved } = resolveInsideCwd(path)
            const content = await readFile(resolved, "utf-8")

            const occurences = content.split(oldString).length - 1
            if (occurences === 0) {
                return {
                    error: `${oldString} not found in the file ${path}`
                }
            }
            if (occurences > 1) {
                return {
                    error: `old string is ambiguous -found ${occurences} matches, Provide more context to make it unique`
                }
            }

            const newContent = content.replace(oldString, newString)
            await writeFile(resolved, newContent, "utf-8")

            const diff = createPatch(path, content, newContent, 'Original', 'Modified')

            return {
                success: true as const,
                path: relative(cwd, resolved),
                diff
            }
        }

        case "bash": {
            const {command,timeout=DEFAULT_TIMEOUT}=toolInputSchemas.bash.parse(input)
            const proc = Bun.spawn(["bash", "-c", command], {
                cwd:resolveInsideCwd(".").resolved,
                stdout: "pipe",
                stderr: "pipe",
                env: { ...process.env, TERM: "dumb" }
            })

            const timer = setTimeout(() => {
                proc.kill()
            }, timeout)

            const [stdout, stderr] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text()
            ])

            const exitCode = await proc.exited
            clearTimeout(timer)

            const truncate = (s: string) =>
                s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + `\n ...(truncated , ${s.length - MAX_OUTPUT} chars) ` : s

            return {
                stdout: truncate(stdout),
                stderr: truncate(stderr),
                exitCode
            }
        }
        case "webSearch": {
            const { query, maxResults } = toolInputSchemas.webSearch.parse(input)
            const apiKey = process.env.EXA_API_KEY

            if (!apiKey) {
                return "Error: EXA_API_KEY environment variable is not set. Please add it to your environment or .env file to enable web search."
            }

            try {
                const exa = new Exa(apiKey)
                const response = await exa.search(query, {
                    numResults: maxResults,
                    contents: {
                        highlights: true,
                        maxAgeHours: 48,
                    }
                })

                if (!response.results || response.results.length === 0) {
                    return `No results found for query: "${query}"`
                }

                const formattedLines = [`Results for query: "${query}"`, ""]
                response.results.forEach((result, idx) => {
                    formattedLines.push(`${idx + 1}. Title: ${result.title || "Untitled"}`)
                    formattedLines.push(`   URL: ${result.url || "No URL"}`)
                    if (result.highlights && result.highlights.length > 0) {
                        formattedLines.push(`   Snippet: ${result.highlights.join(" ... ")}`)
                    }
                    formattedLines.push("")
                })

                return formattedLines.join("\n")
            } catch (err) {
                return `Error performing web search: ${err instanceof Error ? err.message : String(err)}`
            }
        }

        default:
            if (toolName.includes("__")) {
                return await executeMcpTool(toolName, input);
            }
            throw new Error(`Unknown tool: ${toolName}`);

    }
}

