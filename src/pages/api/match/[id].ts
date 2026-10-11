import type { APIRoute } from "astro"
import { loadMatch } from "@/lib/dashboard"
import { getPlayer } from "@/lib/players"

export const GET: APIRoute = async ({ params, url }) => {
	const match = await loadMatch(
		params.id ?? "",
		getPlayer(url.searchParams.get("player") ?? undefined),
	)
	if (!match)
		return Response.json(
			{
				message:
					"El detalle de esta partida aún no está disponible. Se descargará en segundo plano.",
			},
			{ status: 404 },
		)
	return Response.json(match, {
		headers: { "Cache-Control": "private, max-age=3600" },
	})
}
