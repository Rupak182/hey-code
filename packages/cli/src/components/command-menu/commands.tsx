import { SUPPORTED_CHAT_MODELS } from "@heycode/shared";
import { AgentsDialogContent, ModelsDialogContent, SessionsDialogContent, ThemeDialogContent } from "../dialogs";
import type { Command, CommandContext } from "./types";
import { performLogin } from "../../lib/oauth";
import { clearAuth } from "../../lib/auth";
import { handleCompaction } from "../../lib/compaction";


export const COMMANDS: Command[] = [
    {
        name: "new",
        description: "Start a new conversation",
        value: "/new",
        action:(ctx)=>{
            ctx.navigate("/")
        }
    },

    {
        name: "agents",
        description: "Switch agents",
        value: "/agents",
        action:(ctx)=>{
            ctx.dialog.open({
                title:"Switch Agents",
                children:<AgentsDialogContent currentMode={ctx.mode} onSelectMode={ctx.setMode}/>
            })
        }
    },

    {
        name: "models",
        description: "Select AI model",
        value: "/models",
         action:(ctx)=>{
           ctx.dialog.open({
                title:"Select Model",
                children:<ModelsDialogContent models={SUPPORTED_CHAT_MODELS.map(m => m.id)} onSelectModel={ctx.setModel}/>
        })
        }
    },

     {
        name: "sessions",
        description: "Browse past sessions",
        value: "/sessions",
          action:(ctx)=>{
            ctx.dialog.open({
                title:"Sessions",
                children: <SessionsDialogContent/>
            })
        }
    },


    {
        name: "theme",
        description: "Change color theme",
        value: "/theme",
        action:(ctx)=>{
            ctx.dialog.open({
                title:"Select Theme",
                children: <ThemeDialogContent/>
            })
        }
    },


    {
        name: "login",
        description: "Sign in with your browser",
        value: "/login",
        action:async(ctx)=>{
            ctx.toast.show({message:"Opening login page in browser..."})
            try{
                await performLogin()
                ctx.toast.show({'variant':'success','message':'Signed in'})

            }catch(error){
                const message= error instanceof Error ?error.message:"Login failed or timed out"
                ctx.toast.show({'variant':'error','message':message})

            }
        }
    },


    {
        name: "logout",
        description: "signout of your account",
        value: "/logout",
        action:(ctx)=>{
            clearAuth()
            ctx.toast.show({message:"Signing out..."})
        }
    },
 {
        name: "upgrade",
        description: "Buy more credits",
        value: "/upgrade",
        action:(ctx)=>{
            ctx.toast.show({message:"Feature Disabled For Now"})
        }
    },
    
    
    {
        name: "usage",
        description: "Open billing portal in your browser",
        value: "/usage",
        action:(ctx)=>{
            ctx.toast.show({message:"Feature Disabled For Now"})
        }
    },
    
    {
        name: "compact",
        description: "Manually compact conversation history",
        value: "/compact",
        action: handleCompaction
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



