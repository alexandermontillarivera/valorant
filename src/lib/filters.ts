import type { Period } from "@/interfaces/stats"
import type { QueueCount } from "@/interfaces/views"

export const QUEUE_LABELS: Record<string, string> = {
	competitive: "Competitivo",
	unrated: "No clasif.",
	swiftplay: "Swiftplay",
	premier: "Premier",
	spikerush: "Spike Rush",
	deathmatch: "Deathmatch",
	teamdeathmatch: "TDM",
	escalation: "Escalation",
	allrandomonesite: "ARAO",
	knockout: "Knockout",
	custom: "Personalizada",
	unknown: "Otros",
	all: "Todo",
}

export const PERIODS: { value: Period; label: string }[] = [
	{ value: "all", label: "Todo" },
	{ value: "act", label: "Acto actual" },
	{ value: "50", label: "Últimas 50" },
	{ value: "20", label: "Últimas 20" },
]

/** Queues the player has games in, in a stable order, plus "all". */
export function queueOptions(queues: QueueCount[]) {
	const order = Object.keys(QUEUE_LABELS)
	const rank = (q: string) => order.indexOf(q) + 1 || order.length + 1
	const present = [...queues].sort(
		(a, b) => rank(a.queue) - rank(b.queue) || b.count - a.count,
	)
	return [
		...present.map((q) => ({
			value: q.queue,
			label: QUEUE_LABELS[q.queue] ?? q.mode ?? q.queue,
		})),
		{ value: "all", label: QUEUE_LABELS.all },
	]
}
