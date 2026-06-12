import {tool } from 'ai'
import {z} from "zod"
import { relative, resolve } from "path"

const MAX_RESULTS = 200
export function createGlobTool(cwd:string){
    return tool({
        description:"Find files matching a glob pattern.Returns file paths relative to the project root. Skips node_modules and other hidden files",
        inputSchema:z.object({
            pattern:z.string().describe("Glob pattern to match (e.g **/*.tsx, src/**/*.ts"),
            path:z.string().describe("Relative directory to search in (default to project root").default(".")
        }),

        execute:async({pattern,path})=>{
            const resolved= resolve(cwd,path)
            const rel = relative(cwd, resolved)

            if(rel.startsWith("..")){
                return{
                    error:"Path outside the project directory"
                }
            }
            try{
               const glob= new Bun.Glob(pattern)
               const files:string[] = []
               let truncated=false
               for await(const match of glob.scan({
                cwd:resolved,
                dot:false,
                onlyFiles:true,
               })){

                    if(match.includes("node_modules"))
                        continue

                        
                    if(files.length>=MAX_RESULTS){
                        truncated=true
                        break
                    }

                    const absoluteMatch= resolve(resolved,match)
                    files.push(relative(cwd,absoluteMatch))

               }

               files.sort()

               return{
                files,
                ...(truncated && {truncated:true})
               }

                
            } catch(err){
               const message =err instanceof Error ? err.message: String(err)
               
               return{
                error:`Failed to execute command :${message}` 
               }
            }
            
        }
    
    })
}