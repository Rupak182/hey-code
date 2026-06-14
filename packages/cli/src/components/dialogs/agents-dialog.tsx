import { useCallback } from "react"
import { useDialog } from "../providers/dialog"
import { DialogSearchList } from "../dialog-search-list"
import  { Mode } from "@heycode/shared"


const AVAILABLE_MODES:Mode[] = [Mode.BUILD,Mode.PLAN]

type AgentsDialogContentProps={
    currentMode:Mode,
    onSelectMode:(mode:Mode)=>void,
}

function getModeLabel(mode:Mode){
    return mode===Mode.BUILD ?"Build": "Plan"
}


export const AgentsDialogContent=({currentMode,onSelectMode}:AgentsDialogContentProps)=>{
    const dialog= useDialog()


    const handleSelect = useCallback((nextMode: Mode) => {
            onSelectMode(nextMode)
            dialog.close()
    }, [onSelectMode, dialog])




    return (
        <DialogSearchList
        items={AVAILABLE_MODES}
        onSelect={handleSelect}
        onHighlight={()=>{}}
        filterFn={(item,query)=>getModeLabel(item).toLocaleLowerCase().includes(query.toLocaleLowerCase())}
        renderItem={(item,isSelected)=>(
            <text selectable={false} fg={isSelected?"black":"white"}>
            {item===currentMode ? "\u0020\u2022\u0020":" "}
            {getModeLabel(item)}
            </text>
        )}
        getKey={(item)=>item}
        placeholder="Search modes"
        emptyText="No matching modes"
        />
    )



    


}