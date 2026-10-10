import type { WeaponInfo } from "@/interfaces/weapons"
import type { Detail, Game } from "@/interfaces/game"
import type { Match, PlayerLine } from "@/interfaces/match"
import type { TeamId } from "@/interfaces/player"
import type {
	Group,
	Line,
	Period,
	Summary,
	WeaponStat,
} from "@/interfaces/stats"

export function filterGames(
	games: Game[],
	queue: string,
	period: Period,
): Game[] {
	let list = queue === "all" ? games : games.filter((g) => g.queue === queue)
	if (period === "act") {
		const act = games.find((g) => g.season)?.season
		list = list.filter((g) => g.season === act)
	} else if (period !== "all") list = list.slice(0, Number(period))
	return list
}

export const roundsOf = (g: Game) => Math.max(1, g.my + g.their)
export const acsOf = (g: Game) => g.score / roundsOf(g)
export const adrOf = (g: Game) => g.dealt / roundsOf(g)
export const kdOf = (g: Game) => g.kills / Math.max(1, g.deaths)
export const hsOf = (g: Game) => g.head / Math.max(1, g.head + g.body + g.leg)

export function summarize(games: Game[]): Summary {
	const t = {
		wins: 0,
		losses: 0,
		draws: 0,
		rounds: 0,
		kills: 0,
		deaths: 0,
		assists: 0,
		head: 0,
		body: 0,
		leg: 0,
		score: 0,
		dealt: 0,
		received: 0,
		detailed: 0,
		dRounds: 0,
		dDeaths: 0,
		dDealt: 0,
		perf: 0,
		perfN: 0,
		kast: 0,
		fk: 0,
		fd: 0,
		mvps: 0,
		teamMvps: 0,
		flawless: 0,
		thrifty: 0,
		tradeKills: 0,
		traded: 0,
		plants: 0,
		defuses: 0,
		spent: 0,
		ff: 0,
		ally: 0,
		allyN: 0,
		enemy: 0,
		enemyN: 0,
	}
	const grades: Record<string, number> = {}
	const multi: Summary["multi"] = [0, 0, 0, 0]
	const clutchAtt = [0, 0, 0, 0, 0]
	const clutchWon = [0, 0, 0, 0, 0]
	const buys: Detail["buys"] = {
		pistol: [0, 0],
		eco: [0, 0],
		force: [0, 0],
		full: [0, 0],
	}
	const sides = { atk: [0, 0], def: [0, 0] }
	const casts = { c: 0, q: 0, e: 0, x: 0 }
	const best: Summary["best"] = {}
	const consider = (key: keyof Summary["best"], value: number, game: Game) => {
		if (!best[key] || value > best[key]!.value) best[key] = { value, game }
	}

	for (const g of games) {
		const r = roundsOf(g)
		if (g.result === "W") t.wins++
		else if (g.result === "L") t.losses++
		else t.draws++
		t.rounds += r
		t.kills += g.kills
		t.deaths += g.deaths
		t.assists += g.assists
		t.head += g.head
		t.body += g.body
		t.leg += g.leg
		t.score += g.score
		t.dealt += g.dealt
		t.received += g.received
		consider("kills", g.kills, g)
		if (r >= 10) {
			consider("acs", g.score / r, g)
			consider("adr", g.dealt / r, g)
		}

		const d = g.d
		if (!d) continue
		t.detailed++
		t.dRounds += r
		t.dDeaths += g.deaths
		t.dDealt += g.dealt
		if (d.perf) {
			t.perf += d.perf.score
			t.perfN++
			grades[d.perf.grade] = (grades[d.perf.grade] ?? 0) + 1
			consider("perf", d.perf.score, g)
		}
		t.kast += d.kast * r
		t.fk += d.fk
		t.fd += d.fd
		if (d.mvp === 1) t.mvps++
		if (d.mvp === 2) t.teamMvps++
		d.multi.forEach((v, i) => (multi[i] += v))
		d.clutch.att.forEach((v, i) => (clutchAtt[i] += v))
		d.clutch.won.forEach((v, i) => (clutchWon[i] += v))
		t.flawless += d.flawless
		t.thrifty += d.thrifty
		t.tradeKills += d.tradeKills
		t.traded += d.tradedDeaths
		for (const k of Object.keys(buys) as (keyof Detail["buys"])[]) {
			buys[k][0] += d.buys[k][0]
			buys[k][1] += d.buys[k][1]
		}
		for (const s of ["atk", "def"] as const) {
			sides[s][0] += d.sides[s][0]
			sides[s][1] += d.sides[s][1]
		}
		casts.c += d.casts.c
		casts.q += d.casts.q
		casts.e += d.casts.e
		casts.x += d.casts.x
		t.plants += d.plants
		t.defuses += d.defuses
		t.spent += d.spent
		t.ff += d.friendlyFire
		if (d.allyTier) {
			t.ally += d.allyTier
			t.allyN++
		}
		if (d.enemyTier) {
			t.enemy += d.enemyTier
			t.enemyN++
		}
	}

	const n = Math.max(1, games.length)
	const rounds = Math.max(1, t.rounds)
	const shots = Math.max(1, t.head + t.body + t.leg)
	const dn = Math.max(1, t.detailed)
	const dr = Math.max(1, t.dRounds)

	let current = 0
	let currentType: "W" | "L" | null = null
	for (const g of games) {
		if (g.result === "D") break
		if (!currentType) currentType = g.result
		if (g.result !== currentType) break
		current++
	}
	let longestWin = 0
	let longestLoss = 0
	let run = 0
	let runType: string | null = null
	for (const g of games) {
		if (g.result === runType) run++
		else {
			run = 1
			runType = g.result
		}
		if (runType === "W") longestWin = Math.max(longestWin, run)
		if (runType === "L") longestLoss = Math.max(longestLoss, run)
	}

	return {
		games: games.length,
		wins: t.wins,
		losses: t.losses,
		draws: t.draws,
		winRate: t.wins / n,
		rounds: t.rounds,
		kills: t.kills,
		deaths: t.deaths,
		assists: t.assists,
		kd: t.kills / Math.max(1, t.deaths),
		kda: (t.kills + t.assists) / Math.max(1, t.deaths),
		kpr: t.kills / rounds,
		hs: t.head / shots,
		body: t.body / shots,
		legs: t.leg / shots,
		acs: t.score / rounds,
		adr: t.dealt / rounds,
		damageDelta: (t.dealt - t.received) / rounds,
		detailed: t.detailed,
		perf: t.perfN ? t.perf / t.perfN : 0,
		perfN: t.perfN,
		grades,
		kast: t.kast / dr,
		fkPerMatch: t.fk / dn,
		fdPerMatch: t.fd / dn,
		fkRatio: t.fk / Math.max(1, t.fk + t.fd),
		mvps: t.mvps,
		teamMvps: t.teamMvps,
		multi,
		clutchAtt,
		clutchWon,
		flawless: t.flawless,
		thrifty: t.thrifty,
		tradeKills: t.tradeKills,
		tradedPct: t.traded / Math.max(1, t.dDeaths),
		buys,
		atkWinRate: sides.atk[0] / Math.max(1, sides.atk[1]),
		defWinRate: sides.def[0] / Math.max(1, sides.def[1]),
		atkRounds: sides.atk[1],
		defRounds: sides.def[1],
		castsPerRound: {
			c: casts.c / dr,
			q: casts.q / dr,
			e: casts.e / dr,
			x: casts.x / dr,
		},
		plants: t.plants,
		defuses: t.defuses,
		econ: t.spent ? (t.dDealt / t.spent) * 1000 : 0,
		friendlyFire: t.ff,
		allyTier: t.allyN ? t.ally / t.allyN : 0,
		enemyTier: t.enemyN ? t.enemy / t.enemyN : 0,
		best,
		streak: { current, currentType, longestWin, longestLoss },
	}
}

export function groupBy(games: Game[], keyOf: (g: Game) => string): Group[] {
	const buckets = new Map<string, Game[]>()
	for (const g of games) {
		const k = keyOf(g)
		const list = buckets.get(k)
		if (list) list.push(g)
		else buckets.set(k, [g])
	}
	return [...buckets.entries()]
		.map(([key, gs]) => ({ key, ...summarize(gs) }))
		.sort((a, b) => b.games - a.games || b.winRate - a.winRate)
}

export function weaponStats(
	games: Game[],
	infoOf: (key: string) => WeaponInfo = (k) => ({
		name: k,
		icon: null,
		ability: false,
	}),
): WeaponStat[] {
	const map = new Map<
		string,
		{
			k: number
			hs: number
			bs: number
			ls: number
			dmg: number
			dist: number
			distN: number
			deaths: number
			info: WeaponInfo
		}
	>()
	const skip = {
		k: 0,
		hs: 0,
		bs: 0,
		ls: 0,
		dmg: 0,
		dist: 0,
		distN: 0,
		deaths: 0,
	}
	const get = (key: string) => {
		const info = infoOf(key)
		if (info.hidden) return { ...skip, info }
		const w = info.name
		let e = map.get(w)
		if (!e)
			map.set(
				w,
				(e = {
					k: 0,
					hs: 0,
					bs: 0,
					ls: 0,
					dmg: 0,
					dist: 0,
					distN: 0,
					deaths: 0,
					info,
				}),
			)
		return e
	}
	for (const g of games) {
		if (!g.d) continue
		for (const [w, s] of Object.entries(g.d.weapons)) {
			const e = get(w)
			e.k += s.k
			e.hs += s.hs
			e.bs += s.bs
			e.ls += s.ls
			e.dmg += s.dmg
			e.dist += s.dist
			e.distN += s.distN
		}
		for (const [w, n] of Object.entries(g.d.killedBy)) get(w).deaths += n
	}
	const total = Math.max(
		1,
		[...map.values()].reduce((a, e) => a + e.k, 0),
	)
	return [...map.entries()]
		.map(([weapon, e]) => {
			const shots = e.hs + e.bs + e.ls
			return {
				weapon,
				kills: e.k,
				deaths: e.deaths,
				share: e.k / total,
				hs: shots ? e.hs / shots : 0,
				shots,
				damage: e.dmg,
				avgDist: e.distN ? e.dist / e.distN : null,
				icon: e.info.icon,
				ability: e.info.ability,
			}
		})
		.sort((a, b) => b.kills - a.kills || b.deaths - a.deaths)
}

export const PERF_CATEGORIES = [
	{ key: "damage", rating: "damage", label: "Daño", unit: "/ronda" },
	{
		key: "adjusted_kills",
		rating: "kill_impact",
		label: "Impacto de kills",
		unit: "/ronda",
	},
	{
		key: "adjusted_deaths",
		rating: "death_impact",
		label: "Impacto de muertes",
		unit: "/ronda",
	},
	{ key: "trades", rating: "trades", label: "Trades", unit: "/ronda" },
	{ key: "assists", rating: "assists", label: "Asistencias", unit: "/ronda" },
	{
		key: "utility_usage",
		rating: "utility_usage",
		label: "Uso de utilidad",
		unit: "/ronda",
	},
	{ key: "plants", rating: "plants", label: "Plantas", unit: "/ronda" },
	{ key: "defuses", rating: "defuses", label: "Defuses", unit: "/ronda" },
] as const

export const RATING_ORDER = [
	"double_down",
	"down",
	"neutral",
	"up",
	"double_up",
] as const

const humanize = (key: string) =>
	key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

export function perfCategories(
	breakdowns: Record<string, number>[],
): { key: string; rating: string; label: string; unit: string }[] {
	const known = new Set<string>(PERF_CATEGORIES.map((c) => c.key))
	const extra = [...new Set(breakdowns.flatMap((b) => Object.keys(b)))]
		.filter((k) => !known.has(k))
		.map((k) => ({ key: k, rating: k, label: humanize(k), unit: "/ronda" }))
	return [...PERF_CATEGORIES, ...extra]
}

export function perfBreakdown(games: Game[]) {
	const perfs = games.map((g) => g.d?.perf).filter(Boolean) as NonNullable<
		Detail["perf"]
	>[]
	return perfCategories(perfs.map((p) => p.breakdown)).map((c) => {
		const values = perfs
			.map((p) => p.breakdown[c.key])
			.filter((v) => Number.isFinite(v))
		const dist = Object.fromEntries(RATING_ORDER.map((r) => [r, 0])) as Record<
			(typeof RATING_ORDER)[number],
			number
		>
		for (const p of perfs) {
			const r = p.ratings[c.rating] as (typeof RATING_ORDER)[number] | undefined
			if (r && r in dist) dist[r]++
		}
		return {
			...c,
			avg: values.length
				? values.reduce((a, v) => a + v, 0) / values.length
				: 0,
			dist,
			n: perfs.length,
		}
	})
}

export function byParty(games: Game[]) {
	const label = (n: number) =>
		n <= 1
			? "Solo"
			: n === 2
				? "Dúo"
				: n === 3
					? "Trío"
					: n >= 5
						? "5-stack"
						: `${n} amigos`
	return groupBy(
		games.filter((g) => g.d),
		(g) => label(g.d!.party),
	)
}

export const matchRounds = (m: Match) =>
	Math.max(1, m.rounds.length || m.teams.Red.rounds + m.teams.Blue.rounds)

export function lineFor(m: Match, p: PlayerLine): Line {
	const rounds = matchRounds(m)
	const shots = p.headshots + p.bodyshots + p.legshots
	const ranked = [...m.players].sort((a, b) => b.score - a.score)
	return {
		...p,
		rounds,
		acs: p.score / rounds,
		adr: p.damageDealt / rounds,
		kd: p.kills / Math.max(1, p.deaths),
		hs: shots ? p.headshots / shots : 0,
		placement: ranked.indexOf(p) + 1,
		teamPlacement: ranked.filter((x) => x.team === p.team).indexOf(p) + 1,
	}
}
