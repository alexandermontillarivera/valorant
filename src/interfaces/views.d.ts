import type { SyncStatus } from "@/interfaces/dashboard"
import type { Game } from "@/interfaces/game"
import type { Profile, RRPoint } from "@/interfaces/player"
import type { Group, Summary, WeaponStat } from "@/interfaces/stats"

export interface QueueCount {
	queue: string
	mode: string
	count: number
}

export interface Shell {
	profile: Profile
	sync: SyncStatus
	queues: QueueCount[]
}

export interface PerfRow {
	key: string
	rating: string
	label: string
	unit: string
	avg: number
	dist: Record<string, number>
	n: number
}

export interface SummaryView {
	summary: Summary
}

export interface OverviewView {
	recent: Game[]
	rr: RRPoint[]
	agents: Group[]
	maps: Group[]
}

export interface CombatView {
	breakdown: PerfRow[]
	parties: Group[]
}

export interface AgentsView {
	groups: Group[]
	roles: Group[]
}

export interface GroupsView {
	groups: Group[]
}

export interface HeatmapView {
	points: [number, number, 0 | 1][]
}

export interface WeaponsView {
	weapons: WeaponStat[]
}

export interface MatchesView {
	games: Game[]
	total: number
	offset: number
	limit: number
}
