import { Hono } from "hono";


const app= new Hono().get("/callback",(c)=>{
    const code= c.req.query("code")
    const state =c.req.query("state")
    const error =c.req.query("error")

    const errorDescription= c.req.query("error_description")

    if(error){
        if (state) {
            try {
                const [encoded] = state.split(".")
                if (encoded) {
                    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString())
                    const port = payload.port
                    if (port && typeof port === "number") {
                        const redirectUrl = `http://localhost:${port}/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription ?? '')}`
                        return c.redirect(redirectUrl)
                    }
                }
            } catch {
                // fall through to default error response if parsing state fails
            }
        }
        return c.text(errorDescription?? error,400)
    }

    if(!code||!state){
        return c.text("Missing code or state",400)
    }

    try{
        const [encoded]=state.split(".")
        if(!encoded){
            return c.text("Invalid state",400)
        }

        const payload= JSON.parse(Buffer.from(encoded,"base64url").toString())

        const port =payload.port

        if(!port ||typeof port!== "number"){
            return c.text("Invalid port in state",400)
        }

        const redirectUrl= `http://localhost:${port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`

        return c.redirect(redirectUrl)

        

    }catch(error){
        return c.text("Invalid authentication state",400)

    }
})

export default app