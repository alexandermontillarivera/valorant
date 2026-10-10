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

export type SearchMetric =
	"kills" | "deaths" | "assists" | "kd" | "acs" | "adr" | "hs" | "perf" | "rr"

export interface SearchCondition {
	metric: SearchMetric
	op: "gte" | "lte"
	value: number
}

export interface SearchView {
	games: Game[]
	total: number
	offset: number
	limit: number
	summary: Summary
	facets: { agents: string[]; maps: string[] }
}

export interface PlayerHit {
	puuid: string
	name: string
	tag: string
	games: number
	asAlly: number
	asEnemy: number
	winsTogether: number
}

export interface PlayersView {
	players: PlayerHit[]
}

export interface SearchCriteria {
	q: string
	player: { puuid: string; name: string; tag: string } | null
	side: "any" | "ally" | "enemy"
	agent: string
	map: string
	result: "" | "W" | "L" | "D"
	mvp: "" | "match" | "team"
	from: string
	to: string
	sort: "date" | "kills" | "acs" | "kd" | "adr" | "perf"
	conditions: SearchCondition[]
}
