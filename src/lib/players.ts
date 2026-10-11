import type { TrackedPlayer } from "@/interfaces/players"

const env = (k: string): string | undefined =>
	process.env[k] ||
	(import.meta.env as Record<string, string | undefined>)[k] ||
	undefined

export const slugOf = (name: string, tag: string) =>
	`${name}-${tag}`
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")

function parse(raw: string): TrackedPlayer[] {
	const seen = new Set<string>()
	const out: TrackedPlayer[] = []
	for (const entry of raw.split(",")) {
		// In .env an unquoted "#" starts a comment, so "Name/Tag" is accepted too.
		const [name, tag] = entry.trim().split(/[#/]/)
		if (!name?.trim() || !tag?.trim()) {
			if (entry.trim())
				console.error(`[config] "${entry.trim()}" no tiene formato Nombre#TAG`)
			continue
		}
		const player = { name: name.trim(), tag: tag.trim(), slug: "" }
		player.slug = slugOf(player.name, player.tag)
		if (seen.has(player.slug)) continue
		seen.add(player.slug)
		out.push(player)
	}
	return out
}

/** Accounts to track: PLAYER_RIOT_IDS="A#1,B#2" (or the single PLAYER_RIOT_ID). */
export const PLAYERS: TrackedPlayer[] = parse(
	env("PLAYER_RIOT_IDS") ?? env("PLAYER_RIOT_ID") ?? "",
)

if (!PLAYERS.length)
	console.error(
		'[config] Define PLAYER_RIOT_IDS="Nombre#TAG,Otro#TAG" (entre comillas) en .env',
	)

export const getPlayer = (slug: string | undefined) =>
	slug ? PLAYERS.find((p) => p.slug === slug.toLowerCase()) : PLAYERS[0]
