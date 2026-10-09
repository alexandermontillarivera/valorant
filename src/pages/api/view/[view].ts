import type { APIRoute } from "astro"
import { loadDashboard } from "@/lib/dashboard"
import { buildView } from "@/lib/views"

export const GET: APIRoute = async ({ params, url }) => {
	const result = await loadDashboard()
	if (!result.ok)
		return Response.json({ message: result.message }, { status: result.status })
	const body = buildView(
		params.view ?? "",
		result.data,
		result.catalog,
		url.searchParams,
	)
	if (body === null)
		return Response.json({ message: "Vista desconocida" }, { status: 404 })
	return Response.json(body, {
		headers: { "Cache-Control": "private, max-age=30" },
	})
}
