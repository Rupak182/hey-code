import { useParams, useLocation, useNavigate } from "react-router"
import { SessionShell } from "../components/session-shell"
import { apiClient } from "../lib/api-client"
import type { InferResponseType } from "hono"
import { z } from "zod"
import { UserMessage } from "../components/messages/user-message"
import { ErrorMessage } from "../components/messages/error-message"
import { BotMessage } from "../components/messages/bot-message"
import { useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "../components/providers/toast"
import { useChat, type Message } from "../hooks/useChat"
import { DEFAULT_CHAT_MODEL_ID, Mode, type SupportedChatModelId } from "@heycode/shared"
import { useKeyboardLayer } from "../components/providers/keyboard-layer"
import { useKeyboard } from "@opentui/react"
import { usePromptConfig } from "../components/providers/prompt-config"
import { PermissionPrompt } from "../components/permission-prompt"


type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

const sessionLocationSchema = z.object({
    session: z.custom<SessionData>((val) => val != null && typeof val === "object" && 'id' in val),
    initialPrompt: z.object({
        message: z.string(),
        mode: z.custom<Mode>(),
        model: z.custom<SupportedChatModelId>(),
    }).optional()

})



function ChatMessage({ msg }: { msg: Message }): React.ReactNode {

    const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("")


    if (msg.role === "user") {
        return <UserMessage message={text} mode={msg.metadata?.mode ?? Mode.BUILD} />
    }


    return (
        <BotMessage
            parts={msg.parts}
            model={msg.metadata?.model ?? "unknown"}
            mode={msg.metadata?.mode ?? Mode.BUILD}
            durationMs={msg.metadata?.durationMs}
        />
    )
}

function SessionChat({ session, initialPrompt }: { session: SessionData, initialPrompt?: { message: string, mode: Mode, model: SupportedChatModelId } }) {
    const [initialMessages, setInitialMessages] = useState<Message[]>((session.messages as unknown as Message[]))
    const { messages, status, submit, abort, interrupt, error, pendingApproval } = useChat(session.id, initialMessages)
    const { isTopLayer } = useKeyboardLayer()
    const { mode, model } = usePromptConfig()

    const hasSubmittedInitialPromptRef = useRef(false)
    useEffect(() => {
        return () => {
            void abort()
        }
    }, [abort])

    useKeyboard((key) => {
        if (key.name === 'escape' && isTopLayer("base") && status === "streaming") {
            key.preventDefault()
            interrupt()
        }
    })

    useEffect(() => {
        if (!initialPrompt || hasSubmittedInitialPromptRef.current) return
        hasSubmittedInitialPromptRef.current = true
        void submit({
            userText: initialPrompt.message,
            mode: initialPrompt.mode,
            model: initialPrompt.model,
        })
    }, [initialPrompt, submit])



    return (
        <SessionShell onSubmit={(text) => submit({
            userText: text,
            mode: mode,
            model: model,
        })
        }
            loading={status === "streaming" && !pendingApproval}
            interruptable={status === "streaming"}
            inputDisabled={pendingApproval !== null}
        >
            {
                messages.map(msg => (
                    <ChatMessage key={msg.id} msg={msg} />
                ))
            }
            {
                error && <ErrorMessage message={error.message} />

            }
            {
                pendingApproval && (
                    <PermissionPrompt
                        toolName={pendingApproval.toolName}
                        description={pendingApproval.description}
                        command={pendingApproval.command}
                        onResolve={(action) => {
                            pendingApproval.resolve(action)
                        }}
                    />
                )
            }

        </SessionShell>
    )
}

export function Session() {
    const { id } = useParams()
    const location = useLocation()
    const toast = useToast()
    const navigate = useNavigate()

    const prefetched = useMemo(() => {
        const parsed = sessionLocationSchema.safeParse(location.state)
        return parsed.success ? parsed.data : null
    }, [location.state])

    const [session, setSession] = useState<SessionData | null>(prefetched?.session ?? null);

    useEffect(() => {
        if (prefetched?.session)
            return
        setSession(null)
        if (!id) return

        let ignore = false
        const fetchSession = async () => {
            try {
                const res = await apiClient.sessions[":id"].$get({
                    param: {
                        id: id
                    }
                });
                if (ignore)
                    return

                if (!res.ok) {
                    throw new Error(`Failed to fetch session ${id}`)
                }
                const resolvedSession = await res.json() as unknown as SessionData;
                setSession(resolvedSession)

            }
            catch (err) {
                if (ignore) return
                toast.show({
                    variant: "error",
                    message: err instanceof Error ? err.message : "Failed to fetch session"
                })
                navigate("/", { replace: true })
            }
        }
        fetchSession()
        return () => {
            ignore = true
        }
    }, [id, prefetched, navigate, toast])

    if (!session) {
        return <SessionShell onSubmit={() => { }} inputDisabled loading />
    }

    return (
        <SessionChat key={`${session.id}`} session={session} initialPrompt={prefetched?.initialPrompt} />
    )
}