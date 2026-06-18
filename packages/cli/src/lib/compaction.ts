import { apiClient } from "./api-client";
import type { CommandContext } from "../components/command-menu/types";
import type { Message } from "../hooks/useChat";

export async function handleCompaction(ctx: CommandContext) {
    if (!ctx.sessionId) {
        ctx.toast.show({ variant: 'error', message: 'No active session' })
        return
    }

    ctx.toast.show({ message: 'Compacting conversation history...' })

    try {
        const res = await apiClient.sessions[":id"]["compact"].$post({
            param: {
                id: ctx.sessionId
            },
            json: {
                modelId: ctx.model,
                mode: ctx.mode
            }
        })

        if (!res.ok) {
            const data = await res.json() as { message?: string }
            throw new Error(data?.message || "Failed to compact")
        }

        const updatedMessages = await res.json() as Message[]
        if (ctx.setMessages) {
            ctx.setMessages(updatedMessages)
        }

        ctx.toast.show({ variant: 'success', message: 'Compacted successfully' })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to compact"
        ctx.toast.show({ variant: 'error', message })
    }
}
