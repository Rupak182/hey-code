import type { DialogContextValue } from "../providers/dialog"
import type { ToastContextValue } from "../providers/toast"
import type { Mode, SupportedChatModelId } from "@heycode/shared"

import type { Message } from "../../hooks/useChat"

export type CommandContext={
    exit:()=>void,
    toast: ToastContextValue,
    dialog:DialogContextValue,
    navigate:(path:string)=>void,
    mode:Mode,
    model:SupportedChatModelId,
    setMode:(mode:Mode)=>void,
    setModel:(model:SupportedChatModelId)=>void,
    sessionId?: string,
    setMessages?: (messages: Message[]) => void,
    messages?: Message[],
    setPrefill?: (prefill: { text: string; timestamp: number } | undefined) => void
}


export type Command={
    name: string,
    description: string,
    value: string,
    action?: (ctx:CommandContext)=>void | Promise<void>
}
