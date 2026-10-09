import { getCatalog } from "@/lib/catalog"
import { NO_ROUNDS, normalizeProfile } from "@/lib/api"
import { filterGames, groupBy } from "@/lib/stats"
import { getStorage } from "@/lib/storage"
import type { Catalog } from "@/interfaces/catalog"
import type { SyncStatus } from "@/interfaces/dashboard"
import type { Game } from "@/interfaces/game"
import type { Profile, RRPoint } from "@/interfaces/player"
import type { Group, Period, Summary } from "@/interfaces/stats"

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
}

export function json(
	body: unknown,
	status = 200,
	cache = "public, max-age=30",
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": cache,
			...CORS,
		},
	})
}

export const apiError = (status: number, message: string) =>
	json({ error: { status, message } }, status, "no-store")

export const preflight = () =>
	new Response(null, { status: 204, headers: CORS })

interface Snapshot {
	profile: Profile
	games: Game[]
	rrHistory: RRPoint[]
	sync: SyncStatus
	catalog: Catalog
}

const CACHE_MS = 30_000
let cached: { at: number; data: Snapshot } | null = null
let refreshing: Promise<Snapshot | null> | null = null

/** Reads from the database; a stale copy is served instantly while it refreshes in the background. */
async function snapshot(): Promise<Snapshot | null> {
	if (cached && Date.now() - cached.at < CACHE_MS) return cached.data
	refreshing ??= readSnapshot()
		.catch(() => null)
		.finally(() => {
			refreshing = null
		})
	return cached ? cached.data : refreshing
}

async function readSnapshot(): Promise<Snapshot | null> {
	const storage = await getStorage()
	const { meta } = await storage.loadAll("")
	const account = (meta["account"] as { data: any } | undefined)?.data
	if (!account?.puuid) return null
	const mmr = (meta["mmr"] as { data: any } | undefined)?.data
	const sync = (meta["sync"] as Record<string, any> | undefined) ?? {}
	const { games, rr } = await storage.loadAll(account.puuid)
	const catalog = await getCatalog()

	const rrById = new Map(rr.map((p) => [p.matchId, p]))
	const sorted = games
		.map((g) => {
			const change = rrById.get(g.id)?.change
			return change === undefined ? g : { ...g, rr: change }
		})
		.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
	const rrHistory = rr
		.map((p) => ({
			...p,
			tierName: p.tierName || catalog.tiers[p.tier]?.name || "",
		}))
		.sort((a, b) => +new Date(a.date) - +new Date(b.date))
	const detailable = sorted.filter((g) => !NO_ROUNDS.has(g.queue))

	const data: Snapshot = {
		profile: normalizeProfile(account, mmr),
		games: sorted,
		rrHistory,
		catalog,
		sync: {
			total: Math.max(sync.storedTotal ?? 0, sorted.length),
			known: sorted.length,
			detailed: sorted.filter((g) => g.d).length,
			detailable: detailable.length,
			rrPoints: rrHistory.length,
			working: detailable.some((g) => !g.d),
			rateLimited: false,
			lastSyncAt: sync.lastSyncAt ?? null,
		},
	}
	cached = { at: Date.now(), data }
	return data
}

const PERIODS: Period[] = ["all", "act", "50", "20"]

export function intParam(
	url: URL,
	name: string,
	fallback: number,
	min: number,
	max: number,
) {
	const raw = Number(url.searchParams.get(name))
	if (!url.searchParams.has(name) || !Number.isFinite(raw)) return fallback
	return Math.min(max, Math.max(min, Math.floor(raw)))
}

/** Loads the snapshot and applies the shared mode/period filters. */
export async function context(url: URL) {
	const snap = await snapshot().catch(() => null)
	if (!snap)
		return {
			ok: false as const,
			response: apiError(
				503,
				"Todavía no hay datos sincronizados en la base de datos.",
			),
		}
	const mode = url.searchParams.get("mode") ?? "competitive"
	const rawPeriod = url.searchParams.get("period") ?? "all"
	if (!PERIODS.includes(rawPeriod as Period))
		return {
			ok: false as const,
			response: apiError(400, `period debe ser uno de: ${PERIODS.join(", ")}`),
		}
	const period = rawPeriod as Period
	return {
		ok: true as const,
		data: snap,
		catalog: snap.catalog,
		games: filterGames(snap.games, mode, period),
		filters: { mode, period },
	}
}

const ref = (g: Game) => ({
	matchId: g.id,
	map: g.map,
	agent: g.agent,
	startedAt: g.startedAt,
})

export function publicSummary(s: Summary) {
	const { best, ...rest } = s
	return {
		...rest,
		best: Object.fromEntries(
			Object.entries(best).map(([k, b]) => [
				k,
				b && { value: b.value, ...ref(b.game) },
			]),
		),
	}
}

export function publicGroups(games: Game[], keyOf: (g: Game) => string) {
	return groupBy(games, keyOf).map((g: Group) => ({
		key: g.key,
		games: g.games,
		wins: g.wins,
		losses: g.losses,
		draws: g.draws,
		winRate: g.winRate,
		kd: g.kd,
		kda: g.kda,
		acs: g.acs,
		adr: g.adr,
		hs: g.hs,
		kast: g.detailed ? g.kast : null,
		perf: g.perfN ? g.perf : null,
		fkPerMatch: g.detailed ? g.fkPerMatch : null,
		atkWinRate: g.detailed ? g.atkWinRate : null,
		defWinRate: g.detailed ? g.defWinRate : null,
		detailed: g.detailed,
	}))
}
