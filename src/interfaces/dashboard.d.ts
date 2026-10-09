import type { Catalog } from "@/interfaces/catalog"
import type { Game } from "@/interfaces/game"
import type { Profile, RRPoint } from "@/interfaces/player"

export interface SyncStatus {
	total: number
	known: number
	detailed: number
	detailable: number
	rrPoints: number
	working: boolean
	rateLimited: boolean
	lastSyncAt: string | null
}

export interface Dashboard {
	profile: Profile
	games: Game[]
	rrHistory: RRPoint[]
	sync: SyncStatus
}

export type LoadResult =
	| { ok: true; data: Dashboard; catalog: Catalog }
	| { ok: false; status: number; message: string; catalog: Catalog }
