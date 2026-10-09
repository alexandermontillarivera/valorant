import type { APIRoute } from "astro"
import { context, intParam, json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	const limit = intParam(url, "limit", 100, 1, 1000)
	const season = url.searchParams.get("season")?.toLowerCase()
	const points = ctx.data.rrHistory.filter(
		(p) => !season || p.season.toLowerCase() === season,
	)
	return json({
		data: points.slice(-limit),
		meta: { total: points.length, limit, season: season ?? null },
	})
}
