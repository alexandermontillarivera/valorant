import type { Perf, TeamId } from "@/interfaces/player"

export type Result = "W" | "L" | "D"

export interface Detail {
	v?: number
	perf: Perf | null
	placement: number
	teamPlacement: number
	mvp: 0 | 1 | 2 // 1 = match MVP, 2 = team MVP (official)
	durationMs: number
	kast: number
	fk: number
	fd: number
	tradeKills: number
	tradedDeaths: number
	multi: [number, number, number, number] // 2K, 3K, 4K, 5K rounds
	clutch: { att: number[]; won: number[] } // index 0..4 => 1v1..1v5
	flawless: number
	thrifty: number
	buys: Record<"pistol" | "eco" | "force" | "full", [number, number]> // [won, total], your team's buy
	sides: Record<"atk" | "def", [number, number]>
	casts: { c: number; q: number; e: number; x: number }
	plants: number
	defuses: number
	spent: number
	friendlyFire: number
	allyTier: number
	enemyTier: number
	party: number
	weapons: Record<
		string,
		{
			k: number
			hs: number
			bs: number
			ls: number
			dmg: number
			dist: number
			distN: number
		}
	>
	killedBy: Record<string, number>
	pts: [number, number, 0 | 1][] // your position: 0 = got a kill, 1 = died
}

export interface Game {
	id: string
	map: string
	mode: string
	queue: string // canonical id: competitive, unrated, swiftplay, deathmatch, teamdeathmatch, ...
	startedAt: string
	season: string
	agent: string
	tier: number
	team: TeamId
	score: number
	kills: number
	deaths: number
	assists: number
	head: number
	body: number
	leg: number
	dealt: number
	received: number
	my: number
	their: number
	result: Result
	rr?: number
	d?: Detail
}
