import type { SupportedChatModelId } from "../../../shared/src/models"
import { apiClient } from "../lib/api-client"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type InferUITools, type LanguageModelUsage, type UIMessage } from "ai"
import { useChat as useAIChat } from "@ai-sdk/react"
import { getAuth } from "../lib/auth"
import { executeLocalTool } from "../lib/local-tools"
import  { Mode,type ToolContracts } from "@heycode/shared"
import { useMemo } from "react"




export type ChatMessageMetadata = {
    mode?: Mode,
    model?: SupportedChatModelId | string
    durationMs?: number,
    usage?: LanguageModelUsage
}

type ChatTools = {
    [Name in keyof InferUITools<ToolContracts>]: {
        input: InferUITools<ToolContracts>[Name]['input'],
        output: unknown
    }
}

export type Message = UIMessage<ChatMessageMetadata, never, ChatTools>


export function useChat(sessionId: string, initialMessages: Message[]) {
    const transport = useMemo(() => {
        return new DefaultChatTransport<Message>({
            api: apiClient.chat.$url().toString(),
            headers: () => {
                const auth = getAuth()
                return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers()
            },
            prepareSendMessagesRequest({ messages }) {
                const message = messages[messages.length - 1]
                if (!message)
                    throw new Error("No message to send")
                const metadata = messages.findLast((m) => m.metadata?.mode && m.metadata?.model)?.metadata

                return {
                    body: {
                        id: sessionId,
                        messages: messages,
                        model: message.metadata?.model ?? metadata?.model,
                        mode: message.metadata?.mode ?? metadata?.mode,
                    }
                }
            }

        })
    }, [sessionId])


    const chat = useAIChat<Message>({
        id: sessionId,
        messages: initialMessages,
        transport,
        onToolCall({ toolCall }) {
            const mode = chat.messages.at(-1)?.metadata?.mode ?? Mode.BUILD
            void executeLocalTool(toolCall.toolName, toolCall.input, mode).then(
                (output) => {
                    chat.addToolOutput({
                        tool: toolCall.toolName as keyof ChatTools,
                        toolCallId: toolCall.toolCallId,
                        output
                    }) // adds output field maybe
                }
            )
                .catch((error) =>
                    chat.addToolOutput({
                        tool: toolCall.toolName as keyof ChatTools,
                        toolCallId: toolCall.toolCallId,
                        state: "output-error",
                        errorText: error instanceof Error ? error.message : String(error),
                    })
                )
        },

        sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls
    })

    return {
        messages:chat.messages,  // updated on streaming
        status:chat.status,
        error:chat.error,
        submit:(params:{userText:string,mode:Mode,model:SupportedChatModelId})=>{
            return chat.sendMessage({
                text:params.userText,
                metadata:{
                    mode:params.mode,
                    model:params.model,
                }
            })
        },
        abort:chat.stop,
        interrupt:chat.stop
    }

}


