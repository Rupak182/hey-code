import {hc} from "hono/client"
import type { Apptype } from "@heycode/server"

export const apiClient= hc<Apptype>(process.env.API_BASE_URL?? "http://localhost:3000/")

