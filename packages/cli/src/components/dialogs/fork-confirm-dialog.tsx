import { TextAttributes } from "@opentui/core"
import { useTheme } from "../providers/theme"
import { useDialog } from "../providers/dialog"

interface ForkConfirmDialogProps {
    onConfirm: (decision: 'cancel' | 'force') => void
}

export function ForkConfirmDialog({ onConfirm }: ForkConfirmDialogProps) {
    const dialog = useDialog()

    const options = [
        { name: "Cancel", action: "cancel" as const, description: "Abort fork" },
        { name: "Force Fork", action: "force" as const, description: "Discard uncommitted changes and fork" },
    ]

    const warningYellow = "#EAB308"

    return (
        <box 
            flexDirection="column" 
            border={["left"]} 
            borderColor={warningYellow} 
            paddingLeft={2} 
            gap={1}
            marginTop={1}
            marginBottom={1}
            width="100%"
        >
            <box flexDirection="row" gap={1}>
                <text fg={warningYellow} attributes={TextAttributes.BOLD}>⚠</text>
                <text fg="white" attributes={TextAttributes.BOLD}>Uncommitted changes detected</text>
            </box>
            
            <text fg="white" attributes={TextAttributes.DIM}>
                Forking will permanently overwrite all uncommitted modifications on disk.
            </text>
            
            <box marginTop={1} height={1}>
                <tab-select
                    options={options}
                    tabWidth={20}
                    showUnderline={false}
                    focused={true}
                    selectedBackgroundColor={warningYellow}
                    selectedTextColor="black"
                    onSelect={(index: number) => {
                        const selection = options[index]
                        if (selection) {
                            onConfirm(selection.action)
                            dialog.close()
                        }
                    }}
                />
            </box>
        </box>
    )
}
