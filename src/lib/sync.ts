import { getCatalog } from "@/lib/catalog"
import { DETAIL_VERSION, deriveDetail } from "@/lib/derive"
import {
	ApiError,
	NO_ROUNDS,
	apiKey,
	PLATFORM,
	enc,
	gameFromMatch,
	normalizeMatch,
	request,
	storedToGame,
	storedToRR,
} from "@/lib/api"
import { canSpend, isLimited } from "@/lib/ratelimit"
import { getStorage } from "@/lib/storage"
import type { Catalog } from "@/interfaces/catalog"
import type { Game } from "@/interfaces/game"
import type { Match } from "@/interfaces/match"
import type { RRPoint } from "@/interfaces/player"

const MIN = 60_000
const TICK_MS = 2500
const RESERVE = 8
const HEAD_TTL = 2 * MIN
const PAGE = 100

interface SyncMeta {
	storedTotal: number
	storedNextPage: number // 0 = backfill complete
	rrTotal: number
	rrNextPage: number
	failed: Record<string, number>
	lastSyncAt: string | null
}

interface Archive {
	player: { name: string; tag: string }
	account: { data: any; at: number } | null
	mmr: { data: any; at: number } | null
	games: Map<string, Game>
	rr: Map<string, RRPoint>
	meta: SyncMeta
	headAt: number
	rrHeadAt: number
	working: boolean
	error: string | null
	backoff: Map<string, { until: number; fails: number }>
}

const g = globalThis as typeof globalThis & {
	__vsArchive?: Promise<Archive>
	__vsTimer?: ReturnType<typeof setInterval>
}

export function getArchive(player: {
	name: string
	tag: string
}): Promise<Archive> {
	g.__vsArchive ??= (async () => {
		const storage = await getStorage()
		const a: Archive = {
			player,
			account: null,
			mmr: null,
			games: new Map(),
			rr: new Map(),
			meta: {
				storedTotal: 0,
				storedNextPage: 1,
				rrTotal: 0,
				rrNextPage: 1,
				failed: {},
				lastSyncAt: null,
			},
			headAt: 0,
			rrHeadAt: 0,
			working: false,
			error: null,
			backoff: new Map(),
		}
		const account = (await storage.loadAll("__meta__")).meta
		a.account = (account["account"] as Archive["account"]) ?? null
		a.mmr = (account["mmr"] as Archive["mmr"]) ?? null
		a.meta = { ...a.meta, ...((account["sync"] as SyncMeta) ?? {}) }
		if (
			a.account &&
			`${a.account.data.name}#${a.account.data.tag}`.toLowerCase() !==
				`${player.name}#${player.tag}`.toLowerCase()
		) {
			a.account = null
			a.mmr = null
		}
		if (a.account) {
			const { games, rr } = await storage.loadAll(a.account.data.puuid)
			for (const x of games) a.games.set(x.id, x)
			for (const x of rr) a.rr.set(x.matchId, x)
		}
		startTimer(a)
		return a
	})()
	return g.__vsArchive
}

// Dev HMR: an archive created by a previous version of this module keeps its data but gets this
// version's sync loop.
if (g.__vsArchive)
	void g.__vsArchive.then((a) => {
		a.backoff ??= new Map()
		startTimer(a)
	})

function startTimer(a: Archive) {
	clearInterval(g.__vsTimer) // HMR: replace the old module's loop
	g.__vsTimer = setInterval(() => void tick(a), TICK_MS)
	void tick(a)
}

export async function warmUp(
	a: Archive,
	done: () => boolean,
	timeoutMs = 25_000,
) {
	const until = Date.now() + timeoutMs
	while (!done() && Date.now() < until && !a.error) {
		await tick(a)
		await new Promise((r) => setTimeout(r, 300))
	}
}

type Task = { key: string; cost: number; run: () => Promise<void> }

function nextTask(a: Archive): Task | null {
	for (const task of candidates(a)) {
		const b = a.backoff.get(task.key)
		if (!b || Date.now() >= b.until) return task
	}
	return null
}

function* candidates(a: Archive): Generator<Task> {
	const now = Date.now()
	const { name, tag } = a.player
	const acc = a.account?.data

	if (!acc || now - a.account!.at > 24 * 60 * MIN) {
		yield {
			key: "account",
			cost: 1,
			run: async () => {
				const { data } = await request(
					`/valorant/v2/account/${enc(name)}/${enc(tag)}`,
				)
				a.account = { data, at: Date.now() }
				await (await getStorage()).setMeta("account", a.account)
			},
		}
		return
	}
	const region = acc.region ?? "eu"
	const id = `${enc(acc.name)}/${enc(acc.tag)}`

	if (!a.mmr || now - a.mmr.at > HEAD_TTL) {
		yield {
			key: "mmr",
			cost: 1,
			run: async () => {
				const { data } = await request(
					`/valorant/v3/mmr/${region}/${PLATFORM}/${id}`,
				)
				a.mmr = { data, at: Date.now() }
				await (await getStorage()).setMeta("mmr", a.mmr)
			},
		}
	}

	if (now - a.headAt > HEAD_TTL) {
		yield {
			key: "stored-head",
			cost: 1,
			run: () => storedPage(a, region, id, 1, 25, true),
		}
	}
	if (now - a.rrHeadAt > HEAD_TTL) {
		yield {
			key: "rr-head",
			cost: 1,
			run: () => rrPage(a, region, id, 1, 25, true),
		}
	}
	if (a.meta.storedNextPage) {
		const page = a.meta.storedNextPage
		yield {
			key: `stored-${page}`,
			cost: 1,
			run: () => storedPage(a, region, id, page, PAGE, false),
		}
	}
	if (a.meta.rrNextPage) {
		const page = a.meta.rrNextPage
		yield {
			key: `rr-${page}`,
			cost: 1,
			run: () => rrPage(a, region, id, page, PAGE, false),
		}
	}

	const pending = [...a.games.values()]
		.filter(
			(x) => !x.d && !NO_ROUNDS.has(x.queue) && (a.meta.failed[x.id] ?? 0) < 3,
		)
		.sort((x, y) => +new Date(y.startedAt) - +new Date(x.startedAt))
	for (const p of pending)
		yield {
			key: `detail-${p.id}`,
			cost: 2,
			run: () => fetchDetail(a, p.id, region).then(() => {}),
		}

	const outdated = [...a.games.values()]
		.filter((x) => x.d && (x.d.v ?? 1) < DETAIL_VERSION)
		.slice(0, 25)
	if (outdated.length)
		yield {
			key: `rederive-${outdated[0].id}`,
			cost: 0,
			run: () => rederive(a, outdated),
		}
}

async function tick(a: Archive) {
	if (a.working || !apiKey()) return
	const task = nextTask(a)
	if (!task) return
	if (task.cost > 0 && (isLimited() || !canSpend(task.cost, RESERVE))) return
	a.working = true
	try {
		await task.run()
		a.backoff.delete(task.key)
		a.error = null
		a.meta.lastSyncAt = new Date().toISOString()
	} catch (err) {
		// Exponential backoff per task (30 s, 1 min, 2 min… capped at 30 min) so one bad endpoint can't stall the rest.
		if (!(err instanceof ApiError && err.status === 429)) {
			const fails = (a.backoff.get(task.key)?.fails ?? 0) + 1
			a.backoff.set(task.key, {
				fails,
				until: Date.now() + Math.min(30 * MIN, 30_000 * 2 ** (fails - 1)),
			})
		}
		if (err instanceof ApiError && err.status === 404 && !a.account)
			a.error = `No encontramos ${a.player.name}#${a.player.tag}.`
		else if (
			err instanceof ApiError &&
			(err.status === 401 || err.status === 403)
		)
			a.error = "La API key no es válida."
		if (!(err instanceof ApiError && err.status === 429))
			console.warn(`[sync] ${task.key}:`, (err as Error).message)
	} finally {
		a.working = false
		void (await getStorage()).setMeta("sync", a.meta).catch(() => {})
	}
}

async function storedPage(
	a: Archive,
	region: string,
	id: string,
	page: number,
	size: number,
	head: boolean,
) {
	const res = await request<any[]>(
		`/valorant/v1/stored-matches/${region}/${id}?page=${page}&size=${size}`,
	)
	const games = res.data.map(storedToGame).filter(Boolean) as Game[]
	const fresh = games.filter((x) => !a.games.has(x.id))
	for (const x of games) {
		const existing = a.games.get(x.id)
		a.games.set(x.id, existing ? { ...x, d: existing.d } : x) // never drop a detail we already paid for
	}
	if (a.account)
		await (
			await getStorage()
		).saveGames(a.account.data.puuid, head ? fresh : games)
	a.meta.storedTotal = res.results?.total ?? a.meta.storedTotal

	if (head) {
		a.headAt = Date.now()
		// A whole page of unseen matches means there's a gap — re-run the backfill.
		if (
			fresh.length === games.length &&
			games.length === size &&
			!a.meta.storedNextPage
		)
			a.meta.storedNextPage = 1
	} else {
		a.meta.storedNextPage = (res.results?.after ?? 0) > 0 ? page + 1 : 0
	}
}

async function rrPage(
	a: Archive,
	region: string,
	id: string,
	page: number,
	size: number,
	head: boolean,
) {
	const res = await request<any[]>(
		`/valorant/v1/stored-mmr-history/${region}/${id}?page=${page}&size=${size}`,
	)
	const points = res.data.map(storedToRR)
	const fresh = points.filter((p) => !a.rr.has(p.matchId))
	for (const p of points) a.rr.set(p.matchId, p)
	if (a.account)
		await (
			await getStorage()
		).saveRR(a.account.data.puuid, head ? fresh : points)
	a.meta.rrTotal = res.results?.total ?? a.meta.rrTotal
	if (head) {
		a.rrHeadAt = Date.now()
		if (
			fresh.length === points.length &&
			points.length === size &&
			!a.meta.rrNextPage
		)
			a.meta.rrNextPage = 1
	} else {
		a.meta.rrNextPage = (res.results?.after ?? 0) > 0 ? page + 1 : 0
	}
}

async function fetchDetail(
	a: Archive,
	matchId: string,
	region: string,
): Promise<Match | null> {
	const storage = await getStorage()
	try {
		const { data } = await request(
			`/valorant/v4/match/${region}/${enc(matchId)}`,
		)
		const match = normalizeMatch(data)
		if (!match) throw new ApiError(404, "empty match")
		await storage.saveMatch(match)
		attachDetail(a, match)
		return match
	} catch (err) {
		if (err instanceof ApiError && err.status !== 429)
			a.meta.failed[matchId] = (a.meta.failed[matchId] ?? 0) + 1
		throw err
	}
}

function attachDetail(a: Archive, match: Match) {
	const puuid = a.account?.data.puuid
	if (!puuid) return
	const base = a.games.get(match.id) ?? gameFromMatch(match, puuid)
	if (!base) return
	const game: Game = { ...base, d: deriveDetail(match, puuid) }
	a.games.set(game.id, game)
	void getStorage().then((s) => s.saveGames(puuid, [game]))
}

/** Recomputes stored details after the derivation logic changes; reads storage only. */
async function rederive(a: Archive, games: Game[]) {
	const puuid = a.account?.data.puuid
	if (!puuid) return
	const storage = await getStorage()
	const updated: Game[] = []
	for (const g of games) {
		const match = await storage.getMatch(g.id)
		const d = match ? deriveDetail(match, puuid) : undefined
		const game: Game = { ...g, d: d ?? { ...g.d!, v: DETAIL_VERSION } }
		a.games.set(game.id, game)
		updated.push(game)
	}
	await storage.saveGames(puuid, updated)
}

export async function getMatch(
	a: Archive,
	matchId: string,
): Promise<Match | null> {
	const storage = await getStorage()
	const stored = await storage.getMatch(matchId)
	if (stored) return stored
	const region = a.account?.data.region
	if (!region || !canSpend(2, 2)) return null
	return fetchDetail(a, matchId, region).catch(() => null)
}
