import type { APIRoute } from "astro"
import { loadDashboard } from "@/lib/dashboard"
import { getPlayer } from "@/lib/players"
import { buildVersus } from "@/lib/versus"

export const GET: APIRoute = async ({ url }) => {
	const a = getPlayer(url.searchParams.get("a") ?? "")
	const b = getPlayer(url.searchParams.get("b") ?? "")
	if (!a || !b || a.slug === b.slug)
		return Response.json(
			{ message: "Elige dos jugadores distintos" },
			{ status: 400 },
		)
	const [ra, rb] = await Promise.all([loadDashboard(a), loadDashboard(b)])
	if (!ra.ok)
		return Response.json({ message: ra.message }, { status: ra.status })
	if (!rb.ok)
		return Response.json({ message: rb.message }, { status: rb.status })
	return Response.json(
		buildVersus(
			[a.slug, ra.data],
			[b.slug, rb.data],
			ra.catalog,
			url.searchParams,
		),
		{ headers: { "Cache-Control": "private, max-age=30" } },
	)
}
