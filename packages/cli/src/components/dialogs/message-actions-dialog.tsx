import { useCallback } from "react"
import { useDialog } from "../providers/dialog"
import { DialogSearchList } from "../dialog-search-list"
import { TextAttributes } from "@opentui/core"

export type MessageAction = "revert" | "fork"

interface ActionItem {
    id: MessageAction
    label: string
    description?: string
}

const actions: ActionItem[] = [
    { id: "revert", label: "Revert", description: "undo messages and file changes" },
    { id: "fork", label: "Fork", description: "create a new session" }
]

type MessageActionsDialogContentProps = {
    onSelectAction: (actionId: MessageAction) => void
}

export const MessageActionsDialogContent = ({ onSelectAction }: MessageActionsDialogContentProps) => {
    const dialog = useDialog()

    const handleSelect = useCallback((action: ActionItem) => {
        dialog.close()
        onSelectAction(action.id)
    }, [onSelectAction, dialog])


    return (
        <DialogSearchList
            items={actions}
            onSelect={handleSelect}
            filterFn={(action, query) =>
                action.label.toLowerCase().includes(query.toLowerCase()) ||
                (action.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
            }
            renderItem={(action, isSelected) => (
                <box flexDirection="row" gap={1}>
                    <text fg={isSelected ? "black" : "white"} attributes={isSelected ? undefined : TextAttributes.BOLD}>
                        {action.label}
                    </text>
                    {action.description && (
                        <text fg={isSelected ? "black" : "gray"} attributes={isSelected ? undefined : TextAttributes.DIM}>
                            {action.description}
                        </text>
                    )}
                </box>
            )}
            getKey={(action) => action.id}
            placeholder="Search"
            emptyText="No matching actions"
        />
    )
}
