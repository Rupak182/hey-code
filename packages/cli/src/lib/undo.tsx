import React from "react";
import { apiClient } from "./api-client";
import { revertToMessage, hasUncommittedChanges } from "./git";
import type { Message } from "../hooks/useChat";
import type { CommandContext } from "../components/command-menu/types";
import { RevertConfirmDialog } from "../components/dialogs";

export async function handleUndo(ctx: CommandContext) {
    if (!ctx.sessionId) {
        ctx.toast.show({
            variant: "error",
            message: "No active session found to undo"
        })
        return
    }

    const messages = ctx.messages || []
    if (messages.length === 0) {
        ctx.toast.show({
            variant: "error",
            message: "No messages to undo"
        })
        return
    }

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")
    if (!lastUserMsg) {
        ctx.toast.show({
            variant: "error",
            message: "No user messages found to undo"
        })
        return
    }

    const performRevert = async () => {
        try {
            const res = await apiClient.sessions[":id"].revert.$post({
                param: { id: ctx.sessionId! },
                json: { messageId: lastUserMsg.id }
            })

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({})) as { message?: string }
                throw new Error(errorBody.message || "Failed to revert session on server")
            }

            const updatedMessages = await res.json() as Message[]
            await revertToMessage(lastUserMsg.id)

            if (ctx.setMessages) {
                ctx.setMessages(updatedMessages)
            }

            if (ctx.setPrefill) {
                const targetText = lastUserMsg.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
                ctx.setPrefill({ text: targetText, timestamp: Date.now() })
            }

            ctx.toast.show({
                variant: "success",
                message: "Successfully undone the last message"
            })
        } catch (err) {
            ctx.toast.show({
                variant: "error",
                message: err instanceof Error ? err.message : "Failed to undo last message"
            })
        }
    }

    try {
        const hasChanges = await hasUncommittedChanges()
        if (hasChanges) {
            ctx.dialog.open({
                title: "Confirm Undo",
                children: (
                    <RevertConfirmDialog
                        onConfirm={async (decision) => {
                            ctx.dialog.close()
                            if (decision === "force") {
                                await performRevert()
                            }
                        }}
                    />
                )
            })
            return
        }

        await performRevert()
    } catch (err) {
        ctx.toast.show({
            variant: "error",
            message: err instanceof Error ? err.message : "Failed to check uncommitted changes"
        })
    }
}
