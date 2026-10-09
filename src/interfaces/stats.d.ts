import type { Detail, Game } from "@/interfaces/game"
import type { PlayerLine } from "@/interfaces/match"

export type Period = "all" | "act" | "50" | "20"

export interface Best {
	value: number
	game: Game
}

export interface Summary {
	games: number
	wins: number
	losses: number
	draws: number
	winRate: number
	rounds: number
	kills: number
	deaths: number
	assists: number
	kd: number
	kda: number
	kpr: number
	hs: number
	body: number
	legs: number
	acs: number
	adr: number
	damageDelta: number
	detailed: number
	perf: number
	perfN: number
	grades: Record<string, number>
	kast: number
	fkPerMatch: number
	fdPerMatch: number
	fkRatio: number
	mvps: number
	teamMvps: number
	multi: [number, number, number, number]
	clutchAtt: number[]
	clutchWon: number[]
	flawless: number
	thrifty: number
	tradeKills: number
	tradedPct: number
	buys: Detail["buys"]
	atkWinRate: number
	defWinRate: number
	atkRounds: number
	defRounds: number
	castsPerRound: { c: number; q: number; e: number; x: number }
	plants: number
	defuses: number
	econ: number
	friendlyFire: number
	allyTier: number
	enemyTier: number
	best: { kills?: Best; acs?: Best; perf?: Best; adr?: Best }
	streak: {
		current: number
		currentType: "W" | "L" | null
		longestWin: number
		longestLoss: number
	}
}

export interface Group extends Summary {
	key: string
}

export interface WeaponStat {
	weapon: string
	kills: number
	deaths: number
	share: number
	hs: number
	shots: number
	damage: number
	avgDist: number | null
	icon: string | null
	ability: boolean
}

export interface Line extends PlayerLine {
	rounds: number
	acs: number
	adr: number
	kd: number
	hs: number
	placement: number
	teamPlacement: number
}
