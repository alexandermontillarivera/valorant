import type { APIRoute } from "astro"
import { json, preflight } from "@/lib/publicApi"
import { PLAYERS } from "@/lib/players"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = () =>
	json({ data: PLAYERS.map(({ slug, name, tag }) => ({ slug, name, tag })) })
