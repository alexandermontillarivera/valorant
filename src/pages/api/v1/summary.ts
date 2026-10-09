import type { APIRoute } from "astro"
import { summarize } from "@/lib/stats"
import { context, json, preflight, publicSummary } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	return json({ data: publicSummary(summarize(ctx.games)), meta: ctx.filters })
}
