import { TextAttributes } from "@opentui/core";
import { useTheme } from "./providers/theme";

interface PermissionPromptProps {
    toolName: string;
    description: string;
    command?: string;
    onResolve: (decision: 'allow' | 'reject') => void;
}

export function PermissionPrompt({ toolName, description, command, onResolve }: PermissionPromptProps) {
    const { colors } = useTheme();

    const options = [
        { name: "Allow", action: "allow" as const, description: "" },
        { name: "Reject", action: "reject" as const, description: "" },
    ];

    const warningYellow = "#EAB308"; // Sleek, modern yellow/orange

    return (
        <box 
            flexDirection="column" 
            border={["left"]} 
            borderColor={warningYellow} 
            paddingLeft={2} 
            gap={1}
            marginTop={1}
            marginBottom={1}
        >
            <box flexDirection="row" gap={1}>
                <text fg={warningYellow} attributes={TextAttributes.BOLD}>⚠</text>
                <text fg="white" attributes={TextAttributes.BOLD}>Permission required</text>
            </box>
            
            <text fg="white" attributes={TextAttributes.DIM}># {description}</text>
            
            {command && (
                <box paddingLeft={1} marginTop={1} >
                    <text fg="white">$ {command}</text>
                </box>
            )}
            
            <box marginTop={1} height={1}>
                <tab-select
                    options={options}
                    tabWidth={16}
                    showUnderline={false}
                    focused={true}
                    selectedBackgroundColor={warningYellow}
                    selectedTextColor="black"
                    onSelect={(index: number) => {
                        const selection = options[index];
                        if (selection) {
                            onResolve(selection.action);
                        }
                    }}
                />
            </box>

           
        </box>
    );
}
