import { useLocation, useNavigate } from "react-router"
import { useTheme } from "../components/providers/theme"
import { useEffect, useMemo, useRef } from "react"
import { SessionShell } from "../components/session-shell"
import { UserMessage } from "../components/messages/user-message"
import {z} from "zod"
import { useToast } from "../components/providers/toast"
import { apiClient } from "../lib/api-client"
import { DEFAULT_CHAT_MODEL_ID } from "@heycode/shared"
import { getErrorMessage } from "../lib/http-errors"


const newSessionStateSchema= z.object({
    message:z.string()
})



export function NewSession() {
    const navigate = useNavigate()
    const location = useLocation()
    const { colors } = useTheme()
    const toast = useToast()
    const hasStartedRef= useRef(false)

    const state = useMemo(()=>{
        const parsed= newSessionStateSchema.safeParse(location.state)
        if(!parsed.success){
            return null
        }
        return parsed.data
    },[location.state])


    useEffect(() => {
        if (!state) {
            navigate("/", { replace: true })
        }
    }, [navigate, state])


    useEffect(()=>{
        if(!state || hasStartedRef.current){
            return
        }
        hasStartedRef.current=true

        let ignore =false

        const createSession = async()=>{
            try{
                const res= await apiClient.sessions.$post({
                    json:{
                        title:state.message.slice(0,100),
                        cwd:process.cwd(),
                        initialMessage:{
                            role:'USER',
                            content:state.message,
                            mode:'BUILD',
                            model:DEFAULT_CHAT_MODEL_ID,
                        }
                    }
                })

                if(ignore)
                    return

                if(!res.ok){
                    throw new Error(await getErrorMessage(res))
                }

                const session =await res.json()
                navigate(`/sessions/${session.id}`, { replace: true,state:{session} })
                
            }
            catch(error){
                if(ignore)
                    return

                toast.show({
                    variant:"error",   
                    message:error instanceof Error?error.message : "Failed to create session",
                }
                )
                navigate("/",{replace:true})
            }
        }
        createSession()
        return(()=>{
            ignore=true
        })
    })

    if (!state) {
        return null
    }

    return (
        <SessionShell onSubmit={() => { }} inputDisabled loading >
            <UserMessage message={state.message} />
        </SessionShell>
    )
}