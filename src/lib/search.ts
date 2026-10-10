import { acsOf, adrOf, hsOf, kdOf, summarize } from "@/lib/stats"
import type { Game } from "@/interfaces/game"
import type {
	PlayerHit,
	SearchCondition,
	SearchMetric,
} from "@/interfaces/views"

const METRICS: Record<SearchMetric, (g: Game) => number | undefined> = {
	kills: (g) => g.kills,
	deaths: (g) => g.deaths,
	assists: (g) => g.assists,
	kd: kdOf,
	acs: acsOf,
	adr: adrOf,
	hs: (g) => hsOf(g) * 100,
	perf: (g) => g.d?.perf?.score,
	rr: (g) => g.rr,
}

const SORTS: Record<string, (g: Game) => number> = {
	date: (g) => +new Date(g.startedAt),
	kills: (g) => g.kills,
	acs: acsOf,
	kd: kdOf,
	adr: adrOf,
	perf: (g) => g.d?.perf?.score ?? -1,
}

export function parseConditions(raw: string[]): SearchCondition[] {
	return raw
		.map((c) => c.split(":"))
		.filter(
			([metric, op, value]) =>
				metric in METRICS &&
				(op === "gte" || op === "lte") &&
				Number.isFinite(Number(value)),
		)
		.map(([metric, op, value]) => ({
			metric: metric as SearchMetric,
			op: op as "gte" | "lte",
			value: Number(value),
		}))
}

const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")

export function searchGames(games: Game[], params: URLSearchParams) {
	const conditions = parseConditions(params.getAll("c"))
	const player = params.get("player")
	const side = params.get("side") ?? "any"
	const agent = params.get("agent")
	const map = params.get("map")
	const result = params.get("result")
	const mvp = params.get("mvp")
	const from = params.get("from")
	const to = params.get("to")
	const q = norm(params.get("q") ?? "").trim()

	// Players rename; text search should also match the name they use now.
	const currentName = new Map<string, { name: string; at: string }>()
	if (q)
		for (const g of games)
			for (const p of g.d?.players ?? []) {
				const seen = currentName.get(p.puuid)
				if (!seen || g.startedAt > seen.at)
					currentName.set(p.puuid, {
						name: `${p.name}#${p.tag}`,
						at: g.startedAt,
					})
			}

	const matched = games.filter((g) => {
		if (agent && g.agent !== agent) return false
		if (map && g.map !== map) return false
		if (result && g.result !== result) return false
		if (mvp === "match" && g.d?.mvp !== 1) return false
		if (mvp === "team" && !g.d?.mvp) return false
		if (from && g.startedAt.slice(0, 10) < from) return false
		if (to && g.startedAt.slice(0, 10) > to) return false
		if (player) {
			const p = g.d?.players?.find((x) => x.puuid === player)
			if (!p) return false
			if (side === "ally" && !p.ally) return false
			if (side === "enemy" && p.ally) return false
		}
		for (const c of conditions) {
			const v = METRICS[c.metric](g)
			if (v === undefined) return false
			if (c.op === "gte" ? v < c.value : v > c.value) return false
		}
		if (q) {
			const haystack = norm(
				[
					g.map,
					g.agent,
					g.mode,
					...(g.d?.players ?? []).map(
						(p) =>
							`${p.name}#${p.tag} ${currentName.get(p.puuid)?.name ?? ""} ${p.agent}`,
					),
				].join(" "),
			)
			if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
		}
		return true
	})

	const sortKey = SORTS[params.get("sort") ?? "date"] ?? SORTS.date
	const asc = params.get("order") === "asc"
	matched.sort((a, b) => (sortKey(a) - sortKey(b)) * (asc ? 1 : -1))
	return { matched, summary: summarize(matched) }
}

/** People you've shared a match with, for the player filter's autocomplete. */
export function searchPlayers(games: Game[], query: string, limit = 8) {
	const q = norm(query).trim()
	const byId = new Map<string, PlayerHit & { last: string }>()
	for (const g of games) {
		for (const p of g.d?.players ?? []) {
			let hit = byId.get(p.puuid)
			if (!hit) {
				hit = {
					puuid: p.puuid,
					name: p.name,
					tag: p.tag,
					games: 0,
					asAlly: 0,
					asEnemy: 0,
					winsTogether: 0,
					last: g.startedAt,
				}
				byId.set(p.puuid, hit)
			}
			if (g.startedAt > hit.last) {
				hit.name = p.name
				hit.tag = p.tag
				hit.last = g.startedAt
			}
			hit.games++
			if (p.ally) {
				hit.asAlly++
				if (g.result === "W") hit.winsTogether++
			} else hit.asEnemy++
		}
	}
	return [...byId.values()]
		.filter((p) => !q || norm(`${p.name}#${p.tag}`).includes(q))
		.sort((a, b) => b.games - a.games || b.asAlly - a.asAlly)
		.slice(0, limit)
		.map(({ last: _, ...p }) => p)
}
