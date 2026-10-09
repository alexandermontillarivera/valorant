import type { APIRoute } from "astro"
import { getCatalog } from "@/lib/catalog"
import { getStorage } from "@/lib/storage"
import { resolveMatchWeapons } from "@/lib/weapons"
import { apiError, json, preflight } from "@/lib/publicApi"

export const OPTIONS: APIRoute = () => preflight()

export const GET: APIRoute = async ({ params }) => {
	const match = await (await getStorage()).getMatch(params.id ?? "")
	if (!match)
		return apiError(
			404,
			"Partida no encontrada o todavía sin detalle sincronizado.",
		)
	return json(
		{ data: resolveMatchWeapons(match, await getCatalog()) },
		200,
		"public, max-age=3600",
	)
}
