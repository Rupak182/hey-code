import { findSupportedChatModel, DEFAULT_CHAT_MODEL_ID, Mode } from "@heycode/shared"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { db } from "@heycode/database/client"
import { sessions } from "@heycode/database"
import { eq, desc, and } from "drizzle-orm"
import type { AuthenticatedEnv } from "../middleware/require-auth"
import { resolveChatModel } from "../lib/models"
import { performCompaction, type HeyCodeUIMessage } from "../lib/compaction"

const createSessionSchema = z.object({
    title: z.string(),
})

const createSessionValidator = zValidator(
    "json", createSessionSchema, (result, c) => {
        if (!result.success) {
            return c.json({
                error: "invalid request body"
            }, 400)
        }
    }
)

const compactSessionValidator = zValidator(
    "json",
    z.object({
        modelId: z.string(),
        mode: z.enum(Mode)
    }),
    (result, c) => {
        if (!result.success) {
            return c.json({
                error: "invalid request body"
            }, 400)
        }
    }
)



const app = new Hono<AuthenticatedEnv>()
    .get("/", async (c) => {
        const userId = c.get("userId")
        const list = await db.select({
            id: sessions.id,
            title: sessions.title,
            createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.createdAt))

        return c.json(list)
    })
    .get(":id", async (c) => {
        // await new Promise((resolve)=>setTimeout(resolve,10000))

        // throw new HTTPException(500,
        //     { message:"Mock error"}
        // )

        const id = c.req.param("id")

        const session = await db.select()
            .from(sessions)
            .where(and(eq(sessions.id, id), eq(sessions.userId, c.get("userId"))))
            .get()

        if (!session) {
            return c.json({
                message: "Session not found"
            }, 404)
        }

        return c.json(session)
    })
    .post("/", createSessionValidator, async (c) => {
        // await new Promise((resolve)=>setTimeout(resolve,10000))

        const userId = c.get("userId")
        const data = c.req.valid("json")
        const [session] = await db.insert(sessions)
            .values({
                title: data.title,
                userId,
                messages: []
            })
            .returning()

        return c.json(session, 201)
    })
    .post("/:id/compact", compactSessionValidator, async (c) => {
        const id = c.req.param("id")
        const userId = c.get("userId")
        const body = c.req.valid("json")

        const session = await db.select()
            .from(sessions)
            .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
            .get()

        if (!session) {
            return c.json({
                message: "Session not found"
            }, 404)
        }

        const previousMessages = Array.isArray(session.messages)
            ? (session.messages as unknown as HeyCodeUIMessage[])
            : []

        if (previousMessages.length === 0) {
            return c.json({
                message: "No messages to compact"
            }, 400)
        }

        try {
            const { modelId, mode } = body
            const resolvedModel = resolveChatModel(modelId)

            const newMessagesList = await performCompaction(previousMessages, resolvedModel, mode, modelId)
            if (!newMessagesList) {
                return c.json({
                    message: "History did not produce a summary"
                }, 400)
            }

            await db.update(sessions)
                .set({
                    messages: newMessagesList
                })
                .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))

            return c.json(newMessagesList)
        } catch (err) {
            console.error("Manual compaction failed:", err)
            return c.json({
                message: err instanceof Error ? err.message : "Compaction failed"
            }, 500)
        }
    })

export default app

