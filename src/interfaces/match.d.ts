import type { Perf, TeamId } from "@/interfaces/player"

export interface PlayerLine {
	puuid: string
	name: string
	tag: string
	team: TeamId
	agent: string
	agentId: string
	tier: number
	level: number
	partyId: string
	score: number
	kills: number
	deaths: number
	assists: number
	headshots: number
	bodyshots: number
	legshots: number
	damageDealt: number
	damageReceived: number
	firstKills: number
	firstDeaths: number
	kast: number
	multiKills: number
	plants: number
	defuses: number
	perf: Perf | null
	casts: { c: number; q: number; e: number; x: number }
	spent: number
	friendlyFire: number
}

export interface KillEvent {
	round: number
	timeMs: number
	killer: string
	victim: string
	assistants: string[]
	weapon: string
	weaponId: string
	weaponType: string
	victimPos: [number, number] | null
	killerPos: [number, number] | null
}

export interface RoundPlayer {
	puuid: string
	loadout: number
	weaponId: string
	weapon: string
	hs: number
	bs: number
	ls: number
	damage: number
}

export interface RoundInfo {
	index: number
	winner: TeamId
	attackers?: TeamId
	result: string
	planted: boolean
	defused: boolean
	players: RoundPlayer[]
}

export interface Match {
	id: string
	map: string
	mapId: string
	mode: string
	queue: string
	startedAt: string
	durationMs: number
	season: string
	mvp: string | null
	teamMvp: Partial<Record<TeamId, string>>
	teams: Record<TeamId, { rounds: number; won: boolean }>
	players: PlayerLine[]
	rounds: RoundInfo[]
	kills: KillEvent[]
}
