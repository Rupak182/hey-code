import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import sessions from './routes/sessions'
import chat from './routes/chat'
const app = new Hono()

app.onError((error,c)=>{
    if(error instanceof HTTPException){
        return c.json({
            error:error.message || "Request Failed"
        },error.status)
    }

    console.error("Unhanlded server error:",error);
    return c.json({
        error:"Internal Server Error"
    },500)
})

const routes= app.route("/sessions",sessions).route("/chat",chat)

export type Apptype= typeof routes
export default {port:3000 ,fetch:app.fetch,idleTimeout:255}