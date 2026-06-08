import type { Command, CommandContext } from "./types";


export const COMMANDS: Command[] = [
    {
        name: "new",
        description: "Start a new conversation",
        value: "/new",
        action:(ctx)=>{
            ctx.toast.show({message:"Starting new conversation..."})
        }
    },

    {
        name: "agents",
        description: "Switch agents",
        value: "/agents",
        action:(ctx)=>{
            ctx.toast.show({message:"Switching agents..."})
        }
    },

    {
        name: "models",
        description: "Select AI model",
        value: "/models",
        action:(ctx)=>{
            ctx.toast.show({message:"Selecting model..."})
        }
    },

     {
        name: "sessions",
        description: "Browse past sessions",
        value: "/sessions",
        action:(ctx)=>{
            ctx.toast.show({message:"Loading sessions..."})
        }
    },

    {
        name: "theme",
        description: "Change color theme",
        value: "/theme",
        action:(ctx)=>{
            ctx.toast.show({message:"Opening theme picker..."})
        }
    },


    {
        name: "login",
        description: "Sign in with your browser",
        value: "/login",
        action:(ctx)=>{
            ctx.toast.show({message:"Opening login page in browser..."})
        }
    },


    {
        name: "logout",
        description: "signout of your account",
        value: "/logout",
        action:(ctx)=>{
            ctx.toast.show({message:"Signing out..."})
        }
    },
 {
        name: "upgrade",
        description: "Buy more credits",
        value: "/upgrade",
        action:(ctx)=>{
            ctx.toast.show({message:"Opening credits checkout..."})
        }
    },
    
    
    {
        name: "usage",
        description: "Open billing portal in your browser",
        value: "/usage",
        action:(ctx)=>{
            ctx.toast.show({message:"Opening billing portal..."})
        }
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



