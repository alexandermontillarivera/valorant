import { filterGames, groupBy, summarize, acsOf } from "@/lib/stats"
import { lean, leanSummary, shellOf, slim } from "@/lib/views"
import type { Catalog } from "@/interfaces/catalog"
import type { Dashboard } from "@/interfaces/dashboard"
import type { Game } from "@/interfaces/game"
import type { Period } from "@/interfaces/stats"
import type {
	Pairing,
	SharedGame,
	VersusSide,
	VersusView,
} from "@/interfaces/versus"
import type { QueueCount } from "@/interfaces/views"

const PERIODS: Period[] = ["all", "act", "50", "20"]

function spread(values: number[]) {
	if (values.length < 2) return 0
	const mean = values.reduce((s, v) => s + v, 0) / values.length
	return Math.sqrt(
		values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1),
	)
}

function side(
	slug: string,
	data: Dashboard,
	games: Game[],
	catalog: Catalog,
): VersusSide {
	const perfs = games.flatMap((g) => (g.d?.perf ? [g.d.perf.score] : []))
	return {
		slug,
		profile: data.profile,
		summary: leanSummary(summarize(games)),
		agents: slim(groupBy(games, (g) => g.agent).slice(0, 5)),
		roles: slim(
			groupBy(
				games,
				(g) => catalog.agents[g.agent.toLowerCase()]?.role ?? "Otro",
			),
		),
		maps: slim(groupBy(games, (g) => g.map)),
		spread: {
			acs: spread(games.map(acsOf)),
			perf: perfs.length > 1 ? spread(perfs) : null,
		},
		form: games.slice(0, 10).map((g) => g.result),
		elo: data.rrHistory
			.filter((p) => p.elo > 0)
			.slice(-150)
			.map((p) => ({ t: +new Date(p.date), elo: p.elo, tierName: p.tierName })),
	}
}

function pairing(shared: SharedGame[]): Pairing {
	return {
		games: shared.length,
		a: leanSummary(summarize(shared.map((s) => s.a))),
		b: leanSummary(summarize(shared.map((s) => s.b))),
		recent: shared
			.slice(0, 12)
			.map((s) => ({ ...s, a: lean(s.a), b: lean(s.b) })),
	}
}

function mergeQueues(...lists: QueueCount[][]): QueueCount[] {
	const out = new Map<string, QueueCount>()
	for (const q of lists.flat()) {
		const prev = out.get(q.queue)
		out.set(q.queue, { ...q, count: (prev?.count ?? 0) + q.count })
	}
	return [...out.values()]
}

export function buildVersus(
	[slugA, a]: [string, Dashboard],
	[slugB, b]: [string, Dashboard],
	catalog: Catalog,
	params: URLSearchParams,
): VersusView {
	const mode = params.get("mode") ?? "competitive"
	const rawPeriod = params.get("period") ?? "all"
	const period = PERIODS.includes(rawPeriod as Period)
		? (rawPeriod as Period)
		: "all"
	const gamesA = filterGames(a.games, mode, period)
	const gamesB = filterGames(b.games, mode, period)

	// Matches both players appear in, split by whether they shared a team.
	const byId = new Map(gamesB.map((g) => [g.id, g]))
	const together: SharedGame[] = []
	const against: SharedGame[] = []
	for (const ga of gamesA) {
		const gb = byId.get(ga.id)
		if (!gb) continue
		const shared = {
			id: ga.id,
			map: ga.map,
			startedAt: ga.startedAt,
			a: ga,
			b: gb,
		}
		if (ga.team === gb.team) together.push(shared)
		else against.push(shared)
	}

	return {
		a: side(slugA, a, gamesA, catalog),
		b: side(slugB, b, gamesB, catalog),
		queues: mergeQueues(shellOf(a).queues, shellOf(b).queues),
		together: pairing(together),
		against: pairing(against),
	}
}
