import { getToolContracts, Mode, type ToolContracts } from "@heycode/shared";
import type { InferUITools, LanguageModelUsage, UIMessage } from "ai";
import { z } from "zod";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";
import { zValidator } from "@hono/zod-validator";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { Hono } from "hono";
import { db } from "@heycode/database/client";
import { validateUIMessages, convertToModelMessages, streamText, generateId } from "ai";
import { buildSystemPrompt } from "../system-prompt";
import type { Prisma } from "@heycode/database";
import { shouldCompress, compressHistory } from "../lib/compaction";

type ChatMessageMetadata = {
    mode?: Mode,
    model?: string,
    durationMs?: number,
    usage?: LanguageModelUsage,
    compacted?: boolean,
    systemRestoration?: boolean,
}

type HeyCodeUIMessage = UIMessage<ChatMessageMetadata, never, InferUITools<ToolContracts>>

const submitSchema = z.object({
    id: z.string(),
    messages: z.array(
        z.custom<HeyCodeUIMessage>((value) => value != null && typeof value === "object" && "id" in value && "parts" in value)
    ).min(1),
    mode: z.enum([Mode.BUILD, Mode.PLAN]),
    model: z.string().refine(isSupportedChatModel, "Unsupported model")
})

const hasPendingToolCalls = (messages: HeyCodeUIMessage) => {
    return messages.parts.some((part) => {
        if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            const state = (part as { state?: string }).state
            return state !== "output-available" && state !== "output-error"
        }
        return false
    })
}

const submitValidator = zValidator('json', submitSchema, (result, c) => {
    if (!result.success) {
        return c.json({
            error: "invalid request body"
        }, 400);
    }
});


const app = new Hono<AuthenticatedEnv>()
    .post("/", submitValidator, async (c) => {

        const userId = c.get("userId")

        const { id, messages, mode, model } = c.req.valid("json");

        const session = await db.session.findUnique({
            where: {
                id: id,
                userId
            }
        })

        if (!session) {
            return c.json({
                error: "Session not found",
            }, 404)
        }

        const startTime = Date.now()
        const tools = getToolContracts(mode);
        const resolvedModel = resolveChatModel(model)
        const previousMessages = Array.isArray(session.messages)
            ? (session.messages as unknown as HeyCodeUIMessage[])
            : []

        let finalPreviousMessages = [...previousMessages]

        if (shouldCompress(finalPreviousMessages)) {
            try {
                const summary = await compressHistory(finalPreviousMessages, resolvedModel)
                if (summary) {
                    const summaryMessageId = generateId()
                    const continuationContent = `# Context Restoration (Previous Session Compacted)

The previous conversation was compacted due to context length limits. Below is a detailed summary of the work done so far. 

**CRITICAL: Actions listed under "COMPLETED ACTIONS" are already done. DO NOT repeat them.**

---

${summary}

---

Resume work from where we left off. Focus ONLY on the remaining tasks.`

                    // Flag all existing messages in the DB history as compacted
                    const updatedPrevious = finalPreviousMessages.map(msg => ({
                        ...msg,
                        metadata: {
                            ...msg.metadata,
                            compacted: true
                        }
                    }))

                    const summaryMessage: HeyCodeUIMessage = {
                        id: summaryMessageId,
                        role: 'user',
                        parts: [
                            {
                                type: 'text',
                                text: continuationContent
                            }
                        ],
                        metadata: {
                            mode,
                            model,
                            systemRestoration: true
                        }
                    }

                    finalPreviousMessages = [...updatedPrevious, summaryMessage]

                    await db.session.update({
                        where: {
                            id: id,
                            userId
                        },
                        data: {
                            messages: finalPreviousMessages as unknown as Prisma.InputJsonValue
                        }
                    })
                }
            } catch (err) {
                console.error("Compaction failed:", err)
            }
        }

        const mergedMessages = [...finalPreviousMessages]

        for (const message of messages) {
            const incomingMessage = {
                ...message,
                metadata: {
                    mode,
                    model,  // not needed maybe
                    ...message.metadata 
                }
            } satisfies HeyCodeUIMessage

            const existingMessageIndex = mergedMessages.findIndex((m) => m.id === incomingMessage.id)

            if (existingMessageIndex === -1) {
                mergedMessages.push(incomingMessage)
            } else {
                const existing = mergedMessages[existingMessageIndex]
                if (existing) {
                    mergedMessages[existingMessageIndex] = {
                        ...incomingMessage,
                        metadata: {
                            ...existing.metadata,
                            ...incomingMessage.metadata,
                            compacted: existing.metadata?.compacted // Preserve database's compacted flag
                        }
                    }
                }
            }
        }

        const nextMessages = await validateUIMessages<HeyCodeUIMessage>({
            messages: mergedMessages.filter((msg) => msg.parts && msg.parts.length > 0),
            tools
        })

        // Filter out compacted messages so the LLM doesn't see them
        const activeMessages = nextMessages.filter(msg => !msg.metadata?.compacted)
        const modelMessages = await convertToModelMessages(activeMessages, { tools })

        let completedUsage: LanguageModelUsage | null = null

        const result = streamText({
            model: resolvedModel.model,
            system: buildSystemPrompt({ mode }),
            messages: modelMessages,
            tools: tools,
            providerOptions: resolvedModel.providerOptions ? {
                [resolvedModel.provider]: resolvedModel.providerOptions
            } : undefined,
            onFinish: async ({ usage }) => {
                completedUsage = usage
            }  //  model response finished
        })

        return result.toUIMessageStreamResponse<HeyCodeUIMessage>({
            originalMessages: nextMessages,
            generateMessageId: () => generateId(),
            messageMetadata({ part }) {
                if (part.type === 'start')
                    return { mode, model }  // metadata for assistant message

                if (part.type !== 'finish')
                    return undefined   // after streamText onFinish

                return {
                    mode,
                    model,
                    durationMs: Date.now() - startTime,
                    ...(completedUsage ? { usage: completedUsage } : {})
                }
            },
            async onFinish(event) { //after everything sent to client
                if (event.isAborted) 
                    return
                if (hasPendingToolCalls(event.responseMessage))
                    return
                await db.session.update({
                    where: {
                        id,
                        userId
                    },
                    data: {
                        messages: event.messages as unknown as Prisma.InputJsonValue
                    }
                })
            },

            onError(error) {
                return error instanceof Error ? error.message : String(error)
            }
        })

    })

export default app