import { motion } from "motion/react"
import { pct } from "@/lib/format"
import {
	AgentIcon,
	Img,
	Panel,
	spring,
	useCatalog,
} from "@/components/ui/primitives"
import { COLOR_A, COLOR_B } from "@/components/versus/metrics"
import type { Group } from "@/interfaces/stats"
import type { VersusSide, VersusView } from "@/interfaces/versus"

const sides = (view: VersusView) =>
	[
		[view.a, COLOR_A],
		[view.b, COLOR_B],
	] as const

export function AgentsCompare({ view }: { view: VersusView }) {
	return (
		<div className="grid gap-3 sm:gap-4 md:grid-cols-2">
			{sides(view).map(([s, color]) => (
				<Panel
					key={s.slug}
					title={
						<span className="inline-flex items-center gap-1.5">
							<span
								className="h-2 w-2 rounded-full"
								style={{ background: color }}
							/>
							Agentes de {s.profile.name}
						</span>
					}
				>
					<AgentList side={s} color={color} />
				</Panel>
			))}
		</div>
	)
}

function AgentList({ side, color }: { side: VersusSide; color: string }) {
	const total = Math.max(1, side.summary.games)
	if (!side.agents.length)
		return (
			<div className="py-8 text-center text-[13px] text-fg-3">Sin partidas</div>
		)
	return (
		<ul className="grid gap-2.5">
			{side.agents.map((g, i) => (
				<li key={g.key} className="flex items-center gap-3">
					<AgentIcon name={g.key} size={34} />
					<div className="min-w-0 flex-1">
						<div className="flex items-baseline justify-between gap-2">
							<span className="truncate text-[13px] font-medium">{g.key}</span>
							<span className="num text-[12px] text-fg-3">
								{g.games} · {pct(g.winRate)} · {Math.round(g.acs)} ACS
							</span>
						</div>
						<div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
							<motion.div
								className="h-full rounded-full"
								style={{ background: color, transformOrigin: "left" }}
								initial={{ scaleX: 0 }}
								animate={{ scaleX: g.games / total }}
								transition={{ ...spring, delay: 0.04 * i }}
							/>
						</div>
					</div>
				</li>
			))}
		</ul>
	)
}

export function RolesCompare({ view }: { view: VersusView }) {
	const roles = [
		...new Set([...view.a.roles, ...view.b.roles].map((r) => r.key)),
	].sort()
	const share = (s: VersusSide, role: string) =>
		(s.roles.find((r) => r.key === role)?.games ?? 0) /
		Math.max(1, s.summary.games)
	return (
		<Panel title="Roles">
			<div className="grid gap-4">
				{roles.map((role, i) => (
					<div key={role}>
						<div className="mb-1.5 flex items-baseline justify-between text-[12px]">
							<span className="num font-medium" style={{ color: COLOR_A }}>
								{pct(share(view.a, role))}
							</span>
							<span className="text-fg-2">{role}</span>
							<span className="num font-medium" style={{ color: COLOR_B }}>
								{pct(share(view.b, role))}
							</span>
						</div>
						<div className="flex gap-1">
							{sides(view).map(([s, color], j) => (
								<div
									key={s.slug}
									className={`flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05] ${j ? "" : "justify-end"}`}
								>
									<motion.div
										className="h-full rounded-full"
										style={{ background: color }}
										initial={{ width: 0 }}
										animate={{ width: `${share(s, role) * 100}%` }}
										transition={{ ...spring, delay: 0.04 * i }}
									/>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</Panel>
	)
}

export function MapsCompare({ view }: { view: VersusView }) {
	const catalog = useCatalog()
	const byKey = (list: Group[]) => new Map(list.map((g) => [g.key, g]))
	const a = byKey(view.a.maps)
	const b = byKey(view.b.maps)
	// Maps both have played first; rotating modes' one-off maps would only add noise.
	const maps = [...new Set([...a.keys(), ...b.keys()])]
		.filter((m) => a.has(m) && b.has(m))
		.sort(
			(x, y) =>
				(b.get(y)?.games ?? 0) +
				(a.get(y)?.games ?? 0) -
				(b.get(x)?.games ?? 0) -
				(a.get(x)?.games ?? 0),
		)
		.slice(0, 12)
	const cell = (g: Group | undefined, color: string, win: boolean) =>
		g ? (
			<div className="text-right">
				<div
					className="num text-[14px] font-semibold"
					style={win ? { color } : undefined}
				>
					{pct(g.winRate)}
				</div>
				<div className="num text-[11px] text-fg-3">
					{g.games} · {Math.round(g.acs)} ACS
				</div>
			</div>
		) : (
			<div className="text-right text-fg-4">—</div>
		)
	return (
		<Panel title="Mapas · % de victorias">
			{!maps.length && (
				<div className="py-8 text-center text-[13px] text-fg-3">
					Ningún mapa jugado por ambos con estos filtros
				</div>
			)}
			<div className="grid gap-1">
				{maps.map((m) => {
					const x = a.get(m)
					const y = b.get(m)
					const info = Object.values(catalog.maps).find((c) => c.name === m)
					return (
						<div
							key={m}
							className="grid grid-cols-[1fr_80px_80px] items-center gap-3 rounded-xl px-2 py-1.5"
						>
							<div className="flex min-w-0 items-center gap-3">
								<div className="h-9 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
									<Img
										src={info?.splash}
										className="h-full w-full object-cover"
									/>
								</div>
								<span className="truncate text-[13px] font-medium">{m}</span>
							</div>
							{cell(x, COLOR_A, !!x && (!y || x.winRate > y.winRate))}
							{cell(y, COLOR_B, !!y && (!x || y.winRate > x.winRate))}
						</div>
					)
				})}
			</div>
		</Panel>
	)
}
