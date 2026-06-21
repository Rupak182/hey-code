import { spawn } from "child_process"
import { resolve } from "path"
import { mkdir, readFile, writeFile } from "fs/promises"

const CWD = process.env.HEYCODE_CWD || process.cwd()
const GIT_DIR = resolve(CWD, ".heycode/git")
const WORK_TREE = CWD

let hasGitCache: boolean | null = null

export async function isGitInstalled(): Promise<boolean> {
    if (hasGitCache !== null) return hasGitCache
    return new Promise((r) => {
        const proc = spawn("git", ["--version"])
        proc.on("close", (code) => {
            hasGitCache = code === 0
            r(hasGitCache)
        })
        proc.on("error", () => {
            hasGitCache = false
            r(false)
        })
    })
}

function runGit(args: string[]): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
        // Enforce custom git-dir and work-tree to keep it separate from the developer's main .git
        const gitArgs = ["--git-dir", GIT_DIR, "--work-tree", WORK_TREE, ...args]
        const proc = spawn("git", gitArgs, { cwd: CWD })
        let stdout = ""
        let stderr = ""

        proc.stdout.on("data", (data) => { stdout += data.toString() })
        proc.stderr.on("data", (data) => { stderr += data.toString() })

        proc.on("close", (code) => {
            if (code === 0) resolvePromise(stdout.trim())
            else rejectPromise(new Error(stderr.trim() || `git exited with code ${code}`))
        })
    })
}

export async function isGitRepo(): Promise<boolean> {
    try {
        if (!(await isGitInstalled())) return false
        await runGit(["rev-parse", "--is-inside-work-tree"])
        return true
    } catch {
        return false
    }
}

export async function initGitRepo(): Promise<void> {
    if (!(await isGitInstalled())) return
    
    // 1. Create .heycode/ directory
    await mkdir(resolve(CWD, ".heycode"), { recursive: true })

    // 2. Automatically ignore .heycode/ in the project's primary .gitignore
    const gitignorePath = resolve(CWD, ".gitignore")
    try {
        const content = await readFile(gitignorePath, "utf-8")
        if (!content.includes(".heycode/")) {
            await writeFile(gitignorePath, content + "\n# HeyCode shadow version control\n.heycode/\n", "utf-8")
        }
    } catch {
        await writeFile(gitignorePath, "# HeyCode shadow version control\n.heycode/\n", "utf-8")
    }

    // 3. Initialize the shadow git repo
    await runGit(["init"])

    // 4. Write repo-specific exclude rules to prevent tracking main .git or .heycode metadata
    const excludePath = resolve(GIT_DIR, "info/exclude")
    await mkdir(resolve(GIT_DIR, "info"), { recursive: true })
    await writeFile(excludePath, ".git/\n.heycode/\n", "utf-8")

    try {
        await runGit(["rev-parse", "HEAD"])  // check if there is already a commit
    } catch {
        await runGit(["add", "-A"])
        await runGit(["commit", "-m", "Initial commit by HeyCode", "--allow-empty", "--no-verify"])
    }
}

export async function commitForMessage(messageId: string): Promise<void> {
    try {
        if (!(await isGitRepo())) {
            await initGitRepo()
        }
        if (!(await isGitRepo())) return
        await runGit(["add", "-A"])
        await runGit(["commit", "-m", `heycode: message ${messageId}`, "--allow-empty", "--no-verify"])
    } catch (err) {
        console.error("Git commit failed:", err)
    }
}

export async function getCommitForMessage(messageId: string): Promise<string | null> {
    try {
        if (!(await isGitRepo())) return null
        const hash = await runGit(["log", `--grep=heycode: message ${messageId}`, "-n", "1", "--format=%H"])
        return hash || null
    } catch {
        return null
    }
}

export async function hasUncommittedChanges(): Promise<boolean> {
    try {
        if (!(await isGitRepo())) return false
        const statusOutput = await runGit(["status", "--porcelain"])
        return statusOutput.trim().length > 0
    } catch {
        return false
    }
}

export async function revertToMessage(messageId: string): Promise<void> {
    const hash = await getCommitForMessage(messageId)
    if (!hash) {
        throw new Error(`No git checkpoint found for message ${messageId}`)
    }
    await runGit(["reset", "--hard", hash])
}

export async function forkSessionBranch(messageId: string, forkNumber: number, sessionTitle: string): Promise<string> {
    const hash = await getCommitForMessage(messageId)
    if (!hash) {
        throw new Error(`No git checkpoint found for message ${messageId}`)
    }
    const slugified = sessionTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    const branchName = `ai/heycode/${slugified}-fork-${forkNumber}`
    await runGit(["checkout", "-b", branchName, hash])
    return branchName
}

export async function switchSession(sessionId: string): Promise<void> {
    try {
        if (!(await isGitRepo())) return
        const branchName = `ai/heycode/session-${sessionId}`
        
        // Check if branch exists, otherwise create it
        try {
            await runGit(["show-ref", "--verify", `refs/heads/${branchName}`])
            await runGit(["checkout", branchName])
        } catch {
            await runGit(["checkout", "-b", branchName])
        }
    } catch (err) {
        console.error("Failed to switch session branch:", err)
    }
}
