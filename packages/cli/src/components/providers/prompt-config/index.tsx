import { DEFAULT_CHAT_MODEL_ID, Mode, type SupportedChatModelId } from "@heycode/shared"
import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

type PromptConfigContextValue={
    mode:Mode,
    toggleMode:()=>void,
    setMode:(mode:Mode)=>void,
    model:SupportedChatModelId,
    setModel:(model:SupportedChatModelId)=>void
}


const promptConfigContext=createContext<PromptConfigContextValue |null>(null)

type PromptConfigProviderProps={
    children:ReactNode
}

export function PromptConfigProvider({children}:PromptConfigProviderProps){
    const [mode,setMode]=useState<Mode>(Mode.BUILD)
    const [model,setModel]=useState<SupportedChatModelId>(DEFAULT_CHAT_MODEL_ID)

    const toggleMode=useCallback(()=>{
        setMode(prev=>prev===Mode.BUILD?Mode.PLAN:Mode.BUILD)
        
    },[mode])


    const value:PromptConfigContextValue={
        mode,
        toggleMode,
        setMode,
        model,
        setModel
    }

    return (
        <promptConfigContext.Provider value={value}>
            {children}
        </promptConfigContext.Provider>
    )
}




export function usePromptConfig(){
    const ctx=useContext(promptConfigContext)

    if(!ctx)
        throw new Error("hook used outside of provider")
        return ctx
}