import { Text, TextAttributes } from "@opentui/core"
import { useTheme } from "../providers/theme"
import type { ClientMesagePart } from "../../hooks/useChat"
import  { Mode } from "@heycode/database/enums"


type Props={
    parts:ClientMesagePart[]
    model:string,
    mode:Mode,
    duration?:string
    streaming?:boolean
    
}

export function BotMessage({parts,model,mode,duration,streaming=false}:Props){
    const {colors}=useTheme()

    const text= parts.filter((p)=>p.type==='text').map((p)=>p.text).join('')

    return(
     <box width="100%" alignItems="center">
       <box paddingY={1} width="100%">
            <box paddingX={3} width="100%">
                <text>{text}</text>
            </box>
       </box>

       <box flexDirection="row" gap={1} width="100%">
            <text fg={mode===Mode.PLAN ? colors.planMode: colors.primary}>•</text>
            <box flexDirection="row" gap={1}>
                <text>{mode===Mode.PLAN ? 'Plan' : 'Build'}</text>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeperator}>&gt;</text>
                <text attributes={TextAttributes.DIM}>{model}</text>
                {
                    duration &&(
                        <>
                            <text attributes={TextAttributes.DIM} fg={colors.dimSeperator}>&gt;</text>
                            <text attributes={TextAttributes.DIM}>{duration}</text>
                        </>
                    )
                }
            </box>
       </box>
     </box>
    )
    

}