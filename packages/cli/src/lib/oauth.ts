import open from 'open'
import { saveAuth } from './auth'


const LOGIN_TIMEOUT_MS=5*60*1000

type OAuthState={
    nonce:string
    port:number
}

function toBase64Url(input:Uint8Array|string){
    return Buffer.from(input).toString('base64url')
}

async function createPkceChallenge(verifier:string){
    const digest= await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))
    return toBase64Url(new Uint8Array(digest))
}

function encodeState(payload:OAuthState){
    return toBase64Url(JSON.stringify(payload))
}

function decodeState(state:string){
    const [encoded]= state.split(".")
    if(!encoded){
        throw new Error('invalid state')
    }

    try {
        return JSON.parse(Buffer.from(encoded,"base64").toString("utf-8")) as OAuthState
    } catch{
        throw new Error("invalid state format")
    }
}

function getErrorMessage(error:unknown){
    return error instanceof Error ?error.message: String(error)
}

export async function performLogin(){
    const clerkFrontendApi= process.env.CLERK_FRONTEND_API
    const clientId= process.env.CLERK_OAUTH_CLIENT_ID

    const apiUrl= process.env.API_URL ?? "https://localhost:3000"


    if(!clientId){
        throw new Error("missing CLERK_OAUTH_CLIENT_ID")
    }

    if(!clerkFrontendApi){
        throw new Error("missing CLERK_FRONTEND_API_KEY")
    }

    const nonce= crypto.randomUUID()
    
    const codeVerifier= toBase64Url(crypto.getRandomValues(new Uint8Array(96)))
    const codeChallenge= await createPkceChallenge(codeVerifier)
    
    let settled= false

    return new Promise<{token:string}>((resolve,reject)=>{
        const server=Bun.serve({
            port:0,
            async fetch(req){
                try {
                    const url= new URL(req.url)
                    if(url.pathname !=="/callback"){
                        return new Response("Not Found",{status:404})
                    }
                    const error= url.searchParams.get("error") // won't get currently as backend returns directly on error
                    if(error){
                        const msg= url.searchParams.get("error_description") ?? error
                        settled= true
                        reject(new Error(msg))
                        setTimeout(()=> server.stop(),500)
                        return new Response(`Authentication Failed: ${msg}`,{status:400})
                    
                    }

                    const code= url.searchParams.get("code")
                    const state =url.searchParams.get("state")
                    if (!code || !state){
                        settled= true
                        reject(new Error("Missing code or state parameter"))
                        setTimeout(()=> server.stop(),500)
                        return new Response(`Bad Request`,{status:400})

                    }


                    try{
                        const payload= decodeState(state)
                        if(payload.nonce !== nonce){
                            throw new Error("State mismatch")
                        }
                    }
                    catch (err){
                        settled= true
                        reject(err)
                        setTimeout(()=> server.stop(),500)
                        return new Response(`Invalid state`,{status:400})
                    }

                    try{
                        const redirectUrl= `${apiUrl}/auth/callback`
                        const tokenRes= await fetch(`${clerkFrontendApi}/oauth/token`,{
                            method:"POST",
                            headers:{"Content-Type":"application/x-www-form-urlencoded"},
                            body: new URLSearchParams({
                                grant_type:"authorization_code",
                                client_id:clientId,
                                redirect_uri:redirectUrl,
                                code,
                                code_verifier:codeVerifier,
                            })
                        })

                        if(!tokenRes.ok){
                            const details= await tokenRes.text()
                            throw new Error(details || "Failed to exchange authorization code")
                        }
                        //zod validation
                        const tokenData= (await tokenRes.json() as {access_token:string})
                        settled=true

                        saveAuth({token:tokenData.access_token})
                        resolve({token:tokenData.access_token})

                        setTimeout(()=>server.stop(),500)
                        return new Response("Authenticated! You can close this tab")
                    
                    }
                    catch(err){
                        settled= true
                        reject(err)
                        const message =getErrorMessage(err)
                        setTimeout(()=> server.stop(),500)
                        return new Response(
                            `Authentication failed: ${message}`,
                            {status:400}
                        )

                    }
                    
                } catch (error) {
                    settled = true
                    reject(error)
                    return new Response("Internal Server Error", {status: 500})
                }
            }

            

        })

        const port = server.port
        if(typeof port !=="number"){
            server.stop()
            throw new Error("Failed to start callback server")
            return 
        }
        const redirectUri= `${apiUrl}/auth/callback`
        const state= encodeState({nonce,port})
        const authorizeUrl= new URL(`${clerkFrontendApi}/oauth/authorize`)
        authorizeUrl.searchParams.set('client_id',clientId)
        authorizeUrl.searchParams.set('redirect_uri',redirectUri)
        authorizeUrl.searchParams.set('state',state)
        authorizeUrl.searchParams.set('response_type','code')
        authorizeUrl.searchParams.set('prompt','login')
        authorizeUrl.searchParams.set('code_challenge',codeChallenge)
        authorizeUrl.searchParams.set('code_challenge_method','S256')

        void open(authorizeUrl.toString())
        setTimeout(()=>{
            if(!settled){
                settled=true
                server.stop()
                reject(new Error("Login timeout"))
            }
        },LOGIN_TIMEOUT_MS)
    })


}