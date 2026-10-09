import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { ArrowDown, ArrowUp } from "lucide-react"
import clsx from "clsx"
import { groupBy, weaponStats } from "@/lib/stats"
import { fixed, pct } from "@/lib/format"
import {
	AgentIcon,
	Bar,
	Img,
	Panel,
	RankIcon,
	Segmented,
	spring,
	useCatalog,
	useWeaponInfo,
} from "@/components/ui/primitives"
import { perfColor } from "@/components/ui/perf"
import { Heatmap } from "@/components/charts/Heatmap"
import { useView } from "@/hooks/useView"
import type {
	AgentsView,
	GroupsView,
	HeatmapView,
	WeaponsView,
} from "@/interfaces/views"
import type { Game } from "@/interfaces/game"
import type { Profile } from "@/interfaces/player"
import type { Group } from "@/interfaces/stats"

type Col = {
	key: keyof Group
	label: string
	fmt: (g: Group) => string
	detail?: boolean
}

const COLS: Col[] = [
	{ key: "games", label: "Partidas", fmt: (g) => String(g.games) },
	{ key: "winRate", label: "Win %", fmt: (g) => pct(g.winRate) },
	{
		key: "perf",
		label: "PS",
		fmt: (g) => (g.perfN ? g.perf.toFixed(0) : "—"),
		detail: true,
	},
	{ key: "kd", label: "K/D", fmt: (g) => fixed(g.kd) },
	{ key: "kda", label: "KDA", fmt: (g) => fixed(g.kda) },
	{ key: "acs", label: "ACS", fmt: (g) => g.acs.toFixed(0) },
	{ key: "adr", label: "ADR", fmt: (g) => g.adr.toFixed(0) },
	{ key: "hs", label: "HS%", fmt: (g) => pct(g.hs) },
	{
		key: "kast",
		label: "KAST",
		fmt: (g) => (g.detailed ? pct(g.kast) : "—"),
		detail: true,
	},
	{
		key: "fkPerMatch",
		label: "FK/p",
		fmt: (g) => (g.detailed ? fixed(g.fkPerMatch, 1) : "—"),
		detail: true,
	},
]

export function Agents({ view }: { view: AgentsView }) {
	const catalog = useCatalog()
	const { groups, roles } = view
	const [sort, setSort] = useState<{ key: keyof Group; desc: boolean }>({
		key: "games",
		desc: true,
	})
	const sorted = [...groups].sort(
		(a, b) =>
			((a[sort.key] as number) - (b[sort.key] as number)) *
			(sort.desc ? -1 : 1),
	)
	const total = Math.max(
		1,
		groups.reduce((a, g) => a + g.games, 0),
	)

	if (!groups.length) return <EmptyState />

	return (
		<div className="grid gap-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				{roles.map((r, i) => (
					<motion.div
						key={r.key}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...spring, delay: i * 0.04 }}
						className="panel p-4"
					>
						<div className="eyebrow">{r.key}</div>
						<div className="num mt-1 text-[24px] font-semibold tracking-[-0.03em]">
							{pct(r.games / total)}
						</div>
						<div className="num text-[12px] text-fg-3">
							{r.games} {r.games === 1 ? "partida" : "partidas"} ·{" "}
							{pct(r.winRate)} WR · {fixed(r.kd)} K/D
						</div>
						<Bar
							value={r.games / total}
							className="mt-3"
							delay={0.1 + i * 0.05}
						/>
					</motion.div>
				))}
			</div>

			<div className="panel overflow-hidden p-0">
				<div className="overflow-x-auto">
					<table className="num w-full min-w-[900px] text-[13px]">
						<thead>
							<tr className="text-[10px] tracking-wider text-fg-3 uppercase">
								<th className="px-5 py-3 text-left font-medium">Agente</th>
								{COLS.map((c) => (
									<th key={c.key} className="px-3 py-3 text-right font-medium">
										<button
											onClick={() =>
												setSort((s) => ({
													key: c.key,
													desc: s.key === c.key ? !s.desc : true,
												}))
											}
											className={clsx(
												"inline-flex items-center gap-1 uppercase transition-colors hover:text-fg",
												sort.key === c.key && "text-fg",
											)}
										>
											{c.label}
											{sort.key === c.key &&
												(sort.desc ? (
													<ArrowDown size={11} />
												) : (
													<ArrowUp size={11} />
												))}
										</button>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{sorted.map((g) => (
								<motion.tr
									layout
									transition={spring}
									key={g.key}
									className="border-t border-line hover:bg-white/[0.03]"
								>
									<td className="px-5 py-3">
										<div className="flex items-center gap-3">
											<AgentIcon name={g.key} size={36} />
											<div className="font-sans">
												<div className="font-medium">{g.key}</div>
												<div className="text-[11px] text-fg-3">
													{catalog.agents[g.key.toLowerCase()]?.role ?? ""}
												</div>
											</div>
										</div>
									</td>
									{COLS.map((c) => (
										<td
											key={c.key}
											className={clsx(
												"px-3 text-right",
												c.key === "winRate" &&
													(g.winRate >= 0.5 ? "text-win" : "text-loss"),
												sort.key === c.key && "font-semibold",
											)}
											style={
												c.key === "perf" && g.perfN
													? { color: perfColor(g.perf) }
													: undefined
											}
										>
											{c.fmt(g)}
										</td>
									))}
								</motion.tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

export function Maps({
	view,
	filters,
}: {
	view: GroupsView
	filters: Record<string, string>
}) {
	const catalog = useCatalog()
	const { groups } = view
	const [selected, setSelected] = useState<string | null>(null)
	const [show, setShow] = useState<"both" | "kills" | "deaths">("both")
	const active =
		selected ??
		groups.find((g) => catalog.maps[g.key.toLowerCase()]?.minimap)?.key ??
		null
	const activeMap = active ? catalog.maps[active.toLowerCase()] : undefined
	const heatmap = useView<HeatmapView>(
		"heatmap",
		{ ...filters, map: active ?? "" },
		!!active,
	)
	const points = heatmap.data?.points ?? []
	const activeGroup = groups.find((g) => g.key === active)

	if (!groups.length) return <EmptyState />

	return (
		<div className="grid gap-4">
			{activeMap && activeGroup && (
				<Panel
					title={`Mapa de calor · ${active}`}
					action={
						<Segmented
							size="sm"
							value={show}
							onChange={setShow}
							options={[
								{ value: "both", label: "Todo" },
								{ value: "kills", label: "Kills" },
								{ value: "deaths", label: "Muertes" },
							]}
						/>
					}
				>
					<div className="grid items-center gap-6 lg:grid-cols-[1fr_280px]">
						<Heatmap map={activeMap} points={points} show={show} />
						<div className="grid gap-3">
							<div className="flex gap-4 text-[12px] text-fg-3">
								<span className="flex items-center gap-1.5">
									<span className="h-2 w-2 rounded-full bg-win" /> Donde mataste
								</span>
								<span className="flex items-center gap-1.5">
									<span className="h-2 w-2 rounded-full bg-accent" /> Donde
									moriste
								</span>
							</div>
							{(
								[
									["Win rate", pct(activeGroup.winRate)],
									["Partidas", String(activeGroup.games)],
									["Ataque", pct(activeGroup.atkWinRate)],
									["Defensa", pct(activeGroup.defWinRate)],
									["K/D", fixed(activeGroup.kd)],
									[
										"Perf. Score",
										activeGroup.perfN ? activeGroup.perf.toFixed(0) : "—",
									],
								] as const
							).map(([k, v]) => (
								<div
									key={k}
									className="flex items-baseline justify-between border-b border-line pb-2 text-[13px]"
								>
									<span className="text-fg-3">{k}</span>
									<span className="num font-semibold">{v}</span>
								</div>
							))}
							<p className="text-[11px] text-fg-4">
								{points.length} posiciones de {activeGroup.detailed} partidas
								con detalle.
							</p>
						</div>
					</div>
				</Panel>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{groups.map((g, i) => (
					<motion.button
						key={g.key}
						onClick={() => setSelected(g.key)}
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...spring, delay: i * 0.04 }}
						className={clsx(
							"pressable group relative overflow-hidden rounded-[24px] text-left ring-1",
							g.key === active ? "ring-white/30" : "ring-line",
						)}
					>
						<div className="relative h-36 overflow-hidden">
							<Img
								src={catalog.maps[g.key.toLowerCase()]?.splash}
								className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-105"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-elevated via-elevated/40 to-transparent" />
							<div className="absolute right-4 bottom-3 left-4 flex items-end justify-between">
								<h3 className="display text-[26px] font-semibold">{g.key}</h3>
								<span
									className={clsx(
										"num text-[22px] font-semibold",
										g.winRate >= 0.5 ? "text-win" : "text-loss",
									)}
								>
									{pct(g.winRate)}
								</span>
							</div>
						</div>
						<div className="bg-elevated p-4">
							<div className="num mb-3 text-[12px] text-fg-3">
								{g.wins}V · {g.losses}D{g.draws ? ` · ${g.draws}E` : ""} ·{" "}
								{g.games} partidas
							</div>
							<div className="grid grid-cols-4 gap-2 text-center">
								{[
									["K/D", fixed(g.kd)],
									["ACS", g.acs.toFixed(0)],
									["HS%", pct(g.hs)],
									["PS", g.perfN ? g.perf.toFixed(0) : "—"],
								].map(([k, v]) => (
									<div key={k} className="rounded-xl bg-white/[0.035] py-2">
										<div className="num text-[14px] font-semibold">{v}</div>
										<div className="text-[10px] text-fg-3 uppercase">{k}</div>
									</div>
								))}
							</div>
							{g.detailed > 0 && (
								<div className="mt-4 grid gap-2 text-[12px]">
									<div className="flex items-center gap-3">
										<span className="w-14 text-fg-3">Ataque</span>
										<Bar value={g.atkWinRate} className="flex-1" />
										<span className="num w-9 text-right">
											{pct(g.atkWinRate)}
										</span>
									</div>
									<div className="flex items-center gap-3">
										<span className="w-14 text-fg-3">Defensa</span>
										<Bar value={g.defWinRate} className="flex-1" />
										<span className="num w-9 text-right">
											{pct(g.defWinRate)}
										</span>
									</div>
								</div>
							)}
						</div>
					</motion.button>
				))}
			</div>
		</div>
	)
}

export function Weapons({ view }: { view: WeaponsView }) {
	const stats = view.weapons
	const killedBy = useMemo(
		() =>
			[...stats]
				.sort((a, b) => b.deaths - a.deaths)
				.filter((w) => w.deaths)
				.slice(0, 8),
		[stats],
	)
	const totalDeaths = Math.max(
		1,
		stats.reduce((s, w) => s + w.deaths, 0),
	)
	if (!stats.length)
		return (
			<EmptyState text="Las armas salen del kill feed: se están descargando en segundo plano." />
		)
	const guns = stats.filter((w) => w.kills && !w.ability)
	const abilities = stats.filter((w) => w.kills && w.ability)
	const max = Math.max(1, ...guns.map((w) => w.kills))
	const maxAbility = Math.max(1, ...abilities.map((w) => w.kills))

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<Panel className="lg:col-span-2" title="Tus armas">
				<div className="mb-2 hidden grid-cols-[150px_1fr_56px_56px_64px] gap-4 px-2 text-[10px] tracking-wider text-fg-3 uppercase sm:grid">
					<span />
					<span>Kills</span>
					<span className="text-right">HS%</span>
					<span className="text-right">Dist.</span>
					<span className="text-right">Daño</span>
				</div>
				<ul className="grid gap-1">
					{guns.map((w, i) => (
						<motion.li
							key={w.weapon}
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ ...spring, delay: Math.min(i, 15) * 0.03 }}
							className="grid grid-cols-[96px_1fr_auto] items-center gap-4 rounded-2xl px-2 py-2.5 hover:bg-white/[0.03] sm:grid-cols-[150px_1fr_56px_56px_64px]"
						>
							<div className="flex h-8 items-center">
								<Img
									src={w.icon}
									alt={w.weapon}
									className="h-6 w-auto max-w-[120px] object-contain"
									fallback={<span className="text-fg-2">{w.weapon}</span>}
								/>
							</div>
							<div>
								<div className="mb-1.5 flex justify-between text-[12px]">
									<span className="font-medium">{w.weapon}</span>
									<span className="num text-fg-3">
										{w.kills} kills · {pct(w.share, 1)} del total
									</span>
								</div>
								<Bar value={w.kills / max} delay={Math.min(i, 15) * 0.03} />
							</div>
							<div className="num text-right text-[13px] sm:hidden">
								{pct(w.hs)} HS
							</div>
							<div className="num hidden text-right text-[13px] sm:block">
								{w.shots ? pct(w.hs) : "—"}
							</div>
							<div className="num hidden text-right text-[13px] text-fg-2 sm:block">
								{w.avgDist !== null ? `${w.avgDist.toFixed(0)} m` : "—"}
							</div>
							<div className="num hidden text-right text-[13px] text-fg-2 sm:block">
								{w.damage ? w.damage.toLocaleString("es-ES") : "—"}
							</div>
						</motion.li>
					))}
				</ul>
				<p className="mt-3 px-2 text-[11px] text-fg-4">
					HS% y daño se atribuyen al arma principal de cada ronda; la distancia
					es la media de tus kills.
				</p>
			</Panel>

			<div className="grid content-start gap-4">
				{abilities.length > 0 && (
					<Panel title="Kills con habilidades">
						<ul className="grid gap-3">
							{abilities.map((w, i) => (
								<li key={w.weapon} className="flex items-center gap-3">
									<AbilityIcon src={w.icon} name={w.weapon} />
									<div className="min-w-0 flex-1">
										<div className="mb-1.5 flex justify-between gap-2 text-[13px]">
											<span className="truncate">{w.weapon}</span>
											<span className="num shrink-0 text-fg-3">
												{w.kills} {w.kills === 1 ? "kill" : "kills"}
												{w.avgDist !== null &&
													` · a ${w.avgDist.toFixed(0)} m de media`}
											</span>
										</div>
										<Bar value={w.kills / maxAbility} delay={i * 0.04} />
									</div>
								</li>
							))}
						</ul>
					</Panel>
				)}

				<Panel title="Te mataron con">
					<ul className="grid gap-3">
						{killedBy.map((w, i) => (
							<li key={w.weapon} className="flex items-center gap-3">
								{w.ability && <AbilityIcon src={w.icon} name={w.weapon} />}
								<div className="min-w-0 flex-1">
									<div className="mb-1.5 flex justify-between gap-2 text-[13px]">
										<span className="truncate">{w.weapon}</span>
										<span className="num shrink-0 text-fg-3">
											{w.deaths} {w.deaths === 1 ? "muerte" : "muertes"} ·{" "}
											{pct(w.deaths / totalDeaths)}
										</span>
									</div>
									<Bar
										value={w.deaths / totalDeaths}
										color="var(--color-accent)"
										delay={i * 0.04}
									/>
								</div>
							</li>
						))}
					</ul>
				</Panel>
			</div>
		</div>
	)
}

function AbilityIcon({ src, name }: { src: string | null; name: string }) {
	return (
		<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-line">
			<Img
				src={src}
				alt={name}
				className="h-5 w-5 object-contain"
				fallback={
					<span className="text-[10px] font-semibold text-fg-3">
						{name.slice(0, 2)}
					</span>
				}
			/>
		</span>
	)
}

const seasonLabel = (s: string) =>
	s.toUpperCase().replace(/^E(\d+)A(\d+)$/, "Episodio $1 · Acto $2")

export function Seasons({
	profile,
	view,
}: {
	profile: Profile
	view: GroupsView
}) {
	const bySeason = useMemo(
		() => new Map(view.groups.map((g) => [g.key.toLowerCase(), g])),
		[view],
	)
	const keys = useMemo(() => {
		const all = new Set([
			...profile.seasons.map((s) => s.season.toLowerCase()),
			...bySeason.keys(),
		])
		return [...all].sort((a, b) => {
			const n = (s: string) => {
				const m = s.match(/e(\d+)a(\d+)/)
				return m ? Number(m[1]) * 10 + Number(m[2]) : 0
			}
			return n(b) - n(a)
		})
	}, [profile.seasons, bySeason])

	if (!keys.length)
		return <EmptyState text="Sin historial de temporadas competitivas." />

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{keys.map((key, i) => {
				const official = profile.seasons.find(
					(s) => s.season.toLowerCase() === key,
				)
				const mine = bySeason.get(key)
				const wins = official?.wins ?? mine?.wins ?? 0
				const total = official?.games ?? mine?.games ?? 0
				return (
					<motion.article
						key={key}
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...spring, delay: Math.min(i, 12) * 0.04 }}
						className={clsx("panel p-5", i === 0 && "ring-1 ring-white/15")}
					>
						<div className="flex items-start justify-between">
							<div>
								<div className="eyebrow">
									{i === 0 ? "Acto más reciente" : "Acto"}
								</div>
								<div className="mt-0.5 font-semibold">{seasonLabel(key)}</div>
							</div>
							{official && <RankIcon tier={official.endTier} size={52} />}
						</div>
						{official && (
							<div className="mt-3 flex items-baseline gap-2">
								<span className="text-[20px] font-semibold tracking-[-0.02em]">
									{official.endTierName}
								</span>
								<span className="text-[12px] text-fg-3">
									{i === 0 ? "ahora" : "final"}
								</span>
							</div>
						)}
						<div className="num mt-3 mb-1.5 flex justify-between text-[12px]">
							<span className="text-fg-3">
								{wins}V · {total - wins}D
							</span>
							<span className="font-medium">
								{pct(wins / Math.max(1, total))}
							</span>
						</div>
						<Bar
							value={wins / Math.max(1, total)}
							color={
								wins / Math.max(1, total) >= 0.5
									? "var(--color-win)"
									: "var(--color-loss)"
							}
							delay={0.1 + i * 0.03}
						/>
						{mine && (
							<div className="mt-4 grid grid-cols-4 gap-2 text-center">
								{[
									["K/D", fixed(mine.kd)],
									["ACS", mine.acs.toFixed(0)],
									["HS%", pct(mine.hs)],
									["PS", mine.perfN ? mine.perf.toFixed(0) : "—"],
								].map(([k, v]) => (
									<div key={k} className="rounded-xl bg-white/[0.035] py-2">
										<div className="num text-[13px] font-semibold">{v}</div>
										<div className="text-[10px] text-fg-3 uppercase">{k}</div>
									</div>
								))}
							</div>
						)}
						{official && official.actWins.length > 0 && (
							<div className="mt-4 flex flex-wrap gap-1">
								{official.actWins.slice(0, 9).map((t, j) => (
									<RankIcon key={j} tier={t} size={22} className="opacity-90" />
								))}
							</div>
						)}
					</motion.article>
				)
			})}
		</div>
	)
}

function EmptyState({
	text = "No hay partidas con estos filtros.",
}: {
	text?: string
}) {
	return <div className="panel py-24 text-center text-fg-3">{text}</div>
}
