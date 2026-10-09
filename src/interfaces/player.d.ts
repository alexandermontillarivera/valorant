export type TeamId = "Red" | "Blue"

export interface Rank {
	tier: number // 0 = unrated, 3..27 = Iron 1 .. Radiant
	name: string
	rr: number
	lastChange: number
	elo: number
}

export interface SeasonRecord {
	season: string
	wins: number
	games: number
	endTier: number
	endTierName: string
	actWins: number[]
}

export interface Profile {
	puuid: string
	name: string
	tag: string
	region: string
	level: number
	cardId: string | null
	title: string | null
	rank: Rank
	peak: { tier: number; name: string; season: string } | null
	seasons: SeasonRecord[]
}

export interface RRPoint {
	matchId: string
	date: string
	tier: number
	tierName: string
	rr: number
	change: number
	elo: number
	map: string
	season: string
}

export interface Perf {
	score: number // 0..500
	grade: string // "fail" | "pass" | "merit" | "distinction" | ...
	breakdown: Record<string, number>
	ratings: Record<string, string> // category -> "double_up" | "up" | "neutral" | "down" | "double_down"
}
