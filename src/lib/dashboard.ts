import { getArchive, getMatch, warmUp } from "@/lib/sync"
import { resolveMatchWeapons } from "@/lib/weapons"
import { NO_ROUNDS, apiKey, normalizeProfile } from "@/lib/api"
import type { LoadResult } from "@/interfaces/dashboard"
import type { Match } from "@/interfaces/match"
import { isLimited } from "@/lib/ratelimit"
import { getCatalog } from "@/lib/catalog"
import { PLAYERS } from "@/lib/players"
import type { TrackedPlayer } from "@/interfaces/players"

export async function loadDashboard(
	player: TrackedPlayer,
	wait = true,
): Promise<LoadResult> {
	const catalog = await getCatalog()
	if (!apiKey())
		return {
			ok: false,
			status: 500,
			message: "Falta la API key en el archivo .env.",
			catalog,
		}

	const a = await getArchive(player)
	if (wait && (!a.account || !a.mmr || !a.games.size))
		await warmUp(a, () => !!a.account && !!a.mmr && a.games.size > 0)
	if (!a.account) {
		return {
			ok: false,
			status: a.error ? 404 : 503,
			message: a.error ?? "Sincronizando… recarga en unos segundos.",
			catalog,
		}
	}

	const profile = normalizeProfile(a.account.data, a.mmr?.data)

	const games = [...a.games.values()]
		.map((x) => {
			const rr = a.rr.get(x.id)?.change
			return rr === undefined ? x : { ...x, rr }
		})
		.sort((x, y) => +new Date(y.startedAt) - +new Date(x.startedAt))
	const rrHistory = [...a.rr.values()].sort(
		(x, y) => +new Date(x.date) - +new Date(y.date),
	)

	return {
		ok: true,
		catalog,
		data: {
			profile,
			games,
			rrHistory,
			sync: {
				total: Math.max(a.meta.storedTotal, games.length),
				known: games.length,
				detailed: games.filter((x) => x.d).length,
				detailable: games.filter((x) => !NO_ROUNDS.has(x.queue)).length,
				rrPoints: rrHistory.length,
				working:
					a.meta.storedNextPage > 0 ||
					a.meta.rrNextPage > 0 ||
					games.some(
						(x) =>
							!x.d && !NO_ROUNDS.has(x.queue) && (a.meta.failed[x.id] ?? 0) < 3,
					),
				rateLimited: isLimited(),
				lastSyncAt: a.meta.lastSyncAt,
			},
		},
	}
}

export async function loadMatch(
	id: string,
	player: TrackedPlayer = PLAYERS[0],
): Promise<Match | null> {
	if (!apiKey() || !player) return null
	const catalog = await getCatalog()
	const match = await getMatch(await getArchive(player), id)
	return match ? resolveMatchWeapons(match, catalog) : null
}
