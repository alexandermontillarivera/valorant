import type { Catalog } from "@/interfaces/catalog"

const BASE = "https://valorant-api.com/v1"
const TTL = 1000 * 60 * 60 * 12

let cached: { at: number; data: Catalog } | null = null
let inflight: Promise<Catalog> | null = null

const SLOT: Record<string, "c" | "q" | "e" | "x"> = {
	Grenade: "c",
	Ability1: "q",
	Ability2: "e",
	Ultimate: "x",
}

const hex = (rgba?: string | null) =>
	rgba ? `#${rgba.slice(0, 6)}` : "#8b8b93"

async function get<T>(path: string): Promise<T[]> {
	const res = await fetch(`${BASE}${path}`, {
		signal: AbortSignal.timeout(8000),
	})
	if (!res.ok) throw new Error(`catalog ${path} ${res.status}`)
	const json = (await res.json()) as { data: T[] }
	return json.data ?? []
}

async function load(): Promise<Catalog> {
	const [agents, maps, tiers, weapons] = await Promise.all([
		get<any>("/agents?isPlayableCharacter=true"),
		get<any>("/maps"),
		get<any>("/competitivetiers"),
		get<any>("/weapons"),
	])

	const catalog: Catalog = { agents: {}, maps: {}, tiers: {}, weapons: {} }

	for (const a of agents) {
		catalog.agents[a.displayName.toLowerCase()] = {
			id: a.uuid,
			name: a.displayName,
			role: a.role?.displayName ?? "—",
			icon: a.displayIcon,
			portrait: a.fullPortrait ?? a.displayIcon,
			color: hex(a.backgroundGradientColors?.[0]),
			abilities: Object.fromEntries(
				(a.abilities ?? [])
					.map((ab: any) => [
						SLOT[ab.slot],
						{ name: ab.displayName, icon: ab.displayIcon },
					])
					.filter(([k]: [string | undefined]) => k),
			),
		}
	}

	for (const m of maps) {
		if (!m.splash) continue
		catalog.maps[m.displayName.toLowerCase()] = {
			id: m.uuid,
			name: m.displayName,
			splash: m.splash,
			listIcon: m.listViewIcon ?? m.splash,
			minimap: m.displayIcon ?? null,
			xMul: m.xMultiplier ?? 0,
			yMul: m.yMultiplier ?? 0,
			xAdd: m.xScalarToAdd ?? 0,
			yAdd: m.yScalarToAdd ?? 0,
		}
	}

	const ladder = tiers.at(-1)?.tiers ?? []
	for (const t of ladder) {
		catalog.tiers[t.tier] = {
			name: titleCase(t.tierName),
			icon: t.largeIcon ?? t.smallIcon ?? "",
			color: hex(t.color),
		}
	}

	for (const w of weapons) {
		const entry = {
			id: w.uuid,
			name: w.displayName,
			icon: w.killStreamIcon ?? w.displayIcon,
			category: String(w.category ?? "").replace("EEquippableCategory::", ""),
		}
		catalog.weapons[w.uuid.toLowerCase()] = entry
		catalog.weapons[w.displayName.toLowerCase()] = entry
	}

	return catalog
}

function titleCase(s: string) {
	return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function getCatalog(): Promise<Catalog> {
	if (cached && Date.now() - cached.at < TTL) return cached.data
	inflight ??= load()
		.then((data) => {
			cached = { at: Date.now(), data }
			return data
		})
		.catch((err) => {
			console.warn("[catalog] failed to load static content:", err.message)
			return cached?.data ?? { agents: {}, maps: {}, tiers: {}, weapons: {} }
		})
		.finally(() => {
			inflight = null
		})
	return inflight
}
