import { Polar } from "@polar-sh/sdk"
type PolarServer= "sandbox"|"production"


function getRequiredEnv(name:string){
    const value= process.env[name]

    if(!value){
        throw new Error(`${name} environment variable is not set`)
    }

    return value
}

export function getPolarAcesssToken(){
    return getRequiredEnv("POLAR_ACCESS_TOKEN")
}


export function getPolarProductId(){
    return getRequiredEnv("POLAR_PRODUCT_ID")
}

export function getPolarCreditsMeterId(){
    return getRequiredEnv("POLAR_CREDITS_METER_ID")
}

export function getPolarServer():PolarServer{   
    const server= process.env.POLAR_SERVER
    
    if(server!=='sandbox' && server !== "production"){
        throw new Error("POLAR_SERVER must be 'sandbox' or 'production'")
    }
    return server
}


const polar =new Polar({
    accessToken:getPolarAcesssToken(),
    server:getPolarServer(),
})

function hasStatusCode(error:unknown):error is {statusCode:number}{
    return (
        typeof error ==="object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode ==="number"
    )
}

type CreateCheckoutUrlParams={
    customerExternalId:string,
    requestUrl:string
}

export async function createCheckoutUrl({
    customerExternalId,
    requestUrl
}:CreateCheckoutUrlParams){
    const result= await polar.checkouts.create({
        products:[
            getPolarProductId(),
        ],
        successUrl:new URL("/billing/success",requestUrl).toString(),
        externalCustomerId:customerExternalId,
        metadata:{
            source:"heycode-cli" // for logging
        }
    })

    return result.url
}

export async function createCustomerPortalUrl({
    customerExternalId,
    requestUrl
}:CreateCheckoutUrlParams){
    const result= await polar.customerSessions.create({
        externalCustomerId:customerExternalId,
        returnUrl:new URL("/billing/success",requestUrl).toString(),
    })

    return result.customerPortalUrl
}


export async function getAvailableCreditsBalance(customerExternalId:string){
    try{

        const customerState=await polar.customers.getStateExternal({
            externalId:customerExternalId
        })

        const matchingMeters= customerState.activeMeters.filter((m)=>{
            return m.meterId===getPolarCreditsMeterId()
        })

        if(matchingMeters.length>1){
            throw new Error("Expected exactly one credit meter.")
        }

        const creditMeter= matchingMeters[0]

        return creditMeter?.balance ?? 0

    }catch(error){
        if(hasStatusCode(error) && error.statusCode===404){
            return 0
        }
        throw error
    }
}


type IngestAiUsageParams={
    externalCustomerId:string
    eventId:string
    credits:number
}

export async function ingestAiUsage({
    externalCustomerId,
    eventId,
    credits
}:IngestAiUsageParams){
    const result= await polar.events.ingest({
        events:[
            {
                name:"heycode_usage", // need to match 
                externalId:eventId,
                externalCustomerId,
                metadata:{
                    credits  // need to match with plan meta
                }
                
            }
        ]
    })

    return result
}