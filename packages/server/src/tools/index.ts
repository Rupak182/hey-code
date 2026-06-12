import  {Mode} from '@heycode/database/enums'

import { createReadFileTool } from './read-file'
import { createWriteFileTool } from './write-file'
import { createListDirectoryTool } from './list-directory'
import { createEditFileTool } from './edit-file'
import { createGrepTool } from './grep'
import { createGlobTool } from './glob'
import { createBashTool } from './bash'


export function createTools(cwd:string,mode:Mode){
    const readOnlyTools={
        readFile:createReadFileTool(cwd),
        listDirectory:createListDirectoryTool(cwd),
        glob:createGlobTool(cwd),
        grep:createGrepTool(cwd),
    }

    if(mode===Mode.PLAN){
        return readOnlyTools
    }

    return {
        ...readOnlyTools,
        editFile: createEditFileTool(cwd),
        writeFile: createWriteFileTool(cwd),
        bash: createBashTool(cwd),
    }
}