import type { SupportedChatModelId } from "../../../shared/src/models"
import { apiClient } from "../lib/api-client"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type InferUITools, type LanguageModelUsage, type UIMessage } from "ai"
import { useChat as useAIChat } from "@ai-sdk/react"
import { getAuth } from "../lib/auth"
import { executeLocalTool } from "../lib/local-tools"
import  { Mode,type ToolContracts, toolInputSchemas } from "@heycode/shared"
import { useCallback, useMemo, useState } from "react"
import { checkApproval, getToolDescription, ApprovalDecision, type ApprovalPolicy, type ToolInputMap } from "../lib/safety"





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


export type PendingApproval = {
    toolCallId: string;
    toolName: string;
    description: string;
    command?: string;
    resolve: (action: 'allow' | 'reject') => void;
}

export function useChat(sessionId: string, initialMessages: Message[]) {
    const [policy, setPolicy] = useState<ApprovalPolicy>('AUTO') // TODO: Config to Set it
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])

    const pendingApproval = useMemo(() => pendingApprovals[0] ?? null, [pendingApprovals])

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

            if (!(toolCall.toolName in toolInputSchemas)) {
                chat.addToolOutput({
                    tool: toolCall.toolName as keyof ChatTools,
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText: `Unknown or unsupported tool: ${toolCall.toolName}`
                })
                return
            }

            const toolName = toolCall.toolName as keyof ToolInputMap
            const input = toolCall.input as ToolInputMap[typeof toolName]

            // Perform safety check passing policy
            const decision = checkApproval({ 
                toolName, 
                input, 
                mode, 
                policy
            })

            if (decision === ApprovalDecision.REJECTED) {
                chat.addToolOutput({
                    tool: toolCall.toolName as keyof ChatTools,
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText: "Operation rejected by user safety policy"
                })
                return
            }

            if (decision === ApprovalDecision.NEEDS_CONFIRMATION) {
                const newApproval: PendingApproval = {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    description: getToolDescription(toolName, input),
                    command: toolCall.toolName === 'bash' ? (input as ToolInputMap['bash']).command : undefined,
                    resolve: (action) => {
                        setPendingApprovals((prev) => prev.filter(x => x.toolCallId !== toolCall.toolCallId))
                        if (action === 'reject') {
                            chat.addToolOutput({
                                tool: toolCall.toolName as keyof ChatTools,
                                toolCallId: toolCall.toolCallId,
                                state: "output-error",
                                errorText: "Operation rejected by user safety policy"
                            })
                        } else {
                            void executeLocalTool(toolCall.toolName, toolCall.input, mode)
                                .then((output) => {
                                    chat.addToolOutput({
                                        tool: toolCall.toolName as keyof ChatTools,
                                        toolCallId: toolCall.toolCallId,
                                        output
                                    })
                                })
                                .catch((error) => {
                                    chat.addToolOutput({
                                        tool: toolCall.toolName as keyof ChatTools,
                                        toolCallId: toolCall.toolCallId,
                                        state: "output-error",
                                        errorText: error instanceof Error ? error.message : String(error)
                                    })
                                })
                        }
                    }
                }
                setPendingApprovals((prev) => [...prev, newApproval])
                return  // sdk waits for output 
            }

            // Otherwise, APPROVED
            void executeLocalTool(toolCall.toolName, toolCall.input, mode)
                .then((output) => {
                    chat.addToolOutput({
                        tool: toolCall.toolName as keyof ChatTools,
                        toolCallId: toolCall.toolCallId,
                        output
                    })
                })
                .catch((error) => {
                    chat.addToolOutput({
                        tool: toolCall.toolName as keyof ChatTools,
                        toolCallId: toolCall.toolCallId,
                        state: "output-error",
                        errorText: error instanceof Error ? error.message : String(error),
                    })
                })
        },

        sendAutomaticallyWhen:lastAssistantMessageIsCompleteWithToolCalls  // sends messages again with prepareSendMessagesRequest
    })

    const submit = useCallback((params: { userText: string, mode: Mode, model: SupportedChatModelId }) => {
        return chat.sendMessage({  // populates message and send request to server
            text: params.userText,
            metadata: {
                mode: params.mode,
                model: params.model,
            }
        })
    }, [chat.sendMessage])

    const abort = useCallback(() => {
        setPendingApprovals([])
        chat.stop()
    }, [chat.stop])

    const interrupt = useCallback(() => {
        setPendingApprovals([])
        chat.stop()
    }, [chat.stop])

    return {
        messages: chat.messages,  // updated on streaming
        status: chat.status,
        error: chat.error,
        submit,
        abort,
        interrupt,
        pendingApproval
    }

}




/*


type HeyCodeUIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  createdAt?: Date;
  
  // 1. Captured from the 1st Generic: ChatMessageMetadata
  metadata?: {
    mode?: Mode;               // "PLAN" | "BUILD"
    model?: string;            // e.g. "gemini-1.5-pro"
    durationMs?: number;       // Execution time in ms
    usage?: {                  // Token usage statistics
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };

  // 2. Captured from the 2nd Generic: never (disables custom JSON data payloads)
  data?: never;

  // 3. Captured from the 3rd Generic: InferUITools<ToolContracts>
  // This defines the structure of the message segments/parts
  parts: Array<
    | {
        type: 'text';
        text: string;
      }
    | {
        type: 'reasoning';
        reasoning: string;
      }
    | {
        type: 'tool-call';
        toolCallId: string;
        toolName: 'readFile' | 'listDirectory' | 'glob' | 'grep' | 'writeFile' | 'editFile' | 'bash';
        args: any;          // Matches the Zod schema input (e.g. { path: string })
        state: 'pending' | 'output-available' | 'output-error';
        result?: any;       // The output returned by executeLocalTool
      }
  >;
}



*/