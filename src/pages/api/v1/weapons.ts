import type { APIRoute } from "astro"
import { weaponStats } from "@/lib/stats"
import { weaponInfo } from "@/lib/weapons"
import { context, json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ url }) => {
	const ctx = await context(url)
	if (!ctx.ok) return ctx.response
	const data = weaponStats(ctx.games, (key) =>
		weaponInfo(ctx.catalog, key),
	).filter((w) => w.kills || w.deaths)
	return json({ data, meta: ctx.filters })
}
