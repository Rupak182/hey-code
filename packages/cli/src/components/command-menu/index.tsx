import { ScrollBoxRenderable, TextAttributes } from "@opentui/core"
import { COMMANDS } from "./commands"
import { getFilteredCommands } from "./filter-command"
import type { RefObject } from "react"
import { useTheme } from "../providers/theme";
const COMMAND_COL_WIDTH = Math.max(...COMMANDS.map((command) => command.name.length)) + 4

const MAX_VISIBLE_ITEMS = 8
type CommandMenuProps = {
    query: string,
    selectedIndex: number,
    scrollRef: RefObject<ScrollBoxRenderable | null>,
    onSelect: (index: number) => void,
    onExecute: (index: number) => void,
}

export function CommandMenu({
    query,
    selectedIndex,
    scrollRef,
    onSelect,
    onExecute,
}: CommandMenuProps) {
    const filtered = getFilteredCommands(query);
    const visibleHeight = Math.min(filtered.length, MAX_VISIBLE_ITEMS)
    const {colors}=useTheme()

    if (filtered.length == 0) {
        return (
            <box paddingX={1}>
                <text attributes={TextAttributes.DIM}>
                    No matching commands
                </text>
            </box>
        )
    }

    return (
        <scrollbox ref={scrollRef} height={visibleHeight}>
            {
                filtered.map((command, index) => {
                    const isSelected = index === selectedIndex;

                    return (
                        <box key={command.value}
                            flexDirection="row"
                            paddingX={1}
                            height={1}
                            overflow="hidden"
                            backgroundColor={isSelected ? colors.selection : undefined}
                            onMouseMove={() => onSelect(index)}
                            onMouseDown={() => onExecute(index)}
                        >
                            <box flexShrink={0}>
                                <text selectable={false} width={COMMAND_COL_WIDTH} fg={isSelected ? "black" : "white"}>
                                /{command.name}
                                </text>
                            </box>
                            <box flexGrow={1}  flexShrink={1} overflow="hidden">
                                <text selectable={false} fg={isSelected ? "black" : "gray"}>
                                    {command.description}
                                </text>
                            </box>
                        </box>
                    )
                })
            }
        </scrollbox>
    )
}