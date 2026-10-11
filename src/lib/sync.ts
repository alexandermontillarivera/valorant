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
import type { Game } from "@/interfaces/game"
import type { Match } from "@/interfaces/match"
import type { RRPoint } from "@/interfaces/player"
import type { TrackedPlayer } from "@/interfaces/players"

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

export interface Archive {
	player: TrackedPlayer
	account: { data: any; at: number } | null
	mmr: { data: any; at: number } | null
	games: Map<string, Game>
	rr: Map<string, RRPoint>
	meta: SyncMeta
	headAt: number
	rrHeadAt: number
	error: string | null
	backoff: Map<string, { until: number; fails: number }>
}

const g = globalThis as typeof globalThis & {
	__vsArchives?: Map<string, Promise<Archive>>
	__vsReady?: Archive[]
	__vsTimer?: ReturnType<typeof setInterval>
	__vsWorking?: boolean
	__vsTurn?: number
}
const archives = (g.__vsArchives ??= new Map())
const ready = (g.__vsReady ??= [])

const metaKey = (kind: "account" | "mmr" | "sync", a: Archive) =>
	`${kind}:${a.player.slug}`

export function getArchive(player: TrackedPlayer): Promise<Archive> {
	let archive = archives.get(player.slug)
	if (!archive) {
		archive = load(player)
		archives.set(player.slug, archive)
	}
	return archive
}

async function load(player: TrackedPlayer): Promise<Archive> {
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
		error: null,
		backoff: new Map(),
	}
	const meta = await storage.loadMeta()
	const legacy = meta["account"] as Archive["account"] | undefined
	// Before multi-player support meta keys weren't namespaced; adopt them if they belong to this player.
	const ownsLegacy =
		!!legacy &&
		`${legacy.data.name}#${legacy.data.tag}`.toLowerCase() ===
			`${player.name}#${player.tag}`.toLowerCase()
	a.account =
		(meta[metaKey("account", a)] as Archive["account"]) ??
		(ownsLegacy ? legacy! : null)
	a.mmr =
		(meta[metaKey("mmr", a)] as Archive["mmr"]) ??
		(ownsLegacy ? (meta["mmr"] as Archive["mmr"]) : null) ??
		null
	a.meta = {
		...a.meta,
		...((meta[metaKey("sync", a)] ??
			(ownsLegacy ? meta["sync"] : undefined)) as SyncMeta | undefined),
	}
	if (a.account) {
		const { games, rr } = await storage.loadAll(a.account.data.puuid)
		for (const x of games) a.games.set(x.id, x)
		for (const x of rr) a.rr.set(x.matchId, x)
	}
	ready.push(a)
	startTimer()
	return a
}

// Dev HMR: archives created by a previous version of this module keep their data but get this
// version's sync loop.
if (ready.length) startTimer()

function startTimer() {
	clearInterval(g.__vsTimer)
	g.__vsTimer = setInterval(() => void tickAll(), TICK_MS)
}

export async function warmUp(
	a: Archive,
	done: () => boolean,
	timeoutMs = 25_000,
) {
	const until = Date.now() + timeoutMs
	while (!done() && Date.now() < until && !a.error) {
		const task = nextTask(a, false)
		if (task && affordable(task)) await runTask(a, task)
		await new Promise((r) => setTimeout(r, 300))
	}
}

type Task = {
	key: string
	cost: number
	urgent: boolean
	run: () => Promise<void>
}

const affordable = (t: Task) =>
	t.cost === 0 || (!isLimited() && canSpend(t.cost, RESERVE))

function nextTask(a: Archive, urgentOnly: boolean): Task | null {
	for (const task of candidates(a)) {
		if (urgentOnly && !task.urgent) continue
		const b = a.backoff.get(task.key)
		if (!b || Date.now() >= b.until) return task
	}
	return null
}

/** One request at a time across all players: fresh data for everyone first, then history by turns. */
async function tickAll() {
	if (g.__vsWorking || !apiKey() || !ready.length) return
	for (const urgentOnly of [true, false]) {
		for (let i = 0; i < ready.length; i++) {
			const idx = ((g.__vsTurn ?? 0) + i) % ready.length
			const a = ready[idx]
			const task = nextTask(a, urgentOnly)
			if (!task || !affordable(task)) continue
			g.__vsTurn = idx + 1
			await runTask(a, task)
			return
		}
	}
}

function* candidates(a: Archive): Generator<Task> {
	const now = Date.now()
	const { name, tag } = a.player
	const acc = a.account?.data

	if (!acc || now - a.account!.at > 24 * 60 * MIN) {
		yield {
			key: "account",
			cost: 1,
			urgent: true,
			run: async () => {
				const { data } = await request(
					`/valorant/v2/account/${enc(name)}/${enc(tag)}`,
				)
				a.account = { data, at: Date.now() }
				await (await getStorage()).setMeta(metaKey("account", a), a.account)
				if (!a.games.size) {
					const { games, rr } = await (await getStorage()).loadAll(data.puuid)
					for (const x of games) a.games.set(x.id, x)
					for (const x of rr) a.rr.set(x.matchId, x)
				}
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
			urgent: true,
			run: async () => {
				const { data } = await request(
					`/valorant/v3/mmr/${region}/${PLATFORM}/${id}`,
				)
				a.mmr = { data, at: Date.now() }
				await (await getStorage()).setMeta(metaKey("mmr", a), a.mmr)
			},
		}
	}

	if (now - a.headAt > HEAD_TTL) {
		yield {
			key: "stored-head",
			cost: 1,
			urgent: true,
			run: () => storedPage(a, region, id, 1, 25, true),
		}
	}
	if (now - a.rrHeadAt > HEAD_TTL) {
		yield {
			key: "rr-head",
			cost: 1,
			urgent: true,
			run: () => rrPage(a, region, id, 1, 25, true),
		}
	}
	if (a.meta.storedNextPage) {
		const page = a.meta.storedNextPage
		yield {
			key: `stored-${page}`,
			cost: 1,
			urgent: false,
			run: () => storedPage(a, region, id, page, PAGE, false),
		}
	}
	if (a.meta.rrNextPage) {
		const page = a.meta.rrNextPage
		yield {
			key: `rr-${page}`,
			cost: 1,
			urgent: false,
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
			urgent: false,
			run: () => fetchDetail(a, p.id, region).then(() => {}),
		}

	const outdated = [...a.games.values()]
		.filter((x) => x.d && (x.d.v ?? 1) < DETAIL_VERSION)
		.slice(0, 25)
	if (outdated.length)
		yield {
			key: `rederive-${outdated[0].id}`,
			cost: 0,
			urgent: false,
			run: () => rederive(a, outdated),
		}
}

async function runTask(a: Archive, task: Task) {
	g.__vsWorking = true
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
			console.warn(
				`[sync] ${a.player.slug} ${task.key}:`,
				(err as Error).message,
			)
	} finally {
		g.__vsWorking = false
		void (await getStorage())
			.setMeta(metaKey("sync", a), a.meta)
			.catch(() => {})
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
	// Another tracked player may have been in this match already.
	const shared = await storage.getMatch(matchId)
	if (shared) {
		attachDetail(a, shared)
		return shared
	}
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
