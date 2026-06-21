import { TextAttributes } from "@opentui/core"
import { useTheme } from "../providers/theme"
import  { Mode } from "@heycode/shared"


type Props={
    message:string,
    mode:Mode,
    onAction?: () => void,
}

export function UserMessage({message,mode,onAction}:Props){
    const {colors}=useTheme()

    return(
     <box width="100%" alignItems="center" onMouseDown={onAction}>
        <box border={["left"]} 
        borderColor={mode===Mode.PLAN ?colors.planMode:colors.primary}
        width='100%'
        >
            <box 
             justifyContent="center"
             paddingX={2}
             paddingY={1}
             backgroundColor={colors.surface}
             width="100%"
            >
                <text>{message}</text>
            </box>

        </box>
     </box>
    )
    

}