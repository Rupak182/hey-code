import { findSupportedChatModel, type ModelPricing } from "@heycode/shared"
import type { LanguageModelUsage } from "ai"


type CalculateCreditsForUsageParams={
    provider:string,
    model:string
    usage:LanguageModelUsage
}

type BillableUsageType={
    credits:number
}

type TokenCounts={
    inputTokens:number
    outputTokens:number
}
const TOKEN_PER_MILLION=1_000_000


function getTokenCounts(usage:LanguageModelUsage):TokenCounts{
    const inputTokens=usage.inputTokens
    const outputTokens=usage.outputTokens

    if(inputTokens===undefined || outputTokens===undefined || inputTokens<0 || outputTokens<0){
        throw new Error("Credits conversion requires valid input and output token counts")
    }
    return {inputTokens,outputTokens}
}


function getModelPricing(provider:string,model:string):ModelPricing{
    const supportedModel= findSupportedChatModel(model)

    if(!supportedModel || supportedModel.provider !==provider)
        throw new Error(`Unsupported billing model: ${provider}:${model}`)

    const supportedPricing= supportedModel.pricing

    return supportedPricing
}

function estimateCostinUSD({inputTokens,outputTokens}:TokenCounts,pricing:ModelPricing){

    return (

        ((inputTokens*pricing.inputUsdPerMillionTokens)+ 
        (outputTokens*pricing.outputUsdPerMillionTokens))/
        TOKEN_PER_MILLION
    )
    
}

const USD_PER_CREDIT=0.01

function convertUSDToCredits(estimatedCost:number){
    if(estimatedCost<=0){
        return 0
    }

    return Math.max(1,Math.ceil(estimatedCost/USD_PER_CREDIT))
}

export function calculateCreditsForUsage({provider,model,usage}:CalculateCreditsForUsageParams):BillableUsageType{
    const tokenCounts=getTokenCounts(usage)
    const pricing=getModelPricing(provider,model)
    const estimatedCost= estimateCostinUSD(tokenCounts,pricing)
    const credits= convertUSDToCredits(estimatedCost)
    return {credits}   
}
