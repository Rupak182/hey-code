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
import { useTheme } from "../components/providers/theme"
import { TextAttributes } from "@opentui/core"
import { useDialog } from "../components/providers/dialog"
import { MessageActionsDialogContent } from "../components/dialogs"
import { useSessionActions } from "../hooks/useSessionActions"


function CompactionSeparator() {
    const { colors } = useTheme()

    return (
        <box width="100%" paddingY={1} paddingX={3} flexDirection="row" gap={1}>
            <text fg={colors.selection}>■</text>
            <text>Compaction Done...</text>
        </box>
    )
}

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

const sessionLocationSchema = z.object({
    session: z.custom<SessionData>((val) => val != null && typeof val === "object" && 'id' in val),
    initialPrompt: z.object({
        message: z.string(),
        mode: z.custom<Mode>(),
        model: z.custom<SupportedChatModelId>(),
    }).optional(),
    prefillPrompt: z.object({
        message: z.string(),
    }).optional()
})



function ChatMessage({ msg, onUserMessageAction }: { msg: Message, onUserMessageAction?: (msg: Message) => void }): React.ReactNode {
    if (msg.metadata?.systemRestoration && msg.role === "user") {
        return null
    }

    const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("")


    if (msg.role === "user") {
        return <UserMessage message={text} mode={msg.metadata?.mode ?? Mode.BUILD} onAction={onUserMessageAction ? () => onUserMessageAction(msg) : undefined} />
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

function SessionChat({ session, initialPrompt, prefillPrompt }: { session: SessionData, initialPrompt?: { message: string, mode: Mode, model: SupportedChatModelId }, prefillPrompt?: { message: string } }) {
    const [initialMessages, setInitialMessages] = useState<Message[]>((session.messages as unknown as Message[]))
    const { messages, setMessages, status, submit, abort, interrupt, error, pendingApproval } = useChat(session.id, initialMessages)
    const { isTopLayer } = useKeyboardLayer()
    const { mode, model } = usePromptConfig()
    const dialog = useDialog()
    const toast = useToast()
    const navigate = useNavigate()

    const [prefill, setPrefill] = useState<{ text: string; timestamp: number } | undefined>(undefined)

    const { handleRevert, handleFork, handleCopy } = useSessionActions({
        session,
        setMessages,
        setPrefill
    })

    const handleUserMessageAction = (msg: Message) => {
        dialog.open({
            title: "Actions",
            children: (
                <MessageActionsDialogContent
                    onSelectAction={(actionId) => {
                        if (actionId === "revert") {
                            void handleRevert(msg)
                        } else if (actionId === "fork") {
                            void handleFork(msg)
                        } else if (actionId === "copy") {
                            void handleCopy(msg)
                        }
                    }}
                />
            )
        })
    }

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

    const hasPrefilledPromptRef = useRef(false)

    useEffect(() => {
        if (!initialPrompt || hasSubmittedInitialPromptRef.current) return
        hasSubmittedInitialPromptRef.current = true
        void submit({
            userText: initialPrompt.message,
            mode: initialPrompt.mode,
            model: initialPrompt.model,
        })
    }, [initialPrompt, submit])

    useEffect(() => {
        if (!prefillPrompt || hasPrefilledPromptRef.current) return
        hasPrefilledPromptRef.current = true
        setPrefill({ text: prefillPrompt.message, timestamp: Date.now() })
    }, [prefillPrompt])



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
            sessionId={session.id}
            setMessages={setMessages}
            prefill={prefill}
            messages={messages}
            setPrefill={setPrefill}
        >
            {
                messages.map(msg => (
                    <box key={msg.id} flexDirection="column">
                        {((msg.metadata?.systemRestoration && msg.role === "user") || msg.metadata?.compactionSummaryId) && (
                            <CompactionSeparator />
                        )}
                        <ChatMessage msg={msg} onUserMessageAction={handleUserMessageAction} />
                    </box>
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
        if (prefetched?.session) {
            setSession(prefetched.session) // to fix state component issue when we fork
            return
        }
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
        <SessionChat key={`${session.id}`} session={session} initialPrompt={prefetched?.initialPrompt} prefillPrompt={prefetched?.prefillPrompt} />
    )
}