import {
	byParty,
	filterGames,
	groupBy,
	perfBreakdown,
	summarize,
	weaponStats,
} from "@/lib/stats"
import { weaponInfo } from "@/lib/weapons"
import type { Catalog } from "@/interfaces/catalog"
import type { Dashboard } from "@/interfaces/dashboard"
import type { Game } from "@/interfaces/game"
import type { Group, Period, Summary } from "@/interfaces/stats"
import type { Shell } from "@/interfaces/views"

const PERIODS: Period[] = ["all", "act", "50", "20"]

/** Drops the heavy per-match arrays the list views never render. */
export const lean = (g: Game): Game =>
	g.d ? { ...g, d: { ...g.d, pts: [], weapons: {}, killedBy: {} } } : g

const slim = (groups: Group[]): Group[] =>
	groups.map((g) => ({ ...g, best: {} }))

function leanSummary(s: Summary): Summary {
	const best: Summary["best"] = {}
	for (const [k, b] of Object.entries(s.best))
		if (b)
			best[k as keyof Summary["best"]] = { value: b.value, game: lean(b.game) }
	return { ...s, best }
}

export function shellOf(data: Dashboard): Shell {
	const counts = new Map<string, { mode: string; count: number }>()
	for (const g of data.games) {
		const c = counts.get(g.queue) ?? { mode: g.mode, count: 0 }
		c.count++
		counts.set(g.queue, c)
	}
	return {
		profile: data.profile,
		sync: data.sync,
		queues: [...counts.entries()].map(([queue, c]) => ({ queue, ...c })),
	}
}

export function buildView(
	view: string,
	data: Dashboard,
	catalog: Catalog,
	params: URLSearchParams,
): unknown {
	const mode = params.get("mode") ?? "competitive"
	const rawPeriod = params.get("period") ?? "all"
	const period = PERIODS.includes(rawPeriod as Period)
		? (rawPeriod as Period)
		: "all"
	const games = filterGames(data.games, mode, period)

	switch (view) {
		case "summary":
			return { summary: leanSummary(summarize(games)) }
		case "overview": {
			const ids = new Set(games.map((g) => g.id))
			return {
				recent: games.slice(0, 40).map(lean),
				rr: data.rrHistory.filter((p) => ids.has(p.matchId)),
				agents: slim(groupBy(games, (g) => g.agent).slice(0, 4)),
				maps: slim(groupBy(games, (g) => g.map).slice(0, 4)),
			}
		}
		case "combat":
			return { breakdown: perfBreakdown(games), parties: slim(byParty(games)) }
		case "agents":
			return {
				groups: slim(groupBy(games, (g) => g.agent)),
				roles: slim(
					groupBy(
						games,
						(g) => catalog.agents[g.agent.toLowerCase()]?.role ?? "Otro",
					),
				),
			}
		case "maps":
			return { groups: slim(groupBy(games, (g) => g.map)) }
		case "heatmap": {
			const map = params.get("map") ?? ""
			return {
				points: games
					.filter((g) => g.map === map)
					.flatMap((g) => g.d?.pts ?? []),
			}
		}
		case "weapons":
			return {
				weapons: weaponStats(games, (key) => weaponInfo(catalog, key)).filter(
					(w) => w.kills || w.deaths,
				),
			}
		case "seasons":
			return {
				groups: slim(
					groupBy(
						data.games.filter((g) => g.queue === "competitive"),
						(g) => g.season,
					),
				),
			}
		case "matches": {
			const limit = Math.min(
				100,
				Math.max(1, Number(params.get("limit")) || 30),
			)
			const offset = Math.max(0, Number(params.get("offset")) || 0)
			return {
				games: games.slice(offset, offset + limit).map(lean),
				total: games.length,
				offset,
				limit,
			}
		}
		default:
			return null
	}
}
