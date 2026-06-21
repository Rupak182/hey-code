import React from "react"
import { useNavigate } from "react-router"
import { useDialog } from "../components/providers/dialog"
import { useToast } from "../components/providers/toast"
import { apiClient } from "../lib/api-client"
import { hasUncommittedChanges, revertToMessage, forkSessionBranch, discardUncommittedChanges } from "../lib/git"
import type { Message } from "./useChat"
import { RevertConfirmDialog, ForkConfirmDialog } from "../components/dialogs"
import type { InferResponseType } from "hono"

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

interface UseSessionActionsParams {
    session: SessionData
    setMessages: (messages: Message[]) => void
    setPrefill: (prefill: { text: string; timestamp: number } | undefined) => void
}

export function useSessionActions({ session, setMessages, setPrefill }: UseSessionActionsParams) {
    const dialog = useDialog()
    const toast = useToast()
    const navigate = useNavigate()

    const handleRevert = async (msg: Message, force = false) => {
        try {
            const hasChanges = await hasUncommittedChanges()
            if (hasChanges && !force) {
                dialog.open({
                    title: "Confirm Revert",
                    children: (
                        <RevertConfirmDialog
                            onConfirm={async (decision) => {
                                dialog.close()
                                if (decision === "force") {
                                    await handleRevert(msg, true)
                                }
                            }}
                        />
                    )
                })
                return
            }

            // Call API
            const res = await apiClient.sessions[":id"].revert.$post({
                param: { id: session.id },
                json: { messageId: msg.id }
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({})) as { message?: string }
                throw new Error(errorData.message || "Failed to revert session on server")
            }

            const updatedMessages = await res.json() as Message[]

            // Revert files on disk
            await revertToMessage(msg.id)

            // Update state
            setMessages(updatedMessages)

            // Prefill the input bar with the user message text
            const targetText = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
            setPrefill({ text: targetText, timestamp: Date.now() })

            toast.show({
                message: "Successfully reverted session to selected message"
            })
        } catch (err) {
            toast.show({
                variant: "error",
                message: err instanceof Error ? err.message : "Failed to revert session"
            })
        }
    }

    const handleFork = async (msg: Message, force = false) => {
        try {
            const hasChanges = await hasUncommittedChanges()
            if (hasChanges && !force) {
                dialog.open({
                    title: "Confirm Fork",
                    children: (
                        <ForkConfirmDialog
                            onConfirm={async (decision) => {
                                dialog.close()
                                if (decision === "force") {
                                    await handleFork(msg, true)
                                }
                            }}
                        />
                    )
                })
                return
            }

            if (force) {
                await discardUncommittedChanges()
            }

            // Call API
            const res = await apiClient.sessions[":id"].fork.$post({
                param: { id: session.id },
                json: { messageId: msg.id }
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({})) as { message?: string }
                throw new Error(errorData.message || "Failed to fork session on server")
            }

            const newSessionData = await res.json() as SessionData & { forkNumber: number }

            // Fork branch in shadow repository
            await forkSessionBranch(msg.id, newSessionData.id)

            // Navigate to the new session
            const targetText = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
            navigate(`/sessions/${newSessionData.id}`, {
                state: {
                    session: newSessionData,
                    prefillPrompt: {
                        message: targetText
                    }
                }
            })

            toast.show({
                message: `Forked session successfully (fork #${newSessionData.forkNumber})`
            })
        } catch (err) {
            toast.show({
                variant: "error",
                message: err instanceof Error ? err.message : "Failed to fork session"
            })
        }
    }

    return {
        handleRevert,
        handleFork
    }
}
