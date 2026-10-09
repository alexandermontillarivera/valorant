import type { APIRoute } from "astro"
import { context, json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	return json({ data: ctx.data.sync }, 200, "no-store")
}
