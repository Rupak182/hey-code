import type { LanguageModelUsage, UIMessage } from "ai";
import { generateText, generateId } from "ai";
import type { ResolvedModel } from "./models";
import type { Mode, ToolContracts } from "@heycode/shared";
import type { InferUITools } from "ai";

export type ChatMessageMetadata = {
    mode?: Mode;
    model?: string;
    durationMs?: number;
    usage?: LanguageModelUsage;
    compacted?: boolean;
    systemRestoration?: boolean;
};

export type HeyCodeUIMessage = UIMessage<ChatMessageMetadata, never, InferUITools<ToolContracts>>;

export const COMPACTION_TOKEN_THRESHOLD = Number(process.env.COMPACTION_TOKEN_THRESHOLD) || 20000;

export function getApproxTotalTokens(messages: HeyCodeUIMessage[]): number {
    // Look for the last active assistant message with usage metadata
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.metadata?.compacted) {
            continue;
        }
        const usage = messages[i]?.metadata?.usage;
        if (usage?.totalTokens) {
            return usage.totalTokens;
        }
    }

    // Fallback: estimate based on characters of active messages
    let totalChars = 0;
    for (const msg of messages) {
        if (msg.metadata?.compacted) {
            continue;
        }
        if (msg.parts) {
            for (const part of msg.parts) {
                if (part.type === 'text' || part.type === 'reasoning') {
                    if ('text' in part) {
                        totalChars += (part.text || '').length;
                    }
                } else if ('input' in part) {
                    totalChars += JSON.stringify(part.input || {}).length;
                    if ('output' in part && part.output != null) {
                        totalChars += JSON.stringify(part.output || {}).length;
                    } else if ('errorText' in part && part.errorText != null) {
                        totalChars += (part.errorText || '').length;
                    }
                }
            }
        }
    }
    return Math.ceil(totalChars / 4);
}

export function shouldCompress(messages: HeyCodeUIMessage[]): boolean {
    // Only count active messages that actually have content parts
    const activeMessages = messages.filter(
        msg => !msg.metadata?.compacted && msg.parts && msg.parts.length > 0
    );
    if (activeMessages.length < 3) return false;

    const approxTokens = getApproxTotalTokens(messages);
    return approxTokens >= COMPACTION_TOKEN_THRESHOLD;
}

export function getCompressionPrompt(): string {
    return `Provide a detailed continuation prompt for resuming this work. The new session will NOT have access to our conversation history.

IMPORTANT: Structure your response EXACTLY as follows:

## ORIGINAL GOAL
[State the user's original request/goal in one paragraph]

## COMPLETED ACTIONS (DO NOT REPEAT THESE)
[List specific actions that are DONE and should NOT be repeated. Be specific with file paths, function names, changes made. Use bullet points.]

## CURRENT STATE
[Describe the current state of the codebase/project after the completed actions. What files exist, what has been modified, what is the current status.]

## IN-PROGRESS WORK
[What was being worked on when the context limit was hit? Any partial changes?]

## REMAINING TASKS
[What still needs to be done to complete the original goal? Be specific.]

## NEXT STEP
[What is the immediate next action to take? Be very specific - this is what the agent should do first.]

## KEY CONTEXT
[Any important decisions, constraints, user preferences, technical context or assumptions that must persist.]

Be extremely specific with file paths and function names. The goal is to allow seamless continuation without redoing any completed work.`;
}

export function formatHistoryForCompaction(messages: HeyCodeUIMessage[]): string {
    const output: string[] = [];

    for (const msg of messages) {
        if (msg.role === 'system' || msg.metadata?.compacted) {
            continue;
        }

        const roleHeader = msg.role === 'assistant' ? 'Assistant:' : 'User:';
        const messageLines: string[] = [];

        if (msg.parts) {
            for (const part of msg.parts) {
                if (part.type === 'text') {
                    if ('text' in part) {
                        const text = part.text || '';
                        const truncated = text.length > 3000 ? text.slice(0, 3000) + "\n... [response truncated]" : text;
                        messageLines.push(truncated);
                    }
                } else if (part.type === 'reasoning') {
                    // Skip reasoning parts to keep compaction log small and focused
                } else if ('input' in part) {
                    const toolName = part.type === 'dynamic-tool' && 'toolName' in part
                        ? String(part.toolName || 'unknown')
                        : part.type.startsWith('tool-')
                            ? part.type.slice('tool-'.length)
                            : part.type;
                    const argsStr = JSON.stringify(part.input || {});
                    let args = argsStr;
                    if (args.length > 500) {
                        args = args.slice(0, 500) + "...(truncated)";
                    }
                    messageLines.push(`[Tool Call: ${toolName}(${args})]`);

                    if ('output' in part && part.output != null) {
                        const outputObj = part.output || {};
                        const resultStr = typeof outputObj === 'object' && outputObj && 'content' in outputObj && typeof outputObj.content === 'string'
                            ? outputObj.content
                            : JSON.stringify(outputObj);
                        const truncated = resultStr.length > 2000 ? resultStr.slice(0, 2000) + "...(truncated)" : resultStr;
                        messageLines.push(`[Tool Result]:\n${truncated}`);
                    } else if ('errorText' in part && part.errorText != null) {
                        messageLines.push(`[Tool Error]: ${part.errorText || 'unknown error'}`);
                    }
                }
            }
        }

        if (messageLines.length > 0) {
            output.push(`${roleHeader}\n${messageLines.join("\n")}`);
        }
    }

    return output.join("\n\n");
}

export async function compressHistory(
    messages: HeyCodeUIMessage[],
    resolvedModel: ResolvedModel
): Promise<string> {
    const formattedHistory = formatHistoryForCompaction(messages);

    const { text } = await generateText({
        model: resolvedModel.model,
        system: getCompressionPrompt(),
        messages: [
            {
                role: "user",
                content: formattedHistory
            }
        ],
        providerOptions: resolvedModel.providerOptions ? {
            [resolvedModel.provider]: resolvedModel.providerOptions
        } : undefined,
    });

    return text;
}

export async function performCompaction(
    messages: HeyCodeUIMessage[],
    resolvedModel: ResolvedModel,
    mode: Mode,
    modelId: string
): Promise<HeyCodeUIMessage[] | null> {
    const summary = await compressHistory(messages, resolvedModel)
    if (!summary) {
        return null
    }

    const continuationContent = `# Context Restoration (Previous Session Compacted)

The previous conversation was compacted (either automatically due to context limits or manually by the user). Below is a detailed summary of the work done so far. 

**CRITICAL: Actions listed under "COMPLETED ACTIONS" are already done. DO NOT repeat them.**

---

${summary}

---

Resume work from where we left off. Focus ONLY on the remaining tasks.`

    // Flag all existing messages in the history as compacted
    const updatedPrevious = messages.map(msg => ({
        ...msg,
        metadata: {
            ...msg.metadata,
            compacted: true
        }
    }))

    const summaryMessage: HeyCodeUIMessage = {
        id: generateId(),
        role: 'user',
        parts: [
            {
                type: 'text',
                text: continuationContent
            }
        ],
        metadata: {
            mode,
            model: modelId,
            systemRestoration: true
        }
    }

    return [...updatedPrevious, summaryMessage]
}
