import { COMMANDS } from "./commands"
import type { Command } from "./types";



export function getFilteredCommands(query: string): Command[] {
    if (query.length === 0) return COMMANDS;
    const lower = query.toLowerCase();
    return COMMANDS.filter((command) => command.name.toLowerCase().startsWith(lower));
}