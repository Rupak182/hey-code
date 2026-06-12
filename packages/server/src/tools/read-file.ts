import { tool } from 'ai'
import { timeout } from 'hono/timeout'
import { z } from "zod"
import { dirname, relative, resolve } from "path"
import { mkdir, readFile, writeFile } from 'fs/promises'


const MAX_FILE_SIZE=10_000
export function createReadFileTool(cwd: string) {
    return tool({
        description: "Read the contents of a file in the project.Returns the file text,truncated if very large.",
        inputSchema: z.object({
            path: z.string().describe("Relative path to the file to read"),
        }),

        execute: async ({ path }) => {

            const resolved = resolve(cwd, path)

            const rel = relative(cwd, resolved)

            if (rel.startsWith("..")) {
                return {
                    error: "Path is outside the project directory."
                }
            }

            try {
                const content= await readFile(resolved,'utf-8')
                if(content.length> MAX_FILE_SIZE) {
                   return{
                    content:content.slice(0,MAX_FILE_SIZE),
                    truncated:true,
                    totalLength:content.length
                   }
                }

                return {
                    content
                }
               
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                return {
                    error: `Failed to read or write file ${path}: ${message}`
                }
            }


        }

    })
}