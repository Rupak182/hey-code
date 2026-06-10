import { useRef, useEffect, type ReactNode } from "react"
import { InputBar } from "./input-bar"
import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { Spinner } from "./spinner"


type Props = {
    children?: ReactNode
    onSubmit: (text: string) => void
    inputDisabled?: boolean
    loading?: boolean
}

export function SessionShell({ children, onSubmit, inputDisabled = false, loading = false }: Props) {
    // const scrollRef = useRef<ScrollBoxRenderable>(null)

    // useEffect(() => {
    //     const scrollbox = scrollRef.current
    //     if (scrollbox) {
    //         scrollbox.scrollTop = scrollbox.scrollHeight
    //     }
    // }, [children])

    return (
        <box
            flexGrow={1}
            flexDirection="column"
            width="100%"
            height="100%"
            paddingX={1}
            paddingY={2}
            gap={2}
        >
            <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
                <box gap={1} >
                    {children}
                </box>
            </scrollbox>
            <box flexShrink={0}>
                <InputBar
                    onSubmit={onSubmit}
                    disabled={inputDisabled}
                />
            </box>
            <box
                flexShrink={0}
                flexDirection="row"
                justifyContent="space-between"
                width="100%"
                height={1}
                paddingLeft={1}
                gap={2}>
                <box flexDirection="row" alignItems="center" gap={2}>
                    {
                        loading?(
                            <Spinner/>
                        ):null
                    }
                </box>
                <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
                    <text>tab</text>
                    <text attributes={TextAttributes.DIM}>agents</text>
                </box>
            </box>
        </box>
    )
}