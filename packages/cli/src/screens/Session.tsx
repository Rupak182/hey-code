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
import prettyMs from "pretty-ms"
import { useChat, type ClientMesagePart, type Message } from "../hooks/useChat"
import { DEFAULT_CHAT_MODEL_ID, messagePartsSchema, type SupportedChatModelId } from "@heycode/shared"
import { MessageStatus } from "@heycode/database/enums"
import { useKeyboardLayer } from "../components/providers/keyboard-layer"
import { useKeyboard } from "@opentui/react"
import { usePromptConfig } from "../components/providers/prompt-config"

type SessionData = InferResponseType<typeof apiClient.sessions[":id"]["$get"], 200>

const sessionLocationSchema = z.object({
    session: z.custom<SessionData>((val) => val != null && typeof val === "object" && 'id' in val)

})


function mapDbMessages(dbMessages:SessionData['messages']):Message[]{
    return dbMessages.map((m)=>{
        if(m.role==='ERROR'){
            return {
                id:m.id,
                role:'error',
                content:m.content,
            }
    }else if(m.role==='USER'){
        return {
            id:m.id,
            role:'user',
            content:m.content,
            mode:m.mode,
            model:m.model as SupportedChatModelId
        }
    }else{
        const parsedParts= m.parts ===null? null: messagePartsSchema.safeParse(m.parts)
        
        const parts:ClientMesagePart[] =parsedParts?.success 
        ?parsedParts.data.map((p)=>
            p.type==='tool-call' ? {...p,status:"done" as const}:p
        ):[]



        return {
            id:m.id,
            role:'assistant',
            content:m.content,
            mode:m.mode,
            model:m.model as SupportedChatModelId,
            parts,
           ...(m.duration ? { duration: prettyMs(m.duration) } : {}),
           interrupted: m.status === MessageStatus.INTERRUPTED
        }
    }
    })

}

function ChatMessage({ msg }: { msg: Message }): React.ReactNode {
    if (msg.role === "user") {
        return <UserMessage message={msg.content} mode={msg.mode}  />
    }
    if (msg.role === "error") {
        return <ErrorMessage message={msg.content}></ErrorMessage>
    }

    return (
        <BotMessage
            parts={msg.parts}
            model={msg.model}
            mode={msg.mode}
            duration={msg.duration}
            interrupted={msg.interrupted}
        />
    )
}

function SessionChat({session}: {session: SessionData}){
    const [initialMessages,setInitialMessages]= useState<Message[]>(mapDbMessages(session.messages))
    const {messages,streaming,submit,abort,interrupt}=useChat(session.id,initialMessages)
    const {isTopLayer}= useKeyboardLayer()
    const {mode,model}=usePromptConfig()

    useEffect(()=>{
        return ()=>{
            abort()
        }
    },[abort])

    useKeyboard((key)=>{
      if(key.name==='escape' && isTopLayer("base") && streaming.status==="streaming"){
        key.preventDefault()
        interrupt()
      }
    })

    return (
        <SessionShell onSubmit={(text)=> submit({
            userText:text,
            mode:mode,
            model:model,
        })
         }
        loading={streaming.status==="streaming"}
        interruptable={streaming.status==="streaming"}
        >
            {
                messages.map(msg=>(
                    <ChatMessage key={msg.id} msg={msg} />
                ))
            }
            {
            streaming.status==="streaming" && streaming.parts.length>0 && 
            <BotMessage
            parts={streaming.parts}
            model={streaming.model}
            mode={streaming.mode}
            streaming
            />            
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
      <SessionChat key={session.id} session={session}/>
    )
}