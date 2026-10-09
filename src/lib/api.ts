import { recordLimits } from "@/lib/ratelimit"
import { deriveFromKills } from "@/lib/derive"
import type { Game } from "@/interfaces/game"
import type {
	KillEvent,
	Match,
	PlayerLine,
	RoundInfo,
} from "@/interfaces/match"
import type {
	Perf,
	Profile,
	RRPoint,
	SeasonRecord,
	TeamId,
} from "@/interfaces/player"

const BASE = "https://api.henrikdev.xyz"
export const PLATFORM = "pc"

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message)
	}
}

export function apiKey(): string | undefined {
	return (
		process.env.HENRIKDEV_API_KEY ||
		import.meta.env.HENRIKDEV_API_KEY ||
		undefined
	)
}

export async function request<T = any>(
	path: string,
): Promise<{
	data: T
	results?: { total: number; returned: number; after: number }
}> {
	const res = await fetch(BASE + path, {
		headers: { Authorization: apiKey() ?? "", Accept: "application/json" },
		signal: AbortSignal.timeout(45_000),
	})
	recordLimits(res)
	if (!res.ok) {
		let message = `API ${res.status}`
		try {
			const body = (await res.json()) as any
			message = body?.errors?.[0]?.message ?? body?.message ?? message
		} catch {}
		throw new ApiError(res.status, message)
	}
	return (await res.json()) as any
}

export const enc = encodeURIComponent

const QUEUE_ALIASES: Record<string, string> = {
	hurm: "teamdeathmatch",
	ggteam: "escalation",
	customgame: "custom",
}
export const canonicalQueue = (v: string) => {
	const k = String(v ?? "")
		.toLowerCase()
		.replace(/[\s_-]/g, "")
	return QUEUE_ALIASES[k] ?? k
}
export const NO_ROUNDS = new Set(["deathmatch", "teamdeathmatch"])

export function normalizeProfile(account: any, mmr: any): Profile {
	const card =
		typeof account.card === "string" ? account.card : account.card?.id
	const seasons: SeasonRecord[] = (mmr?.seasonal ?? [])
		.map((s: any) => ({
			season: s.season?.short ?? s.season?.id ?? "?",
			wins: s.wins ?? 0,
			games: s.games ?? 0,
			endTier: s.end_tier?.id ?? 0,
			endTierName: s.end_tier?.name ?? "Unrated",
			actWins: (s.act_wins ?? [])
				.map((w: any) => w.id ?? 0)
				.sort((a: number, b: number) => b - a),
		}))
		.reverse()

	return {
		puuid: account.puuid,
		name: account.name,
		tag: account.tag,
		region: account.region ?? "—",
		level: account.account_level ?? 0,
		cardId: card ?? null,
		title: typeof account.title === "string" ? account.title : null,
		rank: {
			tier: mmr?.current?.tier?.id ?? 0,
			name: mmr?.current?.tier?.name ?? "Unrated",
			rr: mmr?.current?.rr ?? 0,
			lastChange: mmr?.current?.last_change ?? 0,
			elo: mmr?.current?.elo ?? 0,
		},
		peak: mmr?.peak?.tier
			? {
					tier: mmr.peak.tier.id,
					name: mmr.peak.tier.name,
					season: mmr.peak.season?.short ?? "",
				}
			: null,
		seasons,
	}
}

export function storedToGame(raw: any): Game | null {
	const meta = raw?.meta
	const s = raw?.stats
	if (!meta?.id || !s) return null
	const team: TeamId = String(s.team).toLowerCase() === "red" ? "Red" : "Blue"
	const red = raw.teams?.red ?? 0
	const blue = raw.teams?.blue ?? 0
	const my = team === "Red" ? red : blue
	const their = team === "Red" ? blue : red
	return {
		id: meta.id,
		map: meta.map?.name ?? "—",
		mode: meta.mode ?? "",
		queue: canonicalQueue(meta.mode),
		startedAt: meta.started_at,
		season: meta.season?.short ?? "",
		agent: s.character?.name ?? "?",
		tier: s.tier ?? 0,
		team,
		score: s.score ?? 0,
		kills: s.kills ?? 0,
		deaths: s.deaths ?? 0,
		assists: s.assists ?? 0,
		head: s.shots?.head ?? 0,
		body: s.shots?.body ?? 0,
		leg: s.shots?.leg ?? 0,
		dealt: s.damage?.made ?? 0,
		received: s.damage?.received ?? 0,
		my,
		their,
		result: my > their ? "W" : my < their ? "L" : "D",
	}
}

export function storedToRR(h: any): RRPoint {
	return {
		matchId: h.match_id,
		date: h.date,
		tier: h.tier?.id ?? 0,
		tierName: h.tier?.name ?? "",
		rr: h.ranking_in_tier ?? h.rr ?? 0,
		change: h.last_mmr_change ?? h.last_change ?? 0,
		elo: h.elo ?? 0,
		map: h.map?.name ?? "",
		season: h.season?.short ?? "",
	}
}

const asTeam = (t: unknown): TeamId =>
	String(t).toLowerCase() === "red" ? "Red" : "Blue"
const pos = (l: any): [number, number] | null =>
	l && Number.isFinite(l.x) ? [Math.round(l.x), Math.round(l.y)] : null

function normalizePerf(p: any): Perf | null {
	if (!p || !Number.isFinite(p.score)) return null
	const ratings: Record<string, string> = {}
	for (const group of Object.values(p.ratings ?? {}))
		if (group && typeof group === "object") Object.assign(ratings, group)
	return {
		score: Math.round(p.score),
		grade: p.ratings?.grade ?? "",
		breakdown: Object.fromEntries(
			Object.entries(p.breakdown ?? {}).map(([k, v]) => [k, Number(v) || 0]),
		),
		ratings,
	}
}

export function normalizeMatch(raw: any): Match | null {
	const meta = raw?.metadata
	if (!meta) return null

	const players: PlayerLine[] = (raw.players ?? []).map((p: any) => ({
		puuid: p.puuid,
		name: p.name,
		tag: p.tag,
		team: asTeam(p.team_id),
		agent: p.agent?.name ?? "?",
		agentId: p.agent?.id ?? "",
		tier: p.tier?.id ?? 0,
		level: p.account_level ?? 0,
		partyId: p.party_id ?? p.puuid,
		score: p.stats?.score ?? 0,
		kills: p.stats?.kills ?? 0,
		deaths: p.stats?.deaths ?? 0,
		assists: p.stats?.assists ?? 0,
		headshots: p.stats?.headshots ?? 0,
		bodyshots: p.stats?.bodyshots ?? 0,
		legshots: p.stats?.legshots ?? 0,
		damageDealt: p.stats?.damage?.dealt ?? 0,
		damageReceived: p.stats?.damage?.received ?? 0,
		firstKills: 0,
		firstDeaths: 0,
		kast: 0,
		multiKills: 0,
		plants: 0,
		defuses: 0,
		perf: normalizePerf(p.performance),
		casts: {
			c: p.ability_casts?.grenade ?? 0,
			q: p.ability_casts?.ability1 ?? 0,
			e: p.ability_casts?.ability2 ?? 0,
			x: p.ability_casts?.ultimate ?? 0,
		},
		spent: p.economy?.spent?.overall ?? 0,
		friendlyFire: p.behavior?.friendly_fire?.outgoing ?? 0,
	}))

	const rounds: RoundInfo[] = (raw.rounds ?? []).map((r: any, i: number) => {
		const planter = r.plant?.player?.puuid
		const defuser = r.defuse?.player?.puuid
		for (const p of players) {
			if (p.puuid === planter) p.plants++
			if (p.puuid === defuser) p.defuses++
		}
		const winner = asTeam(r.winning_team)
		const role = String(r.winning_team_role ?? "").toLowerCase()
		const attackers: TeamId | undefined = role
			? role.startsWith("att")
				? winner
				: winner === "Red"
					? "Blue"
					: "Red"
			: r.plant?.player?.team
				? asTeam(r.plant.player.team)
				: undefined
		return {
			index: r.id ?? i,
			winner,
			attackers,
			result: r.result ?? "Elimination",
			planted: !!r.plant,
			defused: !!r.defuse,
			players: (r.stats ?? []).map((s: any) => ({
				puuid: s.player?.puuid ?? "",
				loadout: s.economy?.loadout_value ?? 0,
				weaponId: (s.economy?.weapon?.id ?? "").toLowerCase(),
				weapon: s.economy?.weapon?.name ?? "",
				hs: s.stats?.headshots ?? 0,
				bs: s.stats?.bodyshots ?? 0,
				ls: s.stats?.legshots ?? 0,
				damage: (s.damage_events ?? []).reduce(
					(a: number, e: any) => a + (e.damage ?? 0),
					0,
				),
			})),
		}
	})

	const kills: KillEvent[] = (raw.kills ?? []).map((k: any) => ({
		round: k.round ?? 0,
		timeMs: k.time_in_round_in_ms ?? 0,
		killer: k.killer?.puuid ?? "",
		victim: k.victim?.puuid ?? "",
		assistants: (k.assistants ?? []).map((a: any) => a.puuid),
		// `name` is sometimes null for newer weapons; resolved later from the catalog by id.
		weapon: k.weapon?.name ?? (k.weapon?.type === "Ability" ? "Ability" : ""),
		weaponId: (k.weapon?.id ?? "").toLowerCase(),
		weaponType: k.weapon?.type ?? "Weapon",
		victimPos: pos(k.location),
		killerPos: pos(
			(k.player_locations ?? []).find(
				(l: any) => l.player?.puuid === k.killer?.puuid,
			)?.location,
		),
	}))

	deriveFromKills(players, kills, rounds)

	const team = (id: TeamId) => {
		const t = (raw.teams ?? []).find((x: any) => asTeam(x.team_id) === id)
		return { rounds: t?.rounds?.won ?? 0, won: !!t?.won }
	}
	const teamMvp: Match["teamMvp"] = {}
	for (const t of raw.teams ?? [])
		if (t.mvp?.puuid) teamMvp[asTeam(t.team_id)] = t.mvp.puuid

	return {
		id: meta.match_id,
		map: meta.map?.name ?? "Unknown",
		mapId: meta.map?.id ?? "",
		mode: meta.queue?.name ?? meta.queue?.id ?? "",
		queue: canonicalQueue(meta.queue?.id ?? meta.queue?.name ?? ""),
		startedAt: meta.started_at,
		durationMs: meta.game_length_in_ms ?? 0,
		season: meta.season?.short ?? "",
		mvp: meta.mvp?.puuid ?? null,
		teamMvp,
		teams: { Red: team("Red"), Blue: team("Blue") },
		players,
		rounds,
		kills,
	}
}

export function gameFromMatch(m: Match, puuid: string): Game | null {
	const p = m.players.find((x) => x.puuid === puuid)
	if (!p) return null
	const other: TeamId = p.team === "Red" ? "Blue" : "Red"
	const my = m.teams[p.team].rounds
	const their = m.teams[other].rounds
	return {
		id: m.id,
		map: m.map,
		mode: m.mode,
		queue: m.queue,
		startedAt: m.startedAt,
		season: m.season,
		agent: p.agent,
		tier: p.tier,
		team: p.team,
		score: p.score,
		kills: p.kills,
		deaths: p.deaths,
		assists: p.assists,
		head: p.headshots,
		body: p.bodyshots,
		leg: p.legshots,
		dealt: p.damageDealt,
		received: p.damageReceived,
		my,
		their,
		result: m.teams[p.team].won || my > their ? "W" : my < their ? "L" : "D",
	}
}
