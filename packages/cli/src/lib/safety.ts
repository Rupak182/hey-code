import { Mode, toolInputSchemas } from '@heycode/shared';
import { z } from 'zod';

export type ApprovalPolicy = 'YOLO' | 'AUTO';

export enum ApprovalDecision {
    APPROVED = 'approved',
    REJECTED = 'rejected',
    NEEDS_CONFIRMATION = 'needs_confirmation'
}

// Map tool inputs to their strongly-typed TS shapes
export type ToolInputMap = {
    [K in keyof typeof toolInputSchemas]: z.infer<typeof toolInputSchemas[K]>;
};

export interface ApprovalContext<T extends keyof ToolInputMap> {
    toolName: T;
    input: ToolInputMap[T];
    mode: Mode;
    policy: ApprovalPolicy;
}

export const DANGEROUS_PATTERNS = [
    // File system destruction
    /rm\s+(-rf?|--recursive)\s+[\/~]/i,
    /rm\s+-rf?\s+\*/i,
    /rmdir\s+[\/~]/i,
    // Disk operations
    /dd\s+if=/i,
    /mkfs/i,
    /fdisk/i,
    /parted/i,
    // System control
    /shutdown/i,
    /reboot/i,
    /halt/i,
    /poweroff/i,
    /init\s+[06]/i,
    // Permission changes on root
    /chmod\s+(-R\s+)?777\s+[\/~]/i,
    /chown\s+-R\s+.*\s+[\/~]/i,
    // Network exposure
    /nc\s+-l/i,
    /netcat\s+-l/i,
    // Code execution from network
    /curl\s+.*\|\s*(bash|sh)/i,
    /wget\s+.*\|\s*(bash|sh)/i,
    // Fork bomb
    /:\(\)\s*\{\s*:\|:&\s*\}\s*;/i
];

export const SAFE_PATTERNS = [
    // Information commands
    /^(ls|dir|pwd|cd|echo|cat|head|tail|less|more|wc)(\s|$)/i,
    /^(find|locate|which|whereis|file|stat)(\s|$)/i,
    // Development tools (read-only)
    /^git\s+(status|log|diff|show|branch|remote|tag)(\s|$)/i,
    /^(npm|yarn|pnpm)\s+(list|ls|outdated)(\s|$)/i,
    /^pip\s+(list|show|freeze)(\s|$)/i,
    /^cargo\s+(tree|search)(\s|$)/i,
    // Text processing (usually safe)
    /^(grep|awk|sed|cut|sort|uniq|tr|diff|comm)(\s|$)/i,
    // System info
    /^(date|cal|uptime|whoami|id|groups|hostname|uname)(\s|$)/i,
    /^(env|printenv|set)$/i,
    // Process info
    /^(ps|top|htop|pgrep)(\s|$)/i
];

/**
 * Type-safely evaluates if a tool call requires confirmation.
 */
export function checkApproval<T extends keyof ToolInputMap>({
    toolName,
    input,
    mode,
    policy = 'AUTO'
}: ApprovalContext<T>): ApprovalDecision {
    if (policy === 'YOLO') return ApprovalDecision.APPROVED;

    // Mode.PLAN is read-only and always auto-approved
    if (mode === Mode.PLAN) return ApprovalDecision.APPROVED;

    // In AUTO mode, file writes/edits in the workspace are natively auto-approved
    if (toolName === 'writeFile' || toolName === 'editFile') {
        return ApprovalDecision.APPROVED;
    }

    // Command execution
    if (toolName === 'bash') {
        const bashInput = input as ToolInputMap['bash'];
        const command = bashInput.command;

        const isDangerous = DANGEROUS_PATTERNS.some(pat => pat.test(command));
        if (isDangerous) return ApprovalDecision.REJECTED;

        const isSafe = SAFE_PATTERNS.some(pat => pat.test(command));
        if (isSafe) return ApprovalDecision.APPROVED;

        return ApprovalDecision.NEEDS_CONFIRMATION;
    }

    // Default: read-only tools are approved
    return ApprovalDecision.APPROVED;
}

/**
 * Returns a user-friendly description for the confirmation UI.
 */
export function getToolDescription<T extends keyof ToolInputMap>(
    toolName: T,
    input: ToolInputMap[T]
): string {
    switch (toolName) {
        case 'webSearch': {
            const searchInput = input as ToolInputMap['webSearch'];
            return `Search the web for: "${searchInput.query}"`;
        }
        case 'bash': {
            const bashInput = input as ToolInputMap['bash'];
            return bashInput.description || `Execute bash command: ${bashInput.command}`;
        }
        case 'writeFile': {
            const writeInput = input as ToolInputMap['writeFile'];
            return `Create or overwrite file: ${writeInput.path}`;
        }
        case 'editFile': {
            const editInput = input as ToolInputMap['editFile'];
            return `Edit lines in file: ${editInput.path}`;
        }
        default:
            return `Run tool: ${String(toolName)}`;
    }
}
