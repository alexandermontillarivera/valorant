import type { APIRoute } from "astro"
import { context, intParam, json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	const limit = intParam(url, "limit", 20, 1, 100)
	const offset = intParam(url, "offset", 0, 0, Number.MAX_SAFE_INTEGER)
	const detail = url.searchParams.get("detail") === "true"
	const page = ctx.games
		.slice(offset, offset + limit)
		.map(({ d, ...g }) => (detail ? { ...g, detail: d ?? null } : g))
	return json({
		data: page,
		meta: { ...ctx.filters, total: ctx.games.length, limit, offset, detail },
	})
}
