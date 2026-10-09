import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import type { Game } from "@/interfaces/game"
import type { Match } from "@/interfaces/match"
import type { RRPoint } from "@/interfaces/player"
import type { Storage } from "@/interfaces/storage"

const env = (k: string) =>
	process.env[k] ||
	(import.meta.env as Record<string, string | undefined>)[k] ||
	undefined

const SCHEMA = `
IF OBJECT_ID('dbo.vs_games') IS NULL
CREATE TABLE dbo.vs_games (
  id          NVARCHAR(64)  NOT NULL PRIMARY KEY,
  puuid       NVARCHAR(64)  NOT NULL,
  started_at  DATETIME2     NOT NULL,
  queue       NVARCHAR(32)  NOT NULL,
  season      NVARCHAR(16)  NULL,
  map         NVARCHAR(32)  NULL,
  agent       NVARCHAR(32)  NULL,
  result      CHAR(1)       NOT NULL,
  kills       INT NOT NULL, deaths INT NOT NULL, assists INT NOT NULL,
  score       INT NOT NULL,
  perf_score  FLOAT         NULL,
  rr_change   INT           NULL,
  has_detail  BIT           NOT NULL DEFAULT 0,
  data        NVARCHAR(MAX) NOT NULL,
  updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_vs_games_puuid_started')
CREATE INDEX ix_vs_games_puuid_started ON dbo.vs_games (puuid, started_at DESC);

IF OBJECT_ID('dbo.vs_matches') IS NULL
CREATE TABLE dbo.vs_matches (
  id          NVARCHAR(64)  NOT NULL PRIMARY KEY,
  started_at  DATETIME2     NOT NULL,
  data        NVARCHAR(MAX) NOT NULL,
  fetched_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.vs_rr_history') IS NULL
CREATE TABLE dbo.vs_rr_history (
  match_id    NVARCHAR(64)  NOT NULL PRIMARY KEY,
  puuid       NVARCHAR(64)  NOT NULL,
  date        DATETIME2     NOT NULL,
  tier        INT NOT NULL, rr INT NOT NULL, change INT NOT NULL, elo INT NOT NULL,
  map         NVARCHAR(32)  NULL,
  season      NVARCHAR(16)  NULL
);

IF OBJECT_ID('dbo.vs_meta') IS NULL
CREATE TABLE dbo.vs_meta (
  k           NVARCHAR(128) NOT NULL PRIMARY KEY,
  v           NVARCHAR(MAX) NOT NULL,
  updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);`

async function mssqlStorage(): Promise<Storage> {
	const sql = (await import("mssql")).default
	const config: import("mssql").config = {
		server: env("MSSQL_SERVER")!,
		port: Number(env("MSSQL_PORT") ?? 1433),
		database: env("MSSQL_DATABASE"),
		user: env("MSSQL_USER"),
		password: env("MSSQL_PASSWORD"),
		options: {
			encrypt: env("MSSQL_ENCRYPT") !== "false",
			trustServerCertificate: env("MSSQL_TRUST_CERT") === "true",
		},
		pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 },
		requestTimeout: 60_000,
	}
	const g = globalThis as any
	const pool: import("mssql").ConnectionPool = (g.__vsPool ??=
		new sql.ConnectionPool(config))
	const ready = () =>
		pool.connected
			? pool
			: pool.connecting
				? new Promise<typeof pool>((r) => pool.once("connect", () => r(pool)))
				: pool.connect()

	async function upsertMany<T>(
		rows: T[],
		bind: (req: import("mssql").Request, row: T) => string,
	) {
		if (!rows.length) return
		const p = await ready()
		const tx = new sql.Transaction(p)
		await tx.begin()
		try {
			for (const row of rows) {
				const req = new sql.Request(tx)
				await req.query(bind(req, row))
			}
			await tx.commit()
		} catch (err) {
			await tx.rollback().catch(() => {})
			throw err
		}
	}

	return {
		kind: "mssql",
		async init() {
			// SQL Server answers "Login failed" when the database doesn't exist, so create it first via master.
			const database = config.database
			if (database && database.toLowerCase() !== "master") {
				const admin = await new sql.ConnectionPool({
					...config,
					database: "master",
					pool: { max: 1, min: 0 },
				}).connect()
				try {
					const exists = await admin
						.request()
						.input("db", sql.NVarChar(128), database)
						.query("SELECT DB_ID(@db) AS id")
					if (exists.recordset[0].id === null) {
						await admin
							.request()
							.batch(`CREATE DATABASE [${database.replace(/]/g, "]]")}]`)
						console.log(`[storage] created database ${database}`)
					}
				} finally {
					await admin.close()
				}
			}
			const p = await ready()
			await p.request().batch(SCHEMA)
		},
		async loadAll(puuid) {
			const p = await ready()
			const [games, rr, meta] = await Promise.all([
				p
					.request()
					.input("puuid", sql.NVarChar(64), puuid)
					.query<{ data: string }>(
						"SELECT data FROM dbo.vs_games WHERE puuid = @puuid",
					),
				p
					.request()
					.input("puuid", sql.NVarChar(64), puuid)
					.query<any>("SELECT * FROM dbo.vs_rr_history WHERE puuid = @puuid"),
				p
					.request()
					.query<{ k: string; v: string }>("SELECT k, v FROM dbo.vs_meta"),
			])
			return {
				games: games.recordset.map((r) => JSON.parse(r.data) as Game),
				rr: rr.recordset.map((r) => ({
					matchId: r.match_id,
					date: new Date(r.date).toISOString(),
					tier: r.tier,
					tierName: "",
					rr: r.rr,
					change: r.change,
					elo: r.elo,
					map: r.map ?? "",
					season: r.season ?? "",
				})),
				meta: Object.fromEntries(
					meta.recordset.map((r) => [r.k, JSON.parse(r.v)]),
				),
			}
		},
		saveGames: (puuid, games) =>
			upsertMany(games, (req, g) => {
				req.input("id", sql.NVarChar(64), g.id)
				req.input("puuid", sql.NVarChar(64), puuid)
				req.input("started_at", sql.DateTime2, new Date(g.startedAt))
				req.input("queue", sql.NVarChar(32), g.queue)
				req.input("season", sql.NVarChar(16), g.season)
				req.input("map", sql.NVarChar(32), g.map)
				req.input("agent", sql.NVarChar(32), g.agent)
				req.input("result", sql.Char(1), g.result)
				req.input("kills", sql.Int, g.kills)
				req.input("deaths", sql.Int, g.deaths)
				req.input("assists", sql.Int, g.assists)
				req.input("score", sql.Int, g.score)
				req.input("perf", sql.Float, g.d?.perf?.score ?? null)
				req.input("rr", sql.Int, g.rr ?? null)
				req.input("has_detail", sql.Bit, g.d ? 1 : 0)
				req.input("data", sql.NVarChar(sql.MAX), JSON.stringify(g))
				return `MERGE dbo.vs_games AS t USING (SELECT @id AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET puuid=@puuid, started_at=@started_at, queue=@queue, season=@season, map=@map, agent=@agent,
            result=@result, kills=@kills, deaths=@deaths, assists=@assists, score=@score, perf_score=@perf, rr_change=@rr,
            has_detail=@has_detail, data=@data, updated_at=SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT (id, puuid, started_at, queue, season, map, agent, result, kills, deaths, assists, score, perf_score, rr_change, has_detail, data)
            VALUES (@id, @puuid, @started_at, @queue, @season, @map, @agent, @result, @kills, @deaths, @assists, @score, @perf, @rr, @has_detail, @data);`
			}),
		saveRR: (puuid, points) =>
			upsertMany(points, (req, r) => {
				req.input("id", sql.NVarChar(64), r.matchId)
				req.input("puuid", sql.NVarChar(64), puuid)
				req.input("date", sql.DateTime2, new Date(r.date))
				req.input("tier", sql.Int, r.tier)
				req.input("rr", sql.Int, r.rr)
				req.input("change", sql.Int, r.change)
				req.input("elo", sql.Int, r.elo)
				req.input("map", sql.NVarChar(32), r.map)
				req.input("season", sql.NVarChar(16), r.season)
				return `MERGE dbo.vs_rr_history AS t USING (SELECT @id AS match_id) AS s ON t.match_id = s.match_id
          WHEN MATCHED THEN UPDATE SET date=@date, tier=@tier, rr=@rr, change=@change, elo=@elo, map=@map, season=@season
          WHEN NOT MATCHED THEN INSERT (match_id, puuid, date, tier, rr, change, elo, map, season)
            VALUES (@id, @puuid, @date, @tier, @rr, @change, @elo, @map, @season);`
			}),
		saveMatch: (m) =>
			upsertMany([m], (req, row) => {
				req.input("id", sql.NVarChar(64), row.id)
				req.input("started_at", sql.DateTime2, new Date(row.startedAt))
				req.input("data", sql.NVarChar(sql.MAX), JSON.stringify(row))
				return `MERGE dbo.vs_matches AS t USING (SELECT @id AS id) AS s ON t.id = s.id
          WHEN MATCHED THEN UPDATE SET data=@data, fetched_at=SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT (id, started_at, data) VALUES (@id, @started_at, @data);`
			}),
		async getMatch(id) {
			const p = await ready()
			const r = await p
				.request()
				.input("id", sql.NVarChar(64), id)
				.query<{ data: string }>(
					"SELECT data FROM dbo.vs_matches WHERE id = @id",
				)
			return r.recordset[0] ? (JSON.parse(r.recordset[0].data) as Match) : null
		},
		setMeta: (key, value) =>
			upsertMany([0], (req) => {
				req.input("k", sql.NVarChar(128), key)
				req.input("v", sql.NVarChar(sql.MAX), JSON.stringify(value))
				return `MERGE dbo.vs_meta AS t USING (SELECT @k AS k) AS s ON t.k = s.k
          WHEN MATCHED THEN UPDATE SET v=@v, updated_at=SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT (k, v) VALUES (@k, @v);`
			}),
	}
}

function jsonStorage(): Storage {
	const dir = join(process.cwd(), ".cache")
	const archiveFile = join(dir, "archive.json")
	const matchDir = join(dir, "matches")
	let state: {
		games: Record<string, Game>
		rr: Record<string, RRPoint>
		meta: Record<string, unknown>
	} = { games: {}, rr: {}, meta: {} }
	let timer: ReturnType<typeof setTimeout> | undefined
	const flush = () => {
		clearTimeout(timer)
		timer = setTimeout(
			() => writeFileSync(archiveFile, JSON.stringify(state)),
			1000,
		)
	}
	return {
		kind: "json",
		async init() {
			mkdirSync(matchDir, { recursive: true })
			if (existsSync(archiveFile))
				state = JSON.parse(readFileSync(archiveFile, "utf8"))
		},
		async loadAll() {
			return {
				games: Object.values(state.games),
				rr: Object.values(state.rr),
				meta: state.meta,
			}
		},
		async saveGames(_, games) {
			for (const g of games) state.games[g.id] = g
			flush()
		},
		async saveRR(_, points) {
			for (const r of points) state.rr[r.matchId] = r
			flush()
		},
		async saveMatch(m) {
			writeFileSync(join(matchDir, `${m.id}.json`), JSON.stringify(m))
		},
		async getMatch(id) {
			const f = join(matchDir, `${id.replace(/[^\w-]/g, "")}.json`)
			return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null
		},
		async setMeta(key, value) {
			state.meta[key] = value
			flush()
		},
	}
}

export const storageConfigured = () => !!env("MSSQL_SERVER")

export function getStorage(): Promise<Storage> {
	const g = globalThis as any
	g.__vsStorage ??= (async () => {
		if (storageConfigured()) {
			try {
				const s = await mssqlStorage()
				await s.init()
				console.log("[storage] SQL Server connected")
				await migrateLocal(s).catch((err) =>
					console.error(
						"[storage] migration from .cache failed:",
						(err as Error).message,
					),
				)
				return s
			} catch (err) {
				console.error(
					"[storage] SQL Server unavailable, using local JSON:",
					(err as Error).message,
				)
			}
		}
		const s = jsonStorage()
		await s.init()
		return s
	})()
	return g.__vsStorage
}

async function migrateLocal(target: Storage) {
	const dir = join(process.cwd(), ".cache")
	const archiveFile = join(dir, "archive.json")
	const marker = join(dir, ".migrated-to-mssql")
	if (!existsSync(archiveFile) || existsSync(marker)) return

	const local = jsonStorage()
	await local.init()
	const { games, rr, meta } = await local.loadAll("")
	const puuid = (meta["account"] as any)?.data?.puuid as string | undefined
	if (!puuid) return

	console.log(
		`[storage] migrating ${games.length} games, ${rr.length} RR points to SQL Server…`,
	)
	for (let i = 0; i < games.length; i += 100)
		await target.saveGames(puuid, games.slice(i, i + 100))
	for (let i = 0; i < rr.length; i += 200)
		await target.saveRR(puuid, rr.slice(i, i + 200))
	for (const [k, v] of Object.entries(meta)) await target.setMeta(k, v)
	const matchDir = join(dir, "matches")
	if (existsSync(matchDir)) {
		for (const f of readdirSync(matchDir)) {
			if (f.endsWith(".json"))
				await target.saveMatch(
					JSON.parse(readFileSync(join(matchDir, f), "utf8")),
				)
		}
	}
	writeFileSync(marker, new Date().toISOString())
	console.log("[storage] migration done")
}
