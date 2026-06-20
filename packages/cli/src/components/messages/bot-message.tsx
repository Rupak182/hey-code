import { Text, TextAttributes } from "@opentui/core"
import { useTheme } from "../providers/theme"
import { Mode } from "@heycode/shared"
import type { Message } from "../../hooks/useChat"
import prettyMs from "pretty-ms"

type ClientMesagePart = Message["parts"][number]
type ClientToolCallPart = Extract<ClientMesagePart, { type: `tool-${string}` | 'dynamic-tool' }>


type Props = {
    parts: ClientMesagePart[]
    model: string,
    mode: Mode,
    durationMs?: number
    streaming?: boolean,
}

function formatToolName(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase())
}


function isToolPart(part: ClientMesagePart): part is ClientToolCallPart {
    return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

function formatToolArgs(tc: ClientToolCallPart): string {
    if (!("input" in tc) || tc.input === null)
        return ""
    if (typeof tc.input !== 'object')
        return String(tc.input)

    const toolName = tc.type === "dynamic-tool" ? tc.toolName : tc.type.slice("tool-".length)
    if (toolName === "writeFile" || toolName === "editFile") {
        const input = tc.input as Record<string, unknown>
        return typeof input?.path === "string" ? input.path : ""
    }

    return Object.values(tc.input).map(String).join(" ")
}

type PartGroup = {
    type: ClientMesagePart['type']
    parts: ClientMesagePart[],
    key: string
}

function groupConsecutiveParts(parts: ClientMesagePart[]): PartGroup[] {
    const groups: PartGroup[] = []
    const filteredParts = parts.filter(part => part.type !== 'step-start')

    for (let i = 0; i < filteredParts.length; i++) {
        const part = filteredParts[i]!
        const lastGroup = groups[groups.length - 1]

        if (lastGroup && lastGroup.type === part.type) {
            lastGroup.parts.push(part)
        } else {
            const key = isToolPart(part) ? `group-tc-${part.toolCallId}` : `group-${part.type}-${i}`
            groups.push({
                type: part.type,
                parts: [part],
                key
            })
        }
    }

    return groups
}

export function BotMessage({ parts, model, mode, durationMs, streaming = false }: Props) {
    const { colors } = useTheme()

    return (
        <box width="100%" alignItems="center">
            {
                groupConsecutiveParts(parts).map((group, i) => (
                    <box key={group.key} width="100%" paddingTop={i == 0 ? 0 : 1}>
                        {
                            group.parts.map((part, j) => {
                                if (part.type === "reasoning") {
                                    return (
                                        <box key={`reasoning-${j}`}
                                            border={["left"]}
                                            borderColor={colors.thinkingBorder}
                                            width="100%"
                                            paddingX={2}
                                        >
                                            <text attributes={TextAttributes.DIM} fg={colors.thinking}>
                                                <em>Thinking:</em>
                                                {part.text}
                                            </text>
                                        </box>
                                    )
                                }

                                if (isToolPart(part)) {
                                    const toolName = part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length)
                                    
                                    const resultObj = (part.state === "output-available" && "output" in part && part.output && typeof part.output === "object") ? part.output as Record<string, any> : null
                                    const hasDiff = resultObj && resultObj.success && typeof resultObj.diff === "string"

                                    return (
                                        <box
                                            key={part.toolCallId}
                                            border={["left"]}
                                            borderColor={colors.thinkingBorder}
                                            width="100%"
                                            paddingX={2}
                                            flexDirection="column"
                                            gap={hasDiff ? 1 : 0}
                                        >
                                            <text attributes={TextAttributes.DIM}>
                                                <em fg={colors.info}>{formatToolName(toolName)} </em>
                                                {formatToolArgs(part)}
                                                {part.state !== "output-available" && part.state !== "output-error" ? "..." : ""}
                                                {part.state === "output-error" ? ` (Error: ${part.errorText})` : ""}
                                            </text>

                                            {hasDiff && (
                                                <box border={true} borderStyle="single" borderColor={colors.thinkingBorder} padding={1} width="100%">
                                                    <diff
                                                        diff={resultObj.diff}
                                                        filetype={resultObj.path?.split('.').pop() || ''}
                                                        view="unified"
                                                        showLineNumbers={true}
                                                        addedBg="#1B2B24"
                                                        removedBg="#2D1C1E"
                                                        addedContentBg="#2A4535"
                                                        removedContentBg="#4C2B2E"
                                                    />
                                                </box>
                                            )}
                                        </box>
                                    )
                                }

                                if (part.type === 'text') {
                                    return (
                                        <box key={`text-${j}`} paddingX={3} width="100%">
                                            <text>{part.text}</text>
                                        </box>
                                    )
                                }

                                return null
                            })
                        }
                    </box>
                ))
            }

            <box paddingX={3} paddingY={1} gap={1} width="100%">
                <box flexDirection="row" gap={2}>
                    <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>●</text>
                    <box flexDirection="row" gap={1}>
                        <text>{mode === Mode.PLAN ? `Plan` : `Build`}</text>
                        <text attributes={TextAttributes.DIM} fg={colors.dimSeperator}>&gt;</text>
                        <text attributes={TextAttributes.DIM}>{model}</text>
                        {
                            (durationMs != null) && (
                                <>
                                    <text attributes={TextAttributes.DIM} fg={colors.dimSeperator}>&gt;</text>
                                    <text attributes={TextAttributes.DIM}>{prettyMs(durationMs)}</text>
                                </>
                            )
                        }
                    </box>
                </box>
            </box>
        </box>
    )
}
