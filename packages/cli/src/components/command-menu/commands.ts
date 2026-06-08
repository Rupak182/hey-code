import type { Command, CommandContext } from "./types";


export const COMMANDS: Command[] = [
    {
        name: "new",
        description: "Start a new conversation",
        value: "/new"
    },

    {
        name: "agents",
        description: "Switch agents",
        value: "/agents"
    },

    {
        name: "models",
        description: "Select AI model",
        value: "/models"
    },

     {
        name: "sessions",
        description: "Browse past sessions",
        value: "/sessions"
    },

    {
        name: "theme",
        description: "Change color theme",
        value: "/theme"
    },


    {
        name: "login",
        description: "Sign in with your browser",
        value: "/login"
    },


    {
        name: "logout",
        description: "signout of your account",
        value: "/logout"
    },
 {
        name: "upgrade",
        description: "Buy more credits",
        value: "/upgrade"
    },
    
    
    {
        name: "usage",
        description: "Open billing portal in your browser",
        value: "/usage"
    },
    
    {
        name: "exit",
        description: "Quit the application",
        value: "/exit",
        action: (ctx: CommandContext) => {
            ctx.exit();
        }
    }
]



