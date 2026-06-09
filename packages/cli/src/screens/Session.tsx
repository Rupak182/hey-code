import { useParams, useLocation, useNavigate } from "react-router"
import { SessionShell } from "../components/session-shell"
import { apiClient } from "../lib/api-client"
import type { InferResponseType } from "hono"
import { z } from "zod"
import { UserMessage } from "../components/messages/user-message"
import { ErrorMessage } from "../components/messages/error-message"
import { BotMessage } from "../components/messages/bot-message"
import { useEffect, useMemo, useState } from "react"
import { useToast } from "../components/providers/toast"

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

const sessionLocationSchema = z.object({
    session: z.custom<SessionData>((val) => val != null && typeof val === "object" && 'id' in val)

})


function ChatMessage({ msg }: { msg: SessionData['messages'][number] }): React.ReactNode {
    if (msg.role === "USER") {
        return <UserMessage message={msg.content}></UserMessage>
    }
    if (msg.role === "ERROR") {
        return <ErrorMessage message={msg.content}></ErrorMessage>
    }

    return <BotMessage content={msg.content} model={msg.model}></BotMessage>

}

export function Session() {
    const { id } = useParams()
    const location = useLocation()
    const toast = useToast()
    const navigate = useNavigate()

    const prefetched = useMemo(() => {
        const parsed = sessionLocationSchema.safeParse(location.state)
        return parsed.success ? parsed.data.session : null
    }, [location.state])

    const [session, setSession] = useState<SessionData | null>(prefetched);

    useEffect(() => {
        if (prefetched)
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

    if(!session){
     return <SessionShell onSubmit={() => { }} inputDisabled  loading/>
    }

    return (
        <SessionShell onSubmit={() => { }} inputDisabled>
            {session?.messages?.map((msg)=>(
                <ChatMessage key={msg.id} msg={msg} />
            ))}
        </SessionShell>
    )
}