import { findSupportedChatModel } from "@heycode/shared"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { db } from "@heycode/database/client"
import { Role, Mode, MessageStatus } from "@heycode/database/enums"
import type { AuthenticatedEnv } from "../middleware/require-auth"

const createSessionSchema = z.object({
    title: z.string(),
    cwd: z.string().optional(),
    initialMessage: z.object({
        role: z.enum(Role),
        content: z.string(),
        mode: z.enum(Mode),
        model: z.string().refine((id) => !!findSupportedChatModel(id), "Unsupported Model")
    }).optional()
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

const app = new Hono<AuthenticatedEnv>()
    .get("/", async (c) => {
        const userId= c.get("userId")
        const sessions = await db.session.findMany({
            where:{
                userId
            },
            orderBy: {
                createdAt: "desc"
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
            }
        }
        )

        return c.json(sessions)
    })
    .get(":id", async (c) => {
        // await new Promise((resolve)=>setTimeout(resolve,10000))

        // throw new HTTPException(500,
        //     { message:"Mock error"}
        // )

        const id = c.req.param("id")

        const session = await db.session.findUnique({
            where: {
                id,
                userId: c.get("userId")
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            }
        })

        if (!session) {
            return c.json({
                message: "Session not found"
            }, 404)
        }

        return c.json(session)
    })
    .post("/", createSessionValidator, async (c) => {
        // await new Promise((resolve)=>setTimeout(resolve,10000))

        const { initialMessage, ...data } = c.req.valid("json")
        const userId= c.get("userId")

        const session = await db.session.create({
            data: {
                ...data,
                userId,
                ...(initialMessage && {
                    messages: {
                        create: {
                            ...initialMessage,
                            status: MessageStatus.COMPLETE
                        }
                    }
                })
            },
            include: {
                messages: true
            }
        })

        return c.json(session, 201)
    })

export default app

