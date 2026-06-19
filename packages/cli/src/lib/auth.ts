
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
type AuthData={
    token:string
}

const AUTH_DIR= join(homedir(),".heycode")
const AUTH_FILE= join(AUTH_DIR,"auth.json")

export function getAuth():AuthData |null {
    try{
        const data = readFileSync(AUTH_FILE, 'utf-8')
        const parsed= JSON.parse(data) as Partial<AuthData>
        if (typeof parsed.token === "string" && parsed.token) {
            return { token: parsed.token }
        }
    } catch {
        // Fall through
    }
    const token = "user_" + Math.random().toString(36).substring(2, 15)
    saveAuth({ token })
    return { token }
}

export function saveAuth(data:AuthData):void{
        if(!existsSync(AUTH_DIR)){
            mkdirSync(AUTH_DIR,{mode:0o700})
        }
        writeFileSync(AUTH_FILE,JSON.stringify(data),{mode:0o600})
      
}

export function clearAuth(){
            try{
                unlinkSync(AUTH_FILE)
            }catch(e){

            }
}

