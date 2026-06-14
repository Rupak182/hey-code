import { getToolContracts, Mode, type ToolContracts } from "@heycode/shared";
import type { InferUITools, LanguageModelUsage, UIMessage } from "ai";
import { z } from "zod";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";
import { zValidator } from "@hono/zod-validator";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { Hono } from "hono";
import { requireCreditsBalance } from "../middleware/require-credits-balance";
import { db } from "@heycode/database/client";
import { validateUIMessages, convertToModelMessages, streamText } from "ai"
import { buildSystemPrompt } from "../system-prompt";
import type { Prisma } from "@heycode/database";
import { calculateCreditsForUsage } from "../lib/credits";
import { ingestAiUsage } from "../lib/polar";

type ChatMessageMetadata = {
    mode?: Mode,
    model?: string,
    durationMs?: number,
    usage?: LanguageModelUsage,
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


const app= new Hono<AuthenticatedEnv>()
    .post("/", requireCreditsBalance, submitValidator, async (c) => {

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

        const mergedMessages = [...previousMessages]

        for (const message of messages) {
            const incomingMessage = {
                ...message,
                metadata: {
                    mode,   // default fallback for new messages
                    model,  // default fallback for new messages
                    ...message.metadata  // existing metadata wins
                }
            } satisfies HeyCodeUIMessage

            const existingMessageIndex = mergedMessages.findIndex((m) => m.id === incomingMessage.id)

            if (existingMessageIndex === -1) {
                mergedMessages.push(incomingMessage)
            } else {
                mergedMessages[existingMessageIndex] = incomingMessage // client version might be different due to update
            }

        }

        const nextMessages = await validateUIMessages<HeyCodeUIMessage>({
            messages: mergedMessages,
            tools
        })


        const modelMessages = await convertToModelMessages(nextMessages, { tools })

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
            }
        })

        return result.toUIMessageStreamResponse<HeyCodeUIMessage>({
            originalMessages: nextMessages,
            messageMetadata({ part }) {
                if (part.type === 'start')
                    return { mode, model }

                if (part.type !== 'finish')
                    return undefined

                return {
                    mode,
                    model,
                    durationMs: Date.now() - startTime,
                    ...(completedUsage ? { usage: completedUsage } : {})
                }
            },
            async onFinish(event) {
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

                if (!completedUsage)
                    return 


                try {
                    const billableUsage = calculateCreditsForUsage({
                        provider: resolvedModel.provider,
                        model: resolvedModel.modelId,
                        usage: completedUsage
                    })

                    await ingestAiUsage({
                        externalCustomerId: userId,
                        eventId: `chat-message:${event.responseMessage.id}`,
                        credits: billableUsage.credits,
                    })
                }
                catch (error) {
                    console.error("Failed to ingest usage for chat message", {
                        error,
                        sessionId: id,
                        messageId: event.responseMessage.id,
                        userId
                    })
                }

            },

            onError(error) {
                return error instanceof Error ? error.message : String(error)
            }
        }
        )

    })

export default app