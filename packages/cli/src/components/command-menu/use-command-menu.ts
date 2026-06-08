import type { ScrollBoxRenderable } from "@opentui/core";
import type { Command } from "./types";
import { useMemo, useRef, useState, type RefObject } from "react";
import { getFilteredCommands } from "./filter-command";
import { useKeyboard } from "@opentui/react";



type UseCommandsMenuReturn = {
    showCommandMenu: boolean,
    commandQuery: string,
    selectedIndex: number,
    scrollRef: RefObject<ScrollBoxRenderable | null>,
    handleContentChange: (text: string) => void,
    resolveCommand: (index: number) => Command | undefined,
    setSelectedIndex: (index: number) => void,
}

export function useCommandMenu(): UseCommandsMenuReturn {
    const [textValue, setTextValue] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [showCommandMenu, setShowCommandMenu] = useState(false)
    const scrollRef = useRef<ScrollBoxRenderable | null>(null)

    const commandQuery = showCommandMenu && textValue.startsWith("/") ? textValue.slice(1) : ""

    const filteredCommands = useMemo(() => getFilteredCommands(commandQuery), [commandQuery])

    const handleContentChange = (text: string) => {
        setTextValue(text)
        setSelectedIndex(0)

        const scrollBox = scrollRef.current;
        if (scrollBox) {
            scrollBox.scrollTo(0)
        }

        if (text.startsWith("/")) {
            const prefix = text.slice(1);
            if (!prefix.includes(" ")) {
                 setShowCommandMenu(true);
                 return;
            }
        }
        setShowCommandMenu(false);
    }



    const resolveCommand = (index: number):Command|undefined => {
        const command= filteredCommands[index]
        if (!command){
            setShowCommandMenu(false)
        }
        return command
    }

    useKeyboard((key)=>{
        if(!showCommandMenu)
            return

        if(key.name==="escape"){
            return
        }
       

         if(key.name==="up"){
            key.preventDefault()
            setSelectedIndex((prev) =>{
                const newIndex= Math.max(0,prev-1)

                const sb= scrollRef.current;
                if(sb && newIndex <sb.scrollTop){
                    sb.scrollTo(newIndex)
                }
                return newIndex
            })
        }

        else if(key.name==="down"){
            key.preventDefault()
            setSelectedIndex((prev)=>{
                const maxIndex= filteredCommands.length-1;
                const newIndex= Math.max(maxIndex, prev+1)

                const sb= scrollRef.current;
                if(sb ){
                    const viewPortHeight= sb.viewport.height
                    const visibleEnd= sb.scrollTop+viewPortHeight-1
                    if(newIndex > visibleEnd) {
                        sb.scrollTo(newIndex-viewPortHeight+1)
                    }
                }
                return newIndex
            })
        }

    

   
    })

        return {
            showCommandMenu,
            commandQuery,
            selectedIndex,
            scrollRef,
            handleContentChange,
            resolveCommand,
            setSelectedIndex,
        }


}    
