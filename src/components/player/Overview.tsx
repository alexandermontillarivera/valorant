import { useMemo, useState } from "react"
import { motion } from "motion/react"
import {
	Bomb,
	Crosshair,
	Flame,
	Medal,
	Shield,
	Swords,
	Target,
	Trophy,
	Zap,
} from "lucide-react"
import clsx from "clsx"
import { acsOf, adrOf, groupBy, hsOf, kdOf } from "@/lib/stats"
import {
	clockTime,
	dayLabel,
	fixed,
	int,
	pct,
	signed,
	tierName,
} from "@/lib/format"
import {
	AgentIcon,
	AnimatedNumber,
	Bar,
	Img,
	Panel,
	RankIcon,
	Segmented,
	spring,
	useCatalog,
	useTierName,
} from "@/components/ui/primitives"
import { perfColor } from "@/components/ui/perf"
import {
	AreaChart,
	BarChart,
	Ring,
	Sparkline,
} from "@/components/charts/charts"
import type { Game } from "@/interfaces/game"
import type { RRPoint } from "@/interfaces/player"
import type { Summary } from "@/interfaces/stats"

const stagger = (i: number) => ({
	initial: { opacity: 0, y: 14 },
	animate: { opacity: 1, y: 0 },
	transition: { ...spring, delay: 0.03 * i },
})

type Metric = "perf" | "acs" | "kd" | "adr"

interface Props {
	games: Game[]
	summary: Summary
	rrHistory: RRPoint[]
	onOpen: (g: Game) => void
	onTab: (t: string) => void
}

export function Overview({
	games,
	summary: s,
	rrHistory,
	onOpen,
	onTab,
}: Props) {
	const catalog = useCatalog()
	const nameOfTier = useTierName()
	const recent = useMemo(() => games.slice(0, 40).reverse(), [games])
	const agents = useMemo(
		() => groupBy(games, (g) => g.agent).slice(0, 4),
		[games],
	)
	const maps = useMemo(() => groupBy(games, (g) => g.map).slice(0, 4), [games])
	const hasPerf = s.perfN > 0
	const [metric, setMetric] = useState<Metric>(hasPerf ? "perf" : "acs")

	const rr = useMemo(() => {
		const ids = new Set(games.map((g) => g.id))
		return rrHistory.filter((p) => ids.has(p.matchId))
	}, [games, rrHistory])

	if (!games.length) return <Empty />

	const series = (f: (g: Game) => number | undefined) =>
		recent.map(f).filter((v): v is number => v !== undefined)
	const kpis: {
		label: string
		value: number
		fmt: (v: number) => string
		sub: string
		series: number[]
		color?: string
		dim?: boolean
	}[] = [
		hasPerf
			? {
					label: "Performance Score",
					value: s.perf,
					fmt: (v) => v.toFixed(0),
					sub: `media de ${s.perfN} partidas`,
					series: series((g) => g.d?.perf?.score),
					color: perfColor(s.perf),
				}
			: {
					label: "KDA",
					value: s.kda,
					fmt: (v) => fixed(v),
					sub: `${fixed(s.kpr)} kills/ronda`,
					series: series((g) => (g.kills + g.assists) / Math.max(1, g.deaths)),
				},
		{
			label: "K/D",
			value: s.kd,
			fmt: (v) => fixed(v),
			sub: `${int(s.kills)} / ${int(s.deaths)} / ${int(s.assists)}`,
			series: series(kdOf),
			dim: s.kd < 1,
		},
		{
			label: "Win rate",
			value: s.winRate * 100,
			fmt: (v) => `${v.toFixed(0)}%`,
			sub: `${s.wins}V · ${s.losses}D${s.draws ? ` · ${s.draws}E` : ""}`,
			series: recent.map(
				(_, i) =>
					recent.slice(0, i + 1).filter((g) => g.result === "W").length /
					(i + 1),
			),
			dim: s.winRate < 0.5,
		},
		{
			label: "Headshot %",
			value: s.hs * 100,
			fmt: (v) => `${v.toFixed(1)}%`,
			sub: `Cuerpo ${pct(s.body)} · Piernas ${pct(s.legs)}`,
			series: series(hsOf),
		},
		{
			label: "ADR",
			value: s.adr,
			fmt: (v) => v.toFixed(0),
			sub: `Δ daño ${signed(Math.round(s.damageDelta))}/ronda`,
			series: series(adrOf),
		},
		{
			label: "ACS",
			value: s.acs,
			fmt: (v) => v.toFixed(0),
			sub: "Combat score medio",
			series: series(acsOf),
		},
		{
			label: "KAST",
			value: s.kast * 100,
			fmt: (v) => `${v.toFixed(0)}%`,
			sub: s.detailed ? "Kill, assist, survive, trade" : "Pendiente de detalle",
			series: series((g) => g.d?.kast),
		},
		{
			label: "First bloods",
			value: s.fkPerMatch,
			fmt: (v) => fixed(v, 1),
			sub: `${pct(s.fkRatio)} duelos de apertura ganados`,
			series: series((g) => g.d?.fk),
		},
	]

	const rrPoints = rr.map((h) => ({
		y: h.elo,
		tooltip: (
			<div className="flex items-center gap-2.5">
				<RankIcon tier={h.tier} size={26} />
				<div>
					<div className="font-medium text-fg">
						{h.tierName || nameOfTier(h.tier)} ·{" "}
						<span className="num">{h.rr} RR</span>
					</div>
					<div className="text-fg-3">
						<span
							className={clsx(
								"num font-medium",
								h.change >= 0 ? "text-win" : "text-loss",
							)}
						>
							{signed(h.change)}
						</span>{" "}
						· {h.map} · {dayLabel(h.date)}
					</div>
				</div>
			</div>
		),
	}))
	const bands = Object.keys(catalog.tiers).length
		? Object.entries(catalog.tiers)
				.filter(([t]) => Number(t) >= 3)
				.map(([t, info]) => ({ y: (Number(t) - 3) * 100, label: info.name }))
		: Array.from({ length: 25 }, (_, i) => ({
				y: i * 100,
				label: tierName(i + 3),
			}))
	const net = rr.reduce((a, h) => a + h.change, 0)

	const metricValue: Record<Metric, (g: Game) => number | null> = {
		perf: (g) => g.d?.perf?.score ?? null,
		acs: acsOf,
		kd: kdOf,
		adr: adrOf,
	}
	const metricAvg: Record<Metric, number> = {
		perf: s.perf,
		acs: s.acs,
		kd: s.kd,
		adr: s.adr,
	}
	const metricFmt = (v: number) => (metric === "kd" ? fixed(v) : v.toFixed(0))
	const bars = recent.filter((g) => metricValue[metric](g) !== null)
	const clutchWon = s.clutchWon.reduce((a, b) => a + b, 0)
	const clutchAtt = s.clutchAtt.reduce((a, b) => a + b, 0)

	return (
		<div className="grid grid-cols-12 gap-3 sm:gap-4">
			<div className="col-span-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
				{kpis.map((k, i) => (
					<motion.div
						key={k.label}
						{...stagger(i)}
						className="panel group relative overflow-hidden p-4 sm:p-5"
					>
						<div className="eyebrow">{k.label}</div>
						<div
							className={clsx(
								"num mt-1.5 text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]",
								k.dim && "text-fg-2",
							)}
							style={k.color ? { color: k.color } : undefined}
						>
							<AnimatedNumber value={k.value} format={k.fmt} />
						</div>
						<div className="mt-0.5 truncate text-[12px] text-fg-3">{k.sub}</div>
						<Sparkline
							values={k.series}
							className="mt-3 h-7 w-full opacity-60 transition-opacity group-hover:opacity-100"
						/>
					</motion.div>
				))}
			</div>

			<motion.div {...stagger(8)} className="col-span-12 lg:col-span-8">
				<Panel
					className="h-full"
					title="Historial de RR"
					action={
						rr.length > 0 && (
							<span
								className={clsx(
									"num rounded-full px-2 py-0.5 text-[12px] font-medium",
									net >= 0 ? "bg-win/10 text-win" : "bg-loss/10 text-loss",
								)}
							>
								{signed(net)} RR · {rr.length} partidas
							</span>
						)
					}
				>
					{rrPoints.length > 1 ? (
						<AreaChart points={rrPoints} bands={bands} height={240} />
					) : (
						<p className="py-16 text-center text-fg-3">
							El historial de RR solo existe para partidas competitivas.
						</p>
					)}
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(9)}
				className="col-span-12 sm:col-span-6 lg:col-span-4"
			>
				<Panel className="h-full" title="Resultados">
					<div className="flex items-center gap-6">
						<Ring value={s.winRate} size={124} stroke={9}>
							<div>
								<div className="num text-[26px] font-semibold tracking-[-0.03em]">
									{pct(s.winRate)}
								</div>
								<div className="text-[11px] text-fg-3">victorias</div>
							</div>
						</Ring>
						<dl className="grid flex-1 gap-2 text-[13px]">
							<Stat label="Victorias" value={s.wins} dot="bg-win" />
							<Stat label="Derrotas" value={s.losses} dot="bg-loss" />
							{s.draws > 0 && (
								<Stat label="Empates" value={s.draws} dot="bg-draw" />
							)}
							<Stat
								label="Racha actual"
								value={
									s.streak.currentType
										? `${s.streak.current}${s.streak.currentType === "W" ? "V" : "D"}`
										: "—"
								}
							/>
							<Stat label="Mejor racha" value={`${s.streak.longestWin}V`} />
						</dl>
					</div>
					<div className="mt-5">
						<div className="eyebrow mb-2">Forma reciente</div>
						<div className="flex gap-1">
							{games.slice(0, 20).map((g, i) => (
								<motion.button
									key={g.id}
									onClick={() => onOpen(g)}
									initial={{ opacity: 0, scaleY: 0.3 }}
									animate={{ opacity: 1, scaleY: 1 }}
									transition={{ ...spring, delay: 0.2 + i * 0.02 }}
									title={`${g.map} ${g.my}-${g.their}`}
									className={clsx(
										"pressable h-7 flex-1 rounded-[5px] hover:brightness-125",
										g.result === "D"
											? "bg-draw/50"
											: g.result === "W"
												? "bg-win/80"
												: "bg-loss/70",
									)}
								/>
							))}
						</div>
						<div className="mt-1.5 flex justify-between text-[11px] text-fg-4">
							<span>Más reciente</span>
							<span>Más antigua</span>
						</div>
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(10)} className="col-span-12 lg:col-span-8">
				<Panel
					title="Por partida"
					action={
						<Segmented
							size="sm"
							value={metric}
							onChange={setMetric}
							options={[
								...(hasPerf
									? [{ value: "perf" as Metric, label: "Perf." }]
									: []),
								{ value: "acs" as Metric, label: "ACS" },
								{ value: "kd" as Metric, label: "K/D" },
								{ value: "adr" as Metric, label: "ADR" },
							]}
						/>
					}
				>
					<BarChart
						key={metric}
						height={190}
						average={metricAvg[metric]}
						avgLabel={`media ${metricFmt(metricAvg[metric])}`}
						data={bars.map((g) => {
							const v = metricValue[metric](g)!
							return {
								value: v,
								color:
									g.result === "D"
										? "var(--color-draw)"
										: g.result === "W"
											? "var(--color-win)"
											: "var(--color-loss)",
								onClick: () => onOpen(g),
								tooltip: (
									<div className="flex items-center gap-2.5">
										<AgentIcon name={g.agent} size={28} />
										<div>
											<div className="font-medium text-fg">
												{g.map} ·{" "}
												<span
													className={
														g.result === "W"
															? "text-win"
															: g.result === "D"
																? "text-fg-2"
																: "text-loss"
													}
												>
													{g.my}–{g.their}
												</span>{" "}
												· {metricFmt(v)}
											</div>
											<div className="num text-fg-3">
												{g.kills}/{g.deaths}/{g.assists} · {acsOf(g).toFixed(0)}{" "}
												ACS · {dayLabel(g.startedAt)} {clockTime(g.startedAt)}
											</div>
										</div>
									</div>
								),
							}
						})}
					/>
					<div className="mt-3 flex items-center gap-3 text-[11px] text-fg-3">
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-[3px] bg-win" />
							Victoria
						</span>
						<span className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-[3px] bg-loss" />
							Derrota
						</span>
						<span className="ml-auto">Últimas {bars.length} partidas</span>
					</div>
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(11)}
				className="col-span-12 sm:col-span-6 lg:col-span-4"
			>
				<Panel className="h-full" title="Precisión">
					<Accuracy s={s} />
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(12)}
				className="col-span-12 md:col-span-6 lg:col-span-4"
			>
				<Panel
					className="h-full"
					title="Agentes principales"
					action={<More onClick={() => onTab("agents")} />}
				>
					<ul className="grid gap-3">
						{agents.map((a, i) => (
							<li key={a.key} className="flex items-center gap-3">
								<AgentIcon name={a.key} size={38} />
								<div className="min-w-0 flex-1">
									<div className="flex items-baseline justify-between">
										<span className="font-medium">{a.key}</span>
										<span className="num text-[12px] text-fg-3">
											{a.games} partidas
										</span>
									</div>
									<div className="mt-1 flex items-center gap-2">
										<Bar
											value={a.winRate}
											color={
												a.winRate >= 0.5
													? "var(--color-win)"
													: "var(--color-loss)"
											}
											className="flex-1"
											delay={0.1 * i}
										/>
										<span className="num w-9 text-right text-[12px] text-fg-2">
											{pct(a.winRate)}
										</span>
									</div>
									<div className="num mt-0.5 text-[11px] text-fg-3">
										{fixed(a.kd)} K/D · {a.acs.toFixed(0)} ACS
										{a.perfN ? ` · ${a.perf.toFixed(0)} PS` : ""}
									</div>
								</div>
							</li>
						))}
					</ul>
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(13)}
				className="col-span-12 md:col-span-6 lg:col-span-4"
			>
				<Panel
					className="h-full"
					title="Mapas"
					action={<More onClick={() => onTab("maps")} />}
				>
					<ul className="grid gap-2">
						{maps.map((m) => (
							<MapRow
								key={m.key}
								name={m.key}
								wins={m.wins}
								losses={m.losses}
								kd={m.kd}
								winRate={m.winRate}
							/>
						))}
					</ul>
				</Panel>
			</motion.div>

			<motion.div {...stagger(14)} className="col-span-12 lg:col-span-4">
				<Panel
					className="h-full"
					title="Impacto"
					action={<More onClick={() => onTab("combat")} />}
				>
					<div className="grid gap-3">
						{(
							[
								[
									"Ataque",
									s.atkWinRate,
									s.atkRounds,
									<Swords key="a" size={14} />,
								],
								[
									"Defensa",
									s.defWinRate,
									s.defRounds,
									<Shield key="d" size={14} />,
								],
							] as const
						).map(([label, rate, rounds, icon], i) => (
							<div key={label}>
								<div className="mb-1.5 flex items-center justify-between text-[13px]">
									<span className="flex items-center gap-1.5 text-fg-2">
										{icon} {label}
									</span>
									<span className="num">
										<span className="font-semibold">{pct(rate)}</span>{" "}
										<span className="text-fg-3">· {rounds} rondas</span>
									</span>
								</div>
								<Bar value={rate} delay={0.1 * i} />
							</div>
						))}
					</div>
					<div className="mt-5 grid grid-cols-2 gap-2">
						<Tile
							icon={<Trophy size={14} className="text-gold" />}
							label="MVP partida"
							value={s.mvps}
						/>
						<Tile
							icon={<Medal size={14} className="text-fg-2" />}
							label="MVP equipo"
							value={s.teamMvps}
						/>
						<Tile
							icon={<Flame size={14} className="text-accent" />}
							label="Aces"
							value={s.multi[3]}
						/>
						<Tile
							icon={<Target size={14} className="text-info" />}
							label="Clutches"
							value={`${clutchWon}/${clutchAtt}`}
						/>
						<Tile
							icon={<Zap size={14} className="text-fg-2" />}
							label="FK / FD por partida"
							value={`${fixed(s.fkPerMatch, 1)} / ${fixed(s.fdPerMatch, 1)}`}
						/>
						<Tile
							icon={<Bomb size={14} className="text-fg-2" />}
							label="Plantas / defuses"
							value={`${s.plants} / ${s.defuses}`}
						/>
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(15)} className="col-span-12">
				<Panel title="Récords">
					<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
						{(
							[
								["Más kills", s.best.kills, (v: number) => String(v)],
								["Mejor ACS", s.best.acs, (v: number) => v.toFixed(0)],
								["Mejor ADR", s.best.adr, (v: number) => v.toFixed(0)],
								["Mejor Perf. Score", s.best.perf, (v: number) => v.toFixed(0)],
							] as const
						).map(([label, best, fmt]) =>
							best ? (
								<button
									key={label}
									onClick={() => onOpen(best.game)}
									className="pressable flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3 text-left ring-1 ring-line hover:bg-white/[0.06]"
								>
									<AgentIcon name={best.game.agent} size={36} />
									<div className="min-w-0">
										<div className="text-[11px] text-fg-3">{label}</div>
										<div className="num text-[20px] font-semibold tracking-[-0.02em]">
											{fmt(best.value)}
										</div>
										<div className="truncate text-[11px] text-fg-3">
											{best.game.map} · {dayLabel(best.game.startedAt)}
										</div>
									</div>
								</button>
							) : null,
						)}
					</div>
				</Panel>
			</motion.div>
		</div>
	)
}

function Stat({
	label,
	value,
	dot,
}: {
	label: string
	value: React.ReactNode
	dot?: string
}) {
	return (
		<div className="flex items-center justify-between">
			<dt className="flex items-center gap-2 text-fg-3">
				{dot && <span className={clsx("h-2 w-2 rounded-full", dot)} />}
				{label}
			</dt>
			<dd className="num font-medium">{value}</dd>
		</div>
	)
}

function More({ onClick }: { onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className="pressable text-[12px] font-medium text-fg-3 hover:text-fg"
		>
			Ver todo
		</button>
	)
}

export function Tile({
	icon,
	label,
	value,
}: {
	icon?: React.ReactNode
	label: string
	value: React.ReactNode
}) {
	return (
		<div className="rounded-2xl bg-white/[0.035] px-3 py-2.5 ring-1 ring-line">
			<div className="flex items-center gap-1.5 text-[11px] text-fg-3">
				{icon}
				{label}
			</div>
			<div className="num mt-0.5 text-[18px] font-semibold tracking-[-0.02em]">
				{value}
			</div>
		</div>
	)
}

export function MapRow({
	name,
	wins,
	losses,
	kd,
	winRate,
}: {
	name: string
	wins: number
	losses: number
	kd: number
	winRate: number
}) {
	const map = useCatalog().maps[name.toLowerCase()]
	return (
		<li className="relative h-14 overflow-hidden rounded-2xl ring-1 ring-line">
			<Img
				src={map?.listIcon}
				className="absolute inset-0 h-full w-full object-cover opacity-60"
			/>
			<div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/20" />
			<div className="relative flex h-full items-center justify-between px-4">
				<div>
					<div className="font-semibold tracking-[-0.01em]">{name}</div>
					<div className="num text-[11px] text-fg-3">
						{wins}V {losses}D · {fixed(kd)} K/D
					</div>
				</div>
				<div
					className={clsx(
						"num text-[18px] font-semibold",
						winRate >= 0.5 ? "text-win" : "text-loss",
					)}
				>
					{pct(winRate)}
				</div>
			</div>
		</li>
	)
}

function Accuracy({ s }: { s: Summary }) {
	const parts = [
		{ key: "head", label: "Cabeza", v: s.hs },
		{ key: "body", label: "Cuerpo", v: s.body },
		{ key: "legs", label: "Piernas", v: s.legs },
	]
	const fill = (v: number) => `rgba(255,70,85,${0.18 + v * 1.4})`
	return (
		<div className="flex items-center gap-6">
			<svg viewBox="0 0 60 130" className="h-[170px] w-auto shrink-0">
				<motion.circle
					cx="30"
					cy="14"
					r="11"
					fill={fill(s.hs)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}
				/>
				<motion.path
					d="M14 30 h32 a6 6 0 0 1 6 6 v34 a4 4 0 0 1 -4 4 h-4 v-30 h-2 v32 h-24 v-32 h-2 v30 h-4 a4 4 0 0 1 -4 -4 v-34 a6 6 0 0 1 6 -6z"
					fill={fill(s.body)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
				/>
				<motion.path
					d="M18 78 h11 v48 a3 3 0 0 1 -3 3 h-5 a3 3 0 0 1 -3 -3z M31 78 h11 v48 a3 3 0 0 1 -3 3 h-5 a3 3 0 0 1 -3 -3z"
					fill={fill(s.legs)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
				/>
			</svg>
			<div className="grid flex-1 gap-4">
				{parts.map((p) => (
					<div key={p.key} className="flex items-baseline justify-between">
						<span className="text-[13px] text-fg-3">{p.label}</span>
						<span className="num text-[20px] font-semibold tracking-[-0.02em]">
							{pct(p.v, 1)}
						</span>
					</div>
				))}
				<div className="flex items-center gap-1.5 text-[11px] text-fg-3">
					<Crosshair size={12} /> Sobre impactos totales
				</div>
			</div>
		</div>
	)
}

function Empty() {
	return (
		<div className="panel grid place-items-center px-6 py-24 text-center">
			<div>
				<div className="text-[17px] font-semibold">
					No hay partidas con estos filtros
				</div>
				<p className="mt-1 text-fg-3">Prueba con otro modo o periodo.</p>
			</div>
		</div>
	)
}
