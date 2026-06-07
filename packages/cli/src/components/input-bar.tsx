import type { KeyBinding } from "@opentui/core";
import { StatusBar } from "./status-bar";

type Props = {
    onSubmit: (text: string) => void;
    disabled?: boolean;
}


export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
    { name: "return", meta: true, action: "newline" },
    { name: "enter", meta: true, action: "newline" },
    { name: "return", action: "submit" },
    { name: "enter", action: "submit" },
]


export function InputBar({ onSubmit, disabled }: Props) {
    return (
        <box width="100%" alignItems="center">
            <box
                border={['left']}
                borderColor='cyan'
                width="100%"
            >
                <box position="relative"
                    justifyContent="center"
                    paddingX={2}
                    paddingY={1}
                    backgroundColor="#1A1A28"
                    width="100%"
                    gap={1}
                >
                    <textarea
                    keyBindings={TEXTAREA_KEY_BINDINGS}
                        focused={!disabled}
                        placeholder={`Ask anything... "Fix a bug in the database`}
                    />
                    <StatusBar />
                </box>
            </box>
        </box>
    )
}