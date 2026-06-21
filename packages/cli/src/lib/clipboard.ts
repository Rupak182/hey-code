import { spawn } from "child_process"
import { platform } from "os"

export function copyToClipboard(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const osPlatform = platform()
        let command: string
        let args: string[] = []

        if (osPlatform === "darwin") {
            command = "pbcopy"
        } else if (osPlatform === "win32") {
            command = "clip"
        } else {
            // Linux / BSD - try wl-copy (Wayland), then xclip (X11), then xsel (X11 alternative)
            command = "sh"
            args = ["-c", "command -v wl-copy >/dev/null 2>&1 && wl-copy || (command -v xclip >/dev/null 2>&1 && xclip -selection clipboard) || (command -v xsel >/dev/null 2>&1 && xsel --clipboard --input) || exit 1"]
        }

        const proc = spawn(command, args)

        proc.on("error", (err) => {
            reject(new Error(`Failed to copy to clipboard: ${err.message}`))
        })

        proc.on("close", (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`No clipboard utility found. Please install wl-clipboard, xclip, or xsel.`))
            }
        })

        if (proc.stdin) {
            proc.stdin.write(text)
            proc.stdin.end()
        } else {
            reject(new Error("Failed to open stdin stream for clipboard utility"))
        }
    })
}
