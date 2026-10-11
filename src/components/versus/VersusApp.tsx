import { useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Crown } from "lucide-react"
import clsx from "clsx"
import { useJson } from "@/hooks/useView"
import { PERIODS, queueOptions } from "@/lib/filters"
import { cardArt, signed } from "@/lib/format"
import { PlayerNav } from "@/components/PlayerNav"
import { Form } from "@/components/ui/Form"
import { Block, ErrorBox } from "@/components/ui/Skeleton"
import {
	CatalogProvider,
	Img,
	Panel,
	RankIcon,
	Segmented,
	spring,
	useCatalog,
	useTierName,
} from "@/components/ui/primitives"
import { TimeChart } from "@/components/charts/charts"
import {
	COLOR_A,
	COLOR_B,
	METRIC_GROUPS,
	winner,
	type Metric,
} from "@/components/versus/metrics"
import { HeadToHead } from "@/components/versus/HeadToHead"
import {
	AgentsCompare,
	MapsCompare,
	RolesCompare,
} from "@/components/versus/Pools"
import type { Catalog } from "@/interfaces/catalog"
import type { Period } from "@/interfaces/stats"
import type { TrackedPlayer } from "@/interfaces/players"
import type { VersusSide, VersusView } from "@/interfaces/versus"

interface Props {
	players: TrackedPlayer[]
	catalog: Catalog
	initialA: string
	initialB: string
	initialMode?: string
	initialPeriod?: string
}

export default function VersusApp({
	players,
	catalog,
	initialA,
	initialB,
	initialMode,
	initialPeriod,
}: Props) {
	const [a, setA] = useState(initialA)
	const [b, setB] = useState(initialB)
	const [mode, setMode] = useState(initialMode ?? "competitive")
	const [period, setPeriod] = useState<Period>(
		PERIODS.some((p) => p.value === initialPeriod)
			? (initialPeriod as Period)
			: "all",
	)

	const sync = (next: Record<string, string>) => {
		const url = new URL(location.href)
		for (const [k, v] of Object.entries(next)) url.searchParams.set(k, v)
		if (url.searchParams.get("mode") === "competitive")
			url.searchParams.delete("mode")
		if (url.searchParams.get("period") === "all")
			url.searchParams.delete("period")
		history.replaceState(history.state, "", url)
	}

	const pick = (side: "a" | "b", slug: string) => {
		// Picking the opponent's player swaps both sides instead of comparing someone with themself.
		const [na, nb] =
			side === "a" ? [slug, slug === b ? a : b] : [slug === a ? b : a, slug]
		setA(na)
		setB(nb)
		sync({ a: na, b: nb })
	}

	const url = `/api/versus?${new URLSearchParams({ a, b, mode, period })}`
	const { data, error } = useJson<VersusView>(url)
	const [last, setLast] = useState<VersusView>()
	if (data && data !== last) setLast(data)
	// Keep the previous comparison on screen while a new one loads, unless the players changed.
	const view =
		data ?? (last && last.a.slug === a && last.b.slug === b ? last : undefined)
	const loading = !data && !error

	const queues = useMemo(
		() => (view ? queueOptions(view.queues) : [{ value: mode, label: "…" }]),
		[view?.queues, mode],
	)

	const tally = useMemo(() => {
		if (!view) return null
		let x = 0
		let y = 0
		for (const g of METRIC_GROUPS)
			for (const m of g.metrics) {
				const w = winner(m, view.a, view.b)
				if (w < 0) x++
				if (w > 0) y++
			}
		return [x, y] as const
	}, [view])

	const name = (slug: string) => players.find((p) => p.slug === slug)

	return (
		<CatalogProvider value={catalog}>
			<main className="mx-auto max-w-[1240px] px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
				<PlayerNav players={players} current="versus" />

				<section className="relative overflow-hidden rounded-[28px] ring-1 ring-line">
					<div className="absolute inset-0 grid grid-cols-2">
						{[view?.a, view?.b].map((s, i) => (
							<div key={i} className="relative overflow-hidden">
								{s && (
									<Img
										src={cardArt(s.profile.cardId)}
										className="h-full w-full scale-125 object-cover opacity-35 blur-2xl saturate-150"
									/>
								)}
							</div>
						))}
						<div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/70 to-bg" />
						<div
							className="absolute inset-0"
							style={{
								background: `radial-gradient(50% 90% at 0% 0%, ${COLOR_A}22, transparent 70%), radial-gradient(50% 90% at 100% 0%, ${COLOR_B}22, transparent 70%)`,
							}}
						/>
					</div>

					<div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-5 sm:gap-6 sm:p-8">
						<Fighter
							side="a"
							color={COLOR_A}
							data={view?.a}
							fallback={name(a)}
							players={players}
							value={a}
							onPick={(s) => pick("a", s)}
						/>
						<div className="flex flex-col items-center gap-2">
							<span className="display text-[13px] font-semibold tracking-[0.2em] text-fg-3">
								VS
							</span>
							{tally ? (
								<motion.div
									key={`${tally[0]}-${tally[1]}`}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={spring}
									className="num flex items-baseline gap-2 text-[34px] leading-none font-semibold tracking-[-0.04em] sm:text-[52px]"
								>
									<span
										style={{
											color: tally[0] >= tally[1] ? COLOR_A : undefined,
										}}
									>
										{tally[0]}
									</span>
									<span className="text-[22px] text-fg-4 sm:text-[32px]">
										–
									</span>
									<span
										style={{
											color: tally[1] >= tally[0] ? COLOR_B : undefined,
										}}
									>
										{tally[1]}
									</span>
								</motion.div>
							) : (
								<Block className="h-10 w-24 sm:h-12" />
							)}
							<span className="hidden text-center text-[11px] text-fg-3 sm:block">
								categorías ganadas
							</span>
						</div>
						<Fighter
							side="b"
							color={COLOR_B}
							data={view?.b}
							fallback={name(b)}
							players={players}
							value={b}
							onPick={(s) => pick("b", s)}
						/>
					</div>
				</section>

				<div className="mt-5 mb-5 flex flex-wrap items-center gap-2">
					<div className="max-w-full overflow-x-auto [scrollbar-width:none]">
						<Segmented
							size="sm"
							value={mode}
							onChange={(m) => {
								setMode(m)
								sync({ mode: m })
							}}
							options={queues}
						/>
					</div>
					<div className="max-w-full overflow-x-auto [scrollbar-width:none]">
						<Segmented
							size="sm"
							value={period}
							onChange={(p) => {
								setPeriod(p)
								sync({ period: p })
							}}
							options={PERIODS}
						/>
					</div>
					<AnimatePresence>
						{loading && view && (
							<motion.span
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="ml-auto text-[12px] text-fg-3"
							>
								Actualizando…
							</motion.span>
						)}
					</AnimatePresence>
				</div>

				{error && !view ? (
					<ErrorBox message={error} />
				) : !view ? (
					<VersusSkeleton />
				) : (
					<motion.div
						key={`${view.a.slug}-${view.b.slug}`}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: loading ? 0.6 : 1, y: 0 }}
						transition={spring}
						className="grid gap-3 sm:gap-4"
					>
						<EloPanel view={view} />
						<HeadToHead view={view} />
						<div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
							{METRIC_GROUPS.map((g) => (
								<Panel key={g.title} title={g.title}>
									<div className="grid gap-3.5">
										{g.metrics.map((m) => (
											<CompareRow
												key={m.key}
												metric={m}
												a={view.a}
												b={view.b}
											/>
										))}
									</div>
								</Panel>
							))}
						</div>
						<AgentsCompare view={view} />
						<div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_2fr]">
							<RolesCompare view={view} />
							<MapsCompare view={view} />
						</div>
					</motion.div>
				)}
			</main>
		</CatalogProvider>
	)
}

function Fighter({
	side,
	color,
	data,
	fallback,
	players,
	value,
	onPick,
}: {
	side: "a" | "b"
	color: string
	data?: VersusSide
	fallback?: TrackedPlayer
	players: TrackedPlayer[]
	value: string
	onPick: (slug: string) => void
}) {
	const p = data?.profile
	const right = side === "b"
	return (
		<div
			className={clsx(
				"flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
				right ? "items-end text-right sm:flex-row-reverse" : "items-start",
			)}
		>
			<div
				className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[18px] bg-white/5 ring-2 sm:h-[88px] sm:w-[88px] sm:rounded-[24px]"
				style={{ ["--tw-ring-color" as string]: `${color}66` }}
			>
				{p && (
					<Img
						src={cardArt(p.cardId, "smallart")}
						className="h-full w-full object-cover"
					/>
				)}
			</div>
			<div className="min-w-0 max-w-full">
				<label className="pressable relative inline-flex max-w-full cursor-pointer items-center gap-1 rounded-lg">
					<span className="truncate text-[17px] font-semibold tracking-[-0.02em] sm:text-[26px]">
						{p?.name ?? fallback?.name}
						<span className="hidden font-normal text-fg-3 sm:inline">
							#{p?.tag ?? fallback?.tag}
						</span>
					</span>
					<ChevronDown size={16} className="shrink-0 text-fg-3" />
					<select
						aria-label={side === "a" ? "Jugador 1" : "Jugador 2"}
						value={value}
						onChange={(e) => onPick(e.target.value)}
						className="absolute inset-0 cursor-pointer opacity-0"
					>
						{players.map((pl) => (
							<option key={pl.slug} value={pl.slug}>
								{pl.name}#{pl.tag}
							</option>
						))}
					</select>
				</label>
				{p ? (
					<div
						className={clsx(
							"mt-1.5 flex items-center gap-2",
							right && "flex-row-reverse",
						)}
					>
						<RankIcon tier={p.rank.tier} size={28} />
						<div className="min-w-0">
							<div className="truncate text-[13px] font-medium">
								{p.rank.name}
								<span className="num text-fg-3"> · {p.rank.rr} RR</span>
							</div>
							{p.peak && (
								<div
									className={clsx(
										"hidden items-center gap-1 text-[11px] text-fg-3 sm:flex",
										right && "justify-end",
									)}
								>
									<Crown size={10} className="text-gold" /> {p.peak.name}
								</div>
							)}
						</div>
					</div>
				) : (
					<Block className={clsx("mt-2 h-7 w-32", right && "ml-auto")} />
				)}
				{data && (
					<div className={clsx("mt-2 flex", right && "justify-end")}>
						<Form results={data.form} />
					</div>
				)}
			</div>
		</div>
	)
}

function CompareRow({
	metric: m,
	a,
	b,
}: {
	metric: Metric
	a: VersusSide
	b: VersusSide
}) {
	const x = m.get(a)
	const y = m.get(b)
	const w = winner(m, a, b)
	const max = Math.max(Math.abs(x ?? 0), Math.abs(y ?? 0)) || 1
	const value = (v: number | null, win: boolean, color: string) => (
		<span
			className={clsx(
				"num text-[15px] font-semibold tracking-[-0.01em] transition-colors",
				!win && "text-fg-3",
			)}
			style={win ? { color } : undefined}
		>
			{v === null ? "—" : m.format(v)}
		</span>
	)
	const bar = (
		v: number | null,
		color: string,
		win: boolean,
		flip: boolean,
	) => (
		<div
			className={clsx(
				"h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]",
				flip && "flex justify-end",
			)}
		>
			<motion.div
				className="h-full rounded-full"
				style={{
					background: color,
					opacity: win ? 1 : 0.35,
					width: "100%",
					transformOrigin: flip ? "right" : "left",
				}}
				initial={{ scaleX: 0 }}
				animate={{ scaleX: v === null ? 0 : Math.abs(v) / max }}
				transition={spring}
			/>
		</div>
	)
	return (
		<div title={m.hint}>
			<div className="mb-1.5 flex items-center justify-between gap-3">
				{value(x, w < 0, COLOR_A)}
				<span className="truncate text-center text-[12px] text-fg-2">
					{m.label}
				</span>
				{value(y, w > 0, COLOR_B)}
			</div>
			<div className="flex items-center gap-1">
				{bar(x, COLOR_A, w < 0, true)}
				{bar(y, COLOR_B, w > 0, false)}
			</div>
		</div>
	)
}

function EloPanel({ view }: { view: VersusView }) {
	const catalog = useCatalog()
	const nameOfTier = useTierName()
	const bands = useMemo(
		() =>
			Object.entries(catalog.tiers)
				.filter(([t]) => Number(t) >= 3)
				.map(([t, info]) => ({ y: (Number(t) - 3) * 100, label: info.name })),
		[catalog],
	)
	const series = useMemo(
		() =>
			[
				[view.a, COLOR_A],
				[view.b, COLOR_B],
			].map(([s, color]) => {
				const side = s as VersusSide
				return {
					label: side.profile.name,
					color: color as string,
					points: side.elo.map((p) => ({ t: p.t, y: p.elo })),
				}
			}),
		[view],
	)
	const tierOf = (elo: number) => {
		const tier = Math.min(27, Math.floor(elo / 100) + 3)
		return `${nameOfTier(tier)} · ${elo % 100} RR`
	}
	const diff = view.a.profile.rank.elo - view.b.profile.rank.elo
	return (
		<Panel
			title="Evolución de rango"
			action={
				<span className="text-[12px] text-fg-3">
					{diff === 0 ? (
						"Mismo Elo"
					) : (
						<>
							<span
								className="font-medium"
								style={{ color: diff > 0 ? COLOR_A : COLOR_B }}
							>
								{diff > 0 ? view.a.profile.name : view.b.profile.name}
							</span>{" "}
							va <span className="num">{signed(Math.abs(diff))}</span> RR por
							delante
						</>
					)}
				</span>
			}
		>
			<TimeChart
				series={series}
				bands={bands}
				format={tierOf}
				formatT={(t) =>
					new Date(t).toLocaleDateString("es-ES", {
						day: "numeric",
						month: "short",
						year: "numeric",
					})
				}
			/>
			<Legend view={view} />
		</Panel>
	)
}

function Legend({ view }: { view: VersusView }) {
	return (
		<div className="mt-3 flex flex-wrap gap-4 text-[12px] text-fg-3">
			{(
				[
					[view.a, COLOR_A],
					[view.b, COLOR_B],
				] as const
			).map(([s, color]) => (
				<span key={s.slug} className="inline-flex items-center gap-1.5">
					<span
						className="h-2 w-2 rounded-full"
						style={{ background: color }}
					/>
					{s.profile.name}
				</span>
			))}
		</div>
	)
}

function VersusSkeleton() {
	const panel = (children: ReactNode, key: number, className?: string) => (
		<div key={key} className={clsx("panel p-5", className)}>
			<Block className="mb-5 h-3 w-28" />
			{children}
		</div>
	)
	return (
		<div className="grid gap-3 sm:gap-4">
			{panel(<Block className="h-[260px]" />, 0)}
			<div className="grid gap-3 sm:gap-4 md:grid-cols-2">
				{[1, 2].map((i) => panel(<Block className="h-40" />, i))}
			</div>
			<div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
				{[3, 4, 5, 6].map((i) =>
					panel(
						<div className="grid gap-4">
							{Array.from({ length: 5 }, (_, j) => (
								<Block key={j} className="h-8" />
							))}
						</div>,
						i,
					),
				)}
			</div>
		</div>
	)
}
