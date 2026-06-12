import {tool } from 'ai'
import { timeout } from 'hono/timeout'
import {z} from "zod"
import {dirname, relative, resolve } from "path"
import { mkdir, readFile, writeFile } from 'fs/promises'



export function createWriteFileTool(cwd:string){
    return tool({
        description:"Create or overwrite a file in the project.Create parent directories if they don't exist.",
        inputSchema:z.object({
            path:z.string().describe("Relative path to the file to write"),
            content:z.string().describe("The full content to write to the file.")
        }),

        execute:async({path,content})=>{

                const resolved= resolve(cwd,path)
                const rel = relative(cwd, resolved)

                if(rel.startsWith("..")){
                    return {
                        error:"Path is outside the project directory."
                    }
                }

                try{
                    await mkdir(dirname(resolved), { recursive: true })
                    await writeFile(resolved,content,"utf-8")

    
                    return {
                        success:true as const,
                        path: relative(cwd,resolved),
                        bytesWritten: Buffer.byteLength(content,"utf-8")
                    }
                }catch(err){
                    const message= err instanceof Error ? err.message :String(err)
                    return {
                        error:`Failed to read or write file ${path}: ${message}`
                    }
                }
                
            
        }
    
    })
}