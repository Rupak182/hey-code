
export type ModelPricing={
    inputUsdPerMillionTokens:number,
    outputUsdPerMillionTokens:number
}

export type SupportedProvider = "openai" | "anthropic" | "google"


export type SupportedChatModelDefinition={
    id:string,
    provider:SupportedProvider,
    pricing:ModelPricing
}

export const SUPPORTED_CHAT_MODELS=[
    {
        id:'gemini-2.5-flash',
        provider:'google',
        pricing:{
            inputUsdPerMillionTokens:0.30,
            outputUsdPerMillionTokens:2.50
        },
    },
    {
        id:'gemini-3.5-flash',
        provider:'google',
        pricing:{
            inputUsdPerMillionTokens:0.50 ,
            outputUsdPerMillionTokens:9.00
        },

    },
    {
        id:'gemini-2.5-flash-lite',
        provider:'google',
        pricing:{
            inputUsdPerMillionTokens:0.10 ,
            outputUsdPerMillionTokens:0.40
        },

    }
    
] as const satisfies readonly SupportedChatModelDefinition[]


export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number]


export type SupportedChatModelId= SupportedChatModel['id']

export function findSupportedChatModel(modelId:string){
    return SUPPORTED_CHAT_MODELS.find((model)=>model.id === modelId)
}


export const DEFAULT_CHAT_MODEL_ID="gemini-2.5-flash-lite"