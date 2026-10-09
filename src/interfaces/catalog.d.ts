export interface MapInfo {
	id: string
	name: string
	splash: string
	listIcon: string
	minimap: string | null
	// game coords -> minimap 0..1: u = y * xMul + xAdd, v = x * yMul + yAdd
	xMul: number
	yMul: number
	xAdd: number
	yAdd: number
}

export interface Catalog {
	agents: Record<
		string,
		{
			id: string
			name: string
			role: string
			icon: string
			portrait: string
			color: string
			abilities: Partial<
				Record<"c" | "q" | "e" | "x", { name: string; icon: string }>
			>
		}
	>
	maps: Record<string, MapInfo>
	tiers: Record<number, { name: string; icon: string; color: string }>
	weapons: Record<
		string,
		{ id: string; name: string; icon: string; category: string }
	>
}
