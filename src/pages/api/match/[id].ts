import type { APIRoute } from "astro"
import { loadMatch } from "@/lib/dashboard"

export const GET: APIRoute = async ({ params }) => {
	const match = await loadMatch(params.id ?? "")
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
