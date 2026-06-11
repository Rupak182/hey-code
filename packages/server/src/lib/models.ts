import type { SupportedChatModel, SupportedProvider } from "@heycode/shared";
import type {LanguageModel} from "ai"
import { findSupportedChatModel, type SupportedChatModelId } from "../../../shared/src/models";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import type {ProviderOptions} from '@ai-sdk/provider-utils'


type GoogleModelId= Extract<SupportedChatModel,{provider:"google"}>['id']

export type ResolvedModel={
    model:LanguageModel,
    provider:SupportedProvider,
    modelId:SupportedChatModelId,
    providerOptions?:ProviderOptions
}
const GOOGLE_PROVIDER_OPTIONS:Partial<Record<GoogleModelId,ProviderOptions>>={
    'gemini-2.5-flash': {
      thinkingConfig: {
        thinkingBudget: 2048,
        includeThoughts: true,
      },
    } satisfies GoogleLanguageModelOptions,

     'gemini-2.5-flash-lite': {
      thinkingConfig: {
        thinkingBudget: 2048,
        includeThoughts: true,
      },
    } satisfies GoogleLanguageModelOptions,

     'gemini-3.5-flash': {
      thinkingConfig: {
        thinkingLevel: 'medium',
        includeThoughts: true,
      },
    } satisfies GoogleLanguageModelOptions,

    

}

function assertUnsupportedProvider(provider:never) : never {
    throw new Error(`Unsupported provider: ${provider}`)
}

function resolveGoogleModel(modelId:GoogleModelId):ResolvedModel{
    return {
        model:google(modelId),
        provider:"google",
        modelId: modelId,
        providerOptions: GOOGLE_PROVIDER_OPTIONS[modelId]
    }
}

function resolveSupportedChatModel(model:SupportedChatModel):ResolvedModel{
    switch(model.provider){
        case "google":{
            return resolveGoogleModel(model.id)
        }
        default:
            return assertUnsupportedProvider(model.provider)
        
    }
}


export function isSupportedChatModel(modelId:string):modelId is SupportedChatModelId{
    return findSupportedChatModel(modelId) !== undefined
}

export function resolveChatModel(modelId:string):ResolvedModel{
    const model=findSupportedChatModel(modelId)
    if(!model){
        throw new Error(`Model not found: ${modelId}`)
    }
    return resolveSupportedChatModel(model)
}




