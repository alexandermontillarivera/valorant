const DIVISIONS = [
	"Iron",
	"Bronze",
	"Silver",
	"Gold",
	"Platinum",
	"Diamond",
	"Ascendant",
	"Immortal",
]

export function tierName(tier: number): string {
	if (tier < 3) return "Unrated"
	if (tier >= 27) return "Radiant"
	return `${DIVISIONS[Math.floor((tier - 3) / 3)]} ${((tier - 3) % 3) + 1}`
}

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`
export const fixed = (v: number, digits = 2) =>
	Number.isFinite(v) ? v.toFixed(digits) : "—"
export const int = (v: number) =>
	Number.isFinite(v) ? Math.round(v).toLocaleString("es-ES") : "—"
export const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)

export function duration(ms: number) {
	const m = Math.floor(ms / 60000)
	const s = Math.floor((ms % 60000) / 1000)
	return `${m}:${String(s).padStart(2, "0")}`
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
export function ago(iso: string) {
	const diff = (Date.now() - +new Date(iso)) / 1000
	if (diff < 60) return "ahora"
	if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute")
	if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour")
	return rtf.format(-Math.round(diff / 86400), "day")
}

export function dayLabel(iso: string) {
	const d = new Date(iso)
	const today = new Date()
	const yesterday = new Date(Date.now() - 86400000)
	const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
	if (same(d, today)) return "Hoy"
	if (same(d, yesterday)) return "Ayer"
	return d.toLocaleDateString("es-ES", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	})
}

export const clockTime = (iso: string) =>
	new Date(iso).toLocaleTimeString("es-ES", {
		hour: "2-digit",
		minute: "2-digit",
	})

export const cardArt = (
	id: string | null,
	kind: "wideart" | "smallart" | "largeart" = "wideart",
) =>
	id ? `https://media.valorant-api.com/playercards/${id}/${kind}.png` : null
