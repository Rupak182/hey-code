
export type ModelPricing={
    inputUsdPerMillionTokens:number,
    outputUsdPerMillionTokens:number
}

export type SupportedProvider = "openai" | "anthropic" | "google" | "groq"


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

    },
    {
        id:'openai/gpt-oss-120b',
        provider:'groq',
        pricing:{
            inputUsdPerMillionTokens:0.15,
            outputUsdPerMillionTokens:0.60
        },
    },
    {
        id:'openai/gpt-oss-20b',
        provider:'groq',
        pricing:{
            inputUsdPerMillionTokens:0.075,
            outputUsdPerMillionTokens:0.30
        },
    },
    {
        id:'qwen/qwen3-32b',
        provider:'groq',
        pricing:{
            inputUsdPerMillionTokens:0.29,
            outputUsdPerMillionTokens:0.59
        },
    },
    {
        id:'qwen/qwen3.6-27b',
        provider:'groq',
        pricing:{
            inputUsdPerMillionTokens:0.60,
            outputUsdPerMillionTokens:3.00
        },
    },
    {
        id:'gpt-5.5',
        provider:'openai',
        pricing:{
            inputUsdPerMillionTokens:5.00,
            outputUsdPerMillionTokens:30.00
        },
    },
    {
        id:'gpt-5.4',
        provider:'openai',
        pricing:{
            inputUsdPerMillionTokens:2.50,
            outputUsdPerMillionTokens:15.00
        },
    },
    {
        id:'claude-opus-4-8',
        provider:'anthropic',
        pricing:{
            inputUsdPerMillionTokens:5.00,
            outputUsdPerMillionTokens:25.00
        },
    },
    {
        id:'claude-sonnet-4-6',
        provider:'anthropic',
        pricing:{
            inputUsdPerMillionTokens:3.00,
            outputUsdPerMillionTokens:15.00
        },
    }
] as const satisfies readonly SupportedChatModelDefinition[]


export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number]


export type SupportedChatModelId= SupportedChatModel['id']

export function findSupportedChatModel(modelId:string){
    return SUPPORTED_CHAT_MODELS.find((model)=>model.id === modelId)
}


export const DEFAULT_CHAT_MODEL_ID="openai/gpt-oss-120b"