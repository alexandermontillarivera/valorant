import type { Match, RoundInfo } from "@/interfaces/match"
import type { TeamId } from "@/interfaces/player"

// Only used for old matches stored before the API's per-round role was kept.
const HALF_LENGTH: Record<string, number> = { swiftplay: 4, spikerush: 3 }

const other = (t: TeamId): TeamId => (t === "Red" ? "Blue" : "Red")

export function attackersOf(
	round: RoundInfo,
	queue: string,
	firstAttackers: TeamId = "Red",
): TeamId {
	if (round.attackers) return round.attackers
	const half = HALF_LENGTH[queue] ?? 12
	const i = round.index
	if (i < half) return firstAttackers
	if (i < half * 2) return other(firstAttackers)
	return i % 2 ? firstAttackers : other(firstAttackers)
}

/** Attacking team per round, plus which rounds are pistol rounds (start of each half). */
export function roundSides(m: Pick<Match, "rounds" | "queue">) {
	const known = m.rounds.find((r) => r.attackers)
	const firstAttackers: TeamId =
		known &&
		attackersOf({ ...known, attackers: undefined }, m.queue) !== known.attackers
			? "Blue"
			: "Red"
	const attackers = m.rounds.map((r) => attackersOf(r, m.queue, firstAttackers))
	const switchAt = attackers.findIndex((t) => t !== attackers[0])
	const pistol = new Set([0, ...(switchAt > 0 ? [switchAt] : [])])
	return { attackers, pistol }
}
