import { useCallback } from "react"
import { useDialog } from "../providers/dialog"
import { DialogSearchList } from "../dialog-search-list"
import { Mode } from "@heycode/database/enums"
import type { SupportedChatModelId } from "@heycode/shared"



type ModelsDialogContentProps={
    models:SupportedChatModelId[],
    onSelectModel:(model:SupportedChatModelId)=>void,
}




export const ModelsDialogContent=({models,onSelectModel}:ModelsDialogContentProps)=>{
    const dialog= useDialog()


    const handleSelect = useCallback((modelId: SupportedChatModelId) => {
            onSelectModel(modelId)
            dialog.close()
    }, [onSelectModel, dialog])




    return (
        <DialogSearchList
        items={models}
        onSelect={handleSelect}
        onHighlight={()=>{}}
        filterFn={(modelId,query)=>modelId.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
        renderItem={(modelId,isSelected)=>(
            <text selectable={false} fg={isSelected?"black":"white"}>
            {modelId}
            </text>
        )}
        getKey={(modelId)=>modelId}
        placeholder="Search models"
        emptyText="No matching models"
        />
    )



    


}