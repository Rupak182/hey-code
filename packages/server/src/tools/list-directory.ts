import {tool } from 'ai'
import { timeout } from 'hono/timeout'
import {z} from "zod"
import {dirname, join, relative, resolve } from "path"
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises'



export function createListDirectoryTool(cwd:string){
    return tool({
        description:"List files and directories in a project directory. Returns name with type indicators.",
        inputSchema:z.object({
            path:z.string().describe("Relative path to the directory to list"),
        }),

        execute:async({path})=>{

                const resolved= resolve(cwd,path)
                const rel = relative(cwd, resolved)

                if(rel.startsWith("..")){
                    return {
                        error:"Path is outside the project directory."
                    }
                }

                try{
                    const entries= await readdir(resolved)

                    const results:{name:string,type:"file" |"directory"}[]=[]

                    for (const entry of entries){
                        if(entry.startsWith('.' ) || entry==='node_modules'){
                            continue
                        }
                        const entryPath= join(resolved,entry)
                        try{
                            const info= await stat(entryPath)

                            results.push({
                                name:entry,
                                type:info.isDirectory()?'directory':'file'
                            })
                        }catch(err){
                            console.warn(`Failed to stat ${entryPath}: ${err}`)
                        }
                    }

                    results.sort((a,b)=>{
                        if(a.type !=b.type){
                            return a.type==="directory" ? -1:1
                        }
                        return a.name.localeCompare(b.name)
                    })

                    return {
                        path:relative(cwd,resolved) || ".",
                        entries:results
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