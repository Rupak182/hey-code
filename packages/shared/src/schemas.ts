import {z} from 'zod'
import {tool} from 'ai'

export const Mode = {
    BUILD:"BUILD" as const,
    PLAN:"PLAN" as const,
} as const


export const modeSchema= z.enum([Mode.BUILD,Mode.PLAN])

export type Mode=(typeof Mode)[keyof typeof Mode]

export const toolInputSchemas={
    readFile:z.object({
        path:z.string().describe("Relative path to the file to read")
    }),
    listDirectory:z.object({
        path:z.string().default(".").describe("Relative path to the directory to list")
    }),
    glob:z.object({
        pattern:z.string().describe("Glob pattern to match files"),
        path:z.string().default(".").describe("Directory path to search from")
    }),
    grep:z.object({
        pattern:z.string().describe("Regex pattern to search for"),
        path:z.string().default(".").describe("Directory path to search from"),
        include:z.string().optional().describe("Optional glob pattern to include files to search in")
    }),
    writeFile:z.object({
        path:z.string().describe("Relative path to the file to write"),
        content:z.string().describe("Content to write to the file")
    }),
    editFile:z.object({
        path:z.string().describe("Relative path to the file to edit"),
        oldString:z.string().describe("Exact text to replace"),
        newString:z.string().describe("Replacement text")
    }),
    bash:z.object({
        command:z.string().describe("Command to execute"),
        description:z.string().optional().describe("Description of what the command does"),
        timeout:z.number().optional().describe("Timeout in milliseconds")
    }),
    
} as const


export const readOnlyToolContracts= {
    readFile:tool({
        description:'Read a file from the current project directory',
        inputSchema:toolInputSchemas.readFile
    }),
    listDirectory:tool({
        description:'List entires in a directory under current project directory',
        inputSchema:toolInputSchemas.listDirectory
    }),
    glob:tool({
        description:'Search for files using glob pattern under current project directory',
        inputSchema:toolInputSchemas.glob
    }),
    grep:tool({
        description:'Search for files using regex pattern under current project directory',
        inputSchema:toolInputSchemas.grep
    }),
} as const

export const buildToolContracts={
    ...readOnlyToolContracts,
    writeFile:tool({
        description:'Create or overwrite a file in the current project directory',
        inputSchema:toolInputSchemas.writeFile
    }),
    editFile:tool({
        description:'Replace exact text in a file in the current project directory',
        inputSchema:toolInputSchemas.editFile
    }),
    bash:tool({
        description:'Execute a bash command in the current project directory',
        inputSchema:toolInputSchemas.bash
    }),
} as const


export type ToolContracts=typeof buildToolContracts


export function getToolContracts(mode:Mode){
    if(mode===Mode.BUILD){
        return buildToolContracts
    }else{
        return readOnlyToolContracts
    }
}