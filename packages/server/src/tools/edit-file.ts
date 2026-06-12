import {tool } from 'ai'
import { timeout } from 'hono/timeout'
import {z} from "zod"
import {relative, resolve } from "path"
import { readFile, writeFile } from 'fs/promises'



export function createEditFileTool(cwd:string){
    return tool({
        description:"Make a targeted edit to a file replacing an exact string match. The old string must appear exactly once on the file (for saftery). Use this for surgical edits instead of rewriting whole file.",
        inputSchema:z.object({
            path:z.string().describe("Relative path to the file to edit"),
            oldString:z.string().describe("The exact text to find and replace(must be unique in the file)"),
            newString:z.string().describe("The new text to replace the old string with")
        }),

        execute:async({path,oldString,newString})=>{

                const resolved= resolve(cwd,path)
                const rel = relative(cwd, resolved)

                if(rel.startsWith("..")){
                    return {
                        error:"Path is outside the project directory."
                    }
                }

                try{
                    const content= await readFile(resolved,"utf-8")

                    const occurences= content.split(oldString).length-1
                    if(occurences===0){
                        return {
                            error:`${oldString} not found in the file ${path}`
                        }
                    }
                    if(occurences >1){
                        return{
                            error:`old string is ambiguous -found ${occurences} matches, Provide more context to make it unique`
                        }
                    }

                    await writeFile(resolved,content.replace(oldString,newString),"utf-8")




                    return {
                        success:true as const,
                        path: relative(cwd,resolved)
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