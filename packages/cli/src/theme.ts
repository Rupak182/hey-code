export type ThemeColors={
    primary:string,
    planMode:string,
    selection:string,
    thinking:string,
    success:string,
    error:string,
    info:string,
    background:string,
    surface:string,
    dialogSurface:string,
    thinkingBorder:string,
    dimSeperator:string
}


export type Theme={
    name:string,
    colors:ThemeColors,
}

export const THEMES:Theme[]=[
    {
        name:"Nightfox",
        colors:{
            primary:"#56D6C2",
            planMode:"#CF8EF4",
            selection:"#89B4FA",
            thinking:"#CF8EF4",
            success:"#82E0AA",
            error:"#E74C5E",
            info:"#56D6C2",
            background:"#0D0D12",
            surface:"#1A1A24",
            dialogSurface:"#0A0A10",
            thinkingBorder:"#34344A",
            dimSeperator:"#4E4E66"
        }
    },
     {
        name:"Soft Midnight",
        colors:{
            primary:"#60A5FA",
            planMode:"#f9A8D4",
            selection:"#93C5FD",
            thinking:"#F9A8D4",
            success:"#6EE7B7",
            error:"#FCA5A5",
            info:"#67E8F9",
            background:"#0F172A",
            surface:"#1E293B",
            dialogSurface:"#0C1322",
            thinkingBorder:"#334155",
            dimSeperator:"#475569"
        }
    }
]
    
export const DEFAULT_THEME=THEMES.find(t=>t.name==="Nightfox")!