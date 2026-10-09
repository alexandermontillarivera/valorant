import type { Detail } from "@/interfaces/game"
import { roundSides } from "@/lib/sides"
import { weaponKey } from "@/lib/weapons"
import type {
	KillEvent,
	Match,
	PlayerLine,
	RoundInfo,
} from "@/interfaces/match"
import type { TeamId } from "@/interfaces/player"

const TRADE_WINDOW_MS = 5000

function byRound(kills: KillEvent[]) {
	const map = new Map<number, KillEvent[]>()
	for (const k of kills) {
		const list = map.get(k.round) ?? []
		list.push(k)
		map.set(k.round, list)
	}
	for (const list of map.values()) list.sort((a, b) => a.timeMs - b.timeMs)
	return map
}

function isTraded(
	death: KillEvent,
	list: KillEvent[],
	team: Map<string, TeamId>,
) {
	const victimTeam = team.get(death.victim)
	return list.some(
		(k) =>
			k.victim === death.killer &&
			k.timeMs >= death.timeMs &&
			k.timeMs - death.timeMs <= TRADE_WINDOW_MS &&
			team.get(k.killer) === victimTeam,
	)
}

export function deriveFromKills(
	players: PlayerLine[],
	kills: KillEvent[],
	rounds: RoundInfo[],
) {
	const rounds_ = byRound(kills)
	const team = new Map(players.map((p) => [p.puuid, p.team]))
	const roundCount = Math.max(
		rounds.length,
		...[...rounds_.keys()].map((r) => r + 1),
		1,
	)

	for (const p of players) {
		let kastRounds = 0
		let firstKills = 0
		let firstDeaths = 0
		let multi = 0

		for (let r = 0; r < roundCount; r++) {
			const list = rounds_.get(r) ?? []
			const first = list[0]
			if (first?.killer === p.puuid) firstKills++
			if (first?.victim === p.puuid) firstDeaths++

			const myKills = list.filter((k) => k.killer === p.puuid).length
			if (myKills >= 3) multi++

			const assisted = list.some((k) => k.assistants.includes(p.puuid))
			const death = list.find((k) => k.victim === p.puuid)
			if (myKills > 0 || assisted || !death || isTraded(death, list, team))
				kastRounds++
		}

		p.firstKills = firstKills
		p.firstDeaths = firstDeaths
		p.multiKills = multi
		p.kast = kills.length ? kastRounds / roundCount : p.kast
	}
}

const dist = (a: [number, number] | null, b: [number, number] | null) =>
	a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) / 100 : null // cm -> m

export const DETAIL_VERSION = 4

const buyOf = (avgLoadout: number, pistol: boolean): keyof Detail["buys"] =>
	pistol
		? "pistol"
		: avgLoadout < 2000
			? "eco"
			: avgLoadout < 3700
				? "force"
				: "full"

export function deriveDetail(m: Match, puuid: string): Detail | undefined {
	const me = m.players.find((p) => p.puuid === puuid)
	if (!me) return undefined
	const team = new Map(m.players.map((p) => [p.puuid, p.team]))
	const enemy: TeamId = me.team === "Red" ? "Blue" : "Red"
	const rounds = byRound(m.kills)
	const sides = roundSides(m)
	const agentOf = new Map(m.players.map((p) => [p.puuid, p.agent]))

	const ranked = [...m.players].sort((a, b) => b.score - a.score)
	const d: Detail = {
		v: DETAIL_VERSION,
		perf: me.perf,
		placement: ranked.indexOf(me) + 1,
		teamPlacement: ranked.filter((p) => p.team === me.team).indexOf(me) + 1,
		mvp: m.mvp === puuid ? 1 : m.teamMvp[me.team] === puuid ? 2 : 0,
		durationMs: m.durationMs,
		kast: me.kast,
		fk: me.firstKills,
		fd: me.firstDeaths,
		tradeKills: 0,
		tradedDeaths: 0,
		multi: [0, 0, 0, 0],
		clutch: { att: [0, 0, 0, 0, 0], won: [0, 0, 0, 0, 0] },
		flawless: 0,
		thrifty: 0,
		buys: { pistol: [0, 0], eco: [0, 0], force: [0, 0], full: [0, 0] },
		sides: { atk: [0, 0], def: [0, 0] },
		casts: me.casts,
		plants: me.plants,
		defuses: me.defuses,
		spent: me.spent,
		friendlyFire: me.friendlyFire,
		allyTier: avgTier(m.players.filter((p) => p.team === me.team && p !== me)),
		enemyTier: avgTier(m.players.filter((p) => p.team === enemy)),
		party: m.players.filter((p) => p.partyId === me.partyId).length,
		weapons: {},
		killedBy: {},
		pts: [],
	}

	const weapon = (key: string) =>
		(d.weapons[key] ??= {
			k: 0,
			hs: 0,
			bs: 0,
			ls: 0,
			dmg: 0,
			dist: 0,
			distN: 0,
		})

	m.rounds.forEach((r, i) => {
		const list = rounds.get(r.index) ?? []
		const won = r.winner === me.team
		const side = me.team === sides.attackers[i] ? "atk" : "def"
		d.sides[side][1]++
		if (won) d.sides[side][0]++

		const loadout = (t: TeamId) =>
			r.players
				.filter((p) => team.get(p.puuid) === t)
				.reduce((a, p) => a + p.loadout, 0)
		if (r.players.length) {
			const mine = loadout(me.team)
			const theirs = loadout(enemy)
			const buy = buyOf(mine / 5, sides.pistol.has(i))
			d.buys[buy][1]++
			if (won) d.buys[buy][0]++
			if (won && buy !== "pistol" && mine < theirs * 0.65) d.thrifty++
		}

		const slice = r.players.find((p) => p.puuid === puuid)
		if (slice && slice.weaponId) {
			const w = weapon(
				weaponKey(slice.weaponId, slice.weapon, "Weapon", me.agent),
			)
			w.hs += slice.hs
			w.bs += slice.bs
			w.ls += slice.ls
			w.dmg += slice.damage
		}

		const myKills = list.filter((k) => k.killer === puuid).length
		if (myKills >= 2) d.multi[Math.min(myKills, 5) - 2]++
		if (won && !list.some((k) => team.get(k.victim) === me.team)) d.flawless++

		const alive: Record<TeamId, Set<string>> = {
			Red: new Set(
				m.players.filter((p) => p.team === "Red").map((p) => p.puuid),
			),
			Blue: new Set(
				m.players.filter((p) => p.team === "Blue").map((p) => p.puuid),
			),
		}
		let clutchVs = 0
		for (const k of list) {
			const vt = team.get(k.victim)
			if (vt) alive[vt].delete(k.victim)
			const mates = alive[me.team]
			if (
				!clutchVs &&
				mates.size === 1 &&
				mates.has(puuid) &&
				alive[enemy].size > 0
			)
				clutchVs = Math.min(alive[enemy].size, 5)
		}
		if (clutchVs) {
			d.clutch.att[clutchVs - 1]++
			if (won) d.clutch.won[clutchVs - 1]++
		}

		for (const k of list) {
			if (k.killer === puuid) {
				const w = weapon(
					weaponKey(k.weaponId, k.weapon, k.weaponType, me.agent),
				)
				w.k++
				const meters = dist(k.killerPos, k.victimPos)
				if (meters !== null) {
					w.dist += meters
					w.distN++
				}
				if (k.killerPos) d.pts.push([k.killerPos[0], k.killerPos[1], 0])
				if (
					list.some(
						(x) =>
							x.killer === k.victim &&
							team.get(x.victim) === me.team &&
							x.victim !== puuid &&
							k.timeMs - x.timeMs <= TRADE_WINDOW_MS &&
							k.timeMs >= x.timeMs,
					)
				)
					d.tradeKills++
			}
			if (k.victim === puuid) {
				const key = weaponKey(
					k.weaponId,
					k.weapon,
					k.weaponType,
					agentOf.get(k.killer),
				)
				d.killedBy[key] = (d.killedBy[key] ?? 0) + 1
				if (k.victimPos) d.pts.push([k.victimPos[0], k.victimPos[1], 1])
				if (isTraded(k, list, team)) d.tradedDeaths++
			}
		}
	})

	for (const [name, w] of Object.entries(d.weapons))
		if (!w.k && !w.dmg) delete d.weapons[name]
	return d
}

function avgTier(players: PlayerLine[]) {
	const ranked = players.filter((p) => p.tier > 2)
	return ranked.length
		? Math.round(
				(ranked.reduce((a, p) => a + p.tier, 0) / ranked.length) * 10,
			) / 10
		: 0
}
