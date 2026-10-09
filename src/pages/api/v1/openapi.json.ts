import type { APIRoute } from "astro"
import { spec } from "@/lib/openapi"
import { json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = () => json(spec, 200, "public, max-age=300")
