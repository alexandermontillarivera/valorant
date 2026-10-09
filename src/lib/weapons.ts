import type { Catalog } from "@/interfaces/catalog"
import type { Match } from "@/interfaces/match"
import type { WeaponInfo } from "@/interfaces/weapons"

type Slot = "c" | "q" | "e" | "x"

const SLOT: Record<string, Slot> = {
	grenadeability: "c",
	grenade: "c",
	ability1: "q",
	ability2: "e",
	ultimate: "x",
}

// Ability weapons that the public weapons catalog doesn't list (identified by kill distance).
const AGENT_WEAPONS: Record<string, { agent: string; slot: Slot }> = {
	"856d9a7e-4b06-dc37-15dc-9d809c37cb90": { agent: "chamber", slot: "q" },
	"39099fb5-4293-def4-1e09-2e9080ce7456": { agent: "chamber", slot: "x" },
	"95336ae4-45d4-1032-cfaf-6bad01910607": { agent: "neon", slot: "x" },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function weaponKey(
	id: string,
	name: string,
	type: string,
	agent = "",
): string {
	const a = agent.toLowerCase()
	if (type === "Bomb") return "spike"
	if (type === "Ability")
		return `ability:${a}:${SLOT[id.toLowerCase()] ?? "?"}:${name ?? ""}`
	if (!id) return `unknown@${a}`
	if (UUID.test(id)) return `${id.toLowerCase()}@${a}@${name ?? ""}`
	return `ability:${a}:${SLOT[id.toLowerCase()] ?? "?"}:${name ?? ""}`
}

const title = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase())

function ability(
	catalog: Catalog,
	agent: string,
	slot: string,
	apiName = "",
): WeaponInfo {
	const a = catalog.agents[agent]
	const ab = a?.abilities[slot as Slot]
	if (ab) return { name: ab.name, icon: ab.icon, ability: true }
	const generic = !apiName || /^(ability|unknown|desconocida)$/i.test(apiName)
	return {
		name: generic
			? agent
				? `Habilidad de ${a?.name ?? title(agent)}`
				: "Habilidad"
			: apiName,
		icon: a?.icon ?? null,
		ability: true,
	}
}

export function weaponInfo(catalog: Catalog, key: string): WeaponInfo {
	if (key.startsWith("ability:")) {
		const [, agent, slot, ...rest] = key.split(":")
		return ability(catalog, agent, slot, rest.join(":"))
	}

	if (key === "spike")
		return { name: "Spike", icon: null, ability: true, hidden: true }

	const [rawId, , apiName = ""] = key.split("@")
	const id = rawId.toLowerCase()
	if (id === "unknown")
		return { name: "Sin identificar", icon: null, ability: true, hidden: true }
	const weapon = catalog.weapons[id]
	if (weapon) return { name: weapon.name, icon: weapon.icon, ability: false }
	const known = AGENT_WEAPONS[id]
	if (known) return ability(catalog, known.agent, known.slot)
	if (UUID.test(id))
		return apiName && !/^(unknown|desconocida)$/i.test(apiName)
			? { name: apiName, icon: null, ability: false }
			: { name: "Sin identificar", icon: null, ability: true, hidden: true }

	// Keys stored as plain names by older versions.
	for (const a of Object.values(catalog.agents))
		for (const ab of Object.values(a.abilities))
			if (ab && ab.name.toLowerCase() === id)
				return { name: ab.name, icon: ab.icon, ability: true }
	return { name: key, icon: null, ability: false }
}

/** Fills readable weapon/ability names into a match before sending it to the client. */
export function resolveMatchWeapons(m: Match, catalog: Catalog) {
	const agentOf = new Map(m.players.map((p) => [p.puuid, p.agent]))
	for (const k of m.kills)
		k.weapon = weaponInfo(
			catalog,
			weaponKey(k.weaponId, k.weapon, k.weaponType, agentOf.get(k.killer)),
		).name
	for (const r of m.rounds)
		for (const p of r.players)
			if (p.weaponId)
				p.weapon = weaponInfo(
					catalog,
					weaponKey(p.weaponId, p.weapon, "Weapon", agentOf.get(p.puuid)),
				).name
	return m
}
