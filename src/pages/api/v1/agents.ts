import type { APIRoute } from "astro"
import { context, json, preflight, publicGroups } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	const data = publicGroups(ctx.games, (g) => g.agent).map((g) => ({
		...g,
		role: ctx.catalog.agents[g.key.toLowerCase()]?.role ?? null,
	}))
	return json({ data, meta: ctx.filters })
}
