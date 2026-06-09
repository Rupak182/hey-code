import { useLocation, useNavigate } from "react-router"
import { useTheme } from "../components/providers/theme"
import { useEffect } from "react"
import { SessionShell } from "../components/session-shell"
import { UserMessage } from "../components/messages/user-message"
import { BotMessage } from "../components/messages/bot-message"
import { ErrorMessage } from "../components/messages/error-message"



export function NewSession(){
    const navigate= useNavigate()
    const location = useLocation()
    const {colors}= useTheme()
    const state  =location.state as {message?:string} |null
    

    useEffect(()=>{
        if(!state?.message){
            navigate("/",{replace:true})
        }
    },[navigate,state])

    if(!state?.message){
        return null
    }
    
    return (
     <SessionShell onSubmit={()=>{}} inputDisabled loading >
        <UserMessage message={state.message}/>
        <BotMessage content="This is a sample bot response to demonstate the message layout." model="gpt-5"/>
     <ErrorMessage message="This is a sample error message" />
     </SessionShell>
    )
}