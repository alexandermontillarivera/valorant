import type { Game } from "@/interfaces/game"
import type { Match } from "@/interfaces/match"
import type { RRPoint } from "@/interfaces/player"

export interface Storage {
	kind: "mssql" | "json"
	init(): Promise<void>
	loadAll(
		puuid: string,
	): Promise<{ games: Game[]; rr: RRPoint[]; meta: Record<string, unknown> }>
	saveGames(puuid: string, games: Game[]): Promise<void>
	saveRR(puuid: string, points: RRPoint[]): Promise<void>
	saveMatch(match: Match): Promise<void>
	getMatch(id: string): Promise<Match | null>
	setMeta(key: string, value: unknown): Promise<void>
}
