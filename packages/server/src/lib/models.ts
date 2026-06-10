import type { SupportedChatModel, SupportedProvider } from "@heycode/shared";
import type {LanguageModel} from "ai"
import { findSupportedChatModel, type SupportedChatModelId } from "../../../shared/src/models";
import { google } from "@ai-sdk/google";



type GoogleModelId= Extract<SupportedChatModel,{provider:"google"}>['id']

export type ResolvedModel={
    model:LanguageModel,
    provider:SupportedProvider,
    modelId:SupportedChatModelId,
}


function assertUnsupportedProvider(provider:never) : never {
    throw new Error(`Unsupported provider: ${provider}`)
}

function resolveGoogleModel(modelId:GoogleModelId):ResolvedModel{
    return {
        model:google(modelId),
        provider:"google",
        modelId: modelId,
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




