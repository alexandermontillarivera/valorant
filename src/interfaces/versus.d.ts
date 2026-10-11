import type { Game, Result } from "@/interfaces/game"
import type { Profile } from "@/interfaces/player"
import type { Group, Summary } from "@/interfaces/stats"
import type { QueueCount } from "@/interfaces/views"

export interface EloPoint {
	t: number
	elo: number
	tierName: string
}

export interface VersusSide {
	slug: string
	profile: Profile
	summary: Summary
	agents: Group[]
	roles: Group[]
	maps: Group[]
	/** Standard deviation per match; lower means more consistent. */
	spread: { acs: number; perf: number | null }
	form: Result[]
	elo: EloPoint[]
}

export interface SharedGame {
	id: string
	map: string
	startedAt: string
	a: Game
	b: Game
}

export interface Pairing {
	games: number
	a: Summary
	b: Summary
	recent: SharedGame[]
}

export interface VersusView {
	a: VersusSide
	b: VersusSide
	queues: QueueCount[]
	together: Pairing
	against: Pairing
}

export interface ProfileCard {
	slug: string
	name: string
	tag: string
	ok: boolean
	message?: string
	profile?: Profile
	summary?: Summary
	form?: Result[]
}
