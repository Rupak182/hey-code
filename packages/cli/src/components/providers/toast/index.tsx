import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { DEFAULT_DURATION, type ToastOptions, type ToastVariant } from "./types"
import { useTerminalDimensions } from "@opentui/react"


export type ToastContextValue={
    show:(options:ToastOptions)=>void
}


const ToastContext= createContext<ToastContextValue | null>(null)


type ToastProviderProps={
    children: ReactNode
}


export function ToastProvider({children}:ToastProviderProps){
    const [currentToast,setCurrenToast]= useState<ToastOptions | null>(null);
    const timeoutHandleRef= useRef<NodeJS.Timeout | null>(null);

    const clearCurrentTimeout= useCallback(()=>{
        if(timeoutHandleRef.current){
            clearTimeout(timeoutHandleRef.current)
            timeoutHandleRef.current = null
        }
    },[])

    const show= useCallback((options:ToastOptions)=>{
        const duration =options.duration ?? DEFAULT_DURATION
        
        clearCurrentTimeout()

        setCurrenToast({
            variant:options.variant ?? "info",
            ...options,
            duration,
        })

        timeoutHandleRef.current=setTimeout(()=>{
            setCurrenToast(null);
            timeoutHandleRef.current=null
        },duration).unref()
    },[clearCurrentTimeout])


    const value:ToastContextValue={
        show
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Toast currentToast={currentToast} />
        </ToastContext.Provider>
    )
}

type ToastProps={
    currentToast:ToastOptions|null
}

function Toast({currentToast}:ToastProps){
    const {width}= useTerminalDimensions()
    if(currentToast == null) return null

    const varaintColors:Record<ToastVariant,string>={
        success:"#82E0AA",
        error:"#E74C5E",
        info:"#56D6C2"
    }

    const borderColor= currentToast.variant ? varaintColors[currentToast.variant] : varaintColors.info
    
    return(
        <box
        position="absolute"
        justifyContent="center"
        alignItems="center"
        top={2}
        right={2}
        width={Math.max(1,Math.min(60,width-6))}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
        backgroundColor="#1A1A24"
        borderColor={borderColor} 
        border={['left','right']}
        >
            <box flexDirection="column" gap={1} width="100%">
               <text fg="#E1E1E1" wrapMode="word" width="100%">
                {currentToast.message}
               </text>
            </box>
        </box>
    )
}


export function useToast():ToastContextValue{
    const value= useContext(ToastContext)
    if (value == null){
        throw new Error("useToast must be used with in ToastProvider")
    }
    return value
}