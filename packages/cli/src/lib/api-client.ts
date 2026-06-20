import { hc } from "hono/client"
import type { Apptype } from "@heycode/server"
import { clearAuth, getAuth } from "./auth"

let clientInstance: ReturnType<typeof hc<Apptype>> | null = null;

function getClient() {
    if (!clientInstance) {
        clientInstance = hc<Apptype>(process.env.API_BASE_URL ?? process.env.API_URL ?? "http://localhost:3000/", {
            fetch: async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
                const headers = new Headers(init?.headers)
                const auth = getAuth()

                if (auth) {
                    headers.set('Authorization', `Bearer ${auth.token}`)
                }
                const response = await fetch(input, { ...init, headers })

                if (response.status === 401) {
                    clearAuth()
                }
                return response
            }
        })
    }
    return clientInstance;
}

// proxy for minimal changes
export const apiClient = new Proxy({} as ReturnType<typeof hc<Apptype>>, {
    get(target, prop, receiver) {
        return Reflect.get(getClient(), prop, receiver);
    }
});
