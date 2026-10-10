import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import {
	ChevronRight,
	Loader2,
	Medal,
	SlidersHorizontal,
	Trophy,
} from "lucide-react"
import clsx from "clsx"
import { acsOf, adrOf, hsOf, kdOf, summarize } from "@/lib/stats"
import {
	clockTime,
	dayLabel,
	duration,
	fixed,
	pct,
	shortDate,
	signed,
} from "@/lib/format"
import { AgentIcon, Img, spring, useCatalog } from "@/components/ui/primitives"
import { PerfBadge } from "@/components/ui/perf"
import { Block, ErrorBox, ListSkeleton } from "@/components/ui/Skeleton"
import {
	EMPTY_CRITERIA,
	FilterPanel,
	SearchBar,
	activeCount,
	isEmpty,
} from "@/components/player/SearchFilters"
import { fetchView, useView, viewUrl, type ViewParams } from "@/hooks/useView"
import type { Game } from "@/interfaces/game"
import type { SearchCriteria, SearchView } from "@/interfaces/views"

const PAGE = 30

function toParams(c: SearchCriteria): ViewParams {
	return {
		q: c.q.trim() || undefined,
		player: c.player?.puuid,
		side: c.player && c.side !== "any" ? c.side : undefined,
		agent: c.agent || undefined,
		map: c.map || undefined,
		result: c.result || undefined,
		mvp: c.mvp || undefined,
		from: c.from || undefined,
		to: c.to || undefined,
		sort: c.sort === "date" ? undefined : c.sort,
		c: c.conditions.map((x) => `${x.metric}:${x.op}:${x.value}`),
	}
}

export function MatchList({
	filters,
	onOpen,
}: {
	filters: Record<string, string>
	onOpen: (g: Game) => void
}) {
	const [criteria, setCriteria] = useState<SearchCriteria>(EMPTY_CRITERIA)
	const [showFilters, setShowFilters] = useState(false)
	const params = useMemo(
		() => ({ ...filters, ...toParams(criteria) }),
		[filters, criteria],
	)
	const first = useView<SearchView>("search", {
		...params,
		limit: PAGE,
		offset: 0,
	})
	const last = useRef<SearchView | undefined>(undefined)
	if (first.data) last.current = first.data
	const view = first.data ?? last.current
	const loading = !first.data

	const [more, setMore] = useState<Game[]>([])
	const [loadingMore, setLoadingMore] = useState(false)
	const paramKey = JSON.stringify(params)
	useEffect(() => setMore([]), [paramKey])

	const games = useMemo(
		() => [...(view?.games ?? []), ...(loading ? [] : more)],
		[view, more, loading],
	)
	const total = view?.total ?? 0

	const loadMore = async () => {
		setLoadingMore(true)
		try {
			const page = await fetchView<SearchView>(
				viewUrl("search", { ...params, limit: PAGE, offset: games.length }),
			)
			setMore((m) => [...m, ...page.games])
		} finally {
			setLoadingMore(false)
		}
	}

	const byDate = criteria.sort === "date"
	const groups = useMemo(() => {
		if (!byDate) return [{ day: "", games }]
		const out: { day: string; games: Game[] }[] = []
		for (const g of games) {
			const day = dayLabel(g.startedAt)
			if (out.at(-1)?.day === day) out.at(-1)!.games.push(g)
			else out.push({ day, games: [g] })
		}
		return out
	}, [games, byDate])

	const s = view?.summary
	const filtersOn = activeCount(criteria)
	let index = 0
	return (
		<div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
			<button
				type="button"
				onClick={() => setShowFilters((v) => !v)}
				className="pressable inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-[13px] font-medium ring-1 ring-line lg:hidden"
			>
				<SlidersHorizontal size={14} />
				{showFilters ? "Ocultar filtros" : "Filtros"}
				{filtersOn > 0 && (
					<span className="num rounded-full bg-gold/15 px-1.5 text-[11px] text-gold">
						{filtersOn}
					</span>
				)}
			</button>

			<aside className={clsx("lg:block", !showFilters && "hidden")}>
				<FilterPanel
					criteria={criteria}
					onChange={setCriteria}
					facets={view?.facets}
				/>
			</aside>

			<div className="grid min-w-0 gap-4">
				<SearchBar criteria={criteria} onChange={setCriteria} />

				<div className="flex flex-wrap items-center justify-between gap-3 px-1">
					<div className="num flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-fg-3">
						{s ? (
							<>
								<span className="text-fg">
									<b className="font-semibold">{total}</b>{" "}
									{total === 1 ? "partida" : "partidas"}
									{!isEmpty(criteria) && " encontradas"}
								</span>
								{total > 0 && (
									<>
										<span>
											{pct(s.winRate)} victorias ({s.wins}V {s.losses}D)
										</span>
										<span>{fixed(s.kd)} K/D</span>
										<span>{s.acs.toFixed(0)} ACS</span>
										<span>{pct(s.hs)} HS</span>
										{s.perfN > 0 && <span>{s.perf.toFixed(0)} PS</span>}
									</>
								)}
								{loading && <Loader2 size={13} className="animate-spin" />}
							</>
						) : (
							<Block className="h-3 w-56" />
						)}
					</div>
					<select
						value={criteria.sort}
						onChange={(e) =>
							setCriteria({
								...criteria,
								sort: e.target.value as SearchCriteria["sort"],
							})
						}
						className="h-8 rounded-full bg-white/[0.05] px-3 text-[12.5px] text-fg ring-1 ring-line outline-none focus:ring-white/25"
						aria-label="Ordenar"
					>
						<option value="date">Más recientes</option>
						<option value="kills">Más kills</option>
						<option value="acs">Mejor ACS</option>
						<option value="kd">Mejor K/D</option>
						<option value="adr">Mejor ADR</option>
						<option value="perf">Mejor Perf. Score</option>
					</select>
				</div>

				{first.error ? (
					<ErrorBox message={first.error} />
				) : !view ? (
					<ListSkeleton />
				) : (
					<div
						className={clsx(
							"grid grid-cols-[minmax(0,1fr)] gap-6 transition-opacity duration-200",
							loading && "opacity-50",
						)}
					>
						{!games.length ? (
							<div className="panel py-20 text-center text-fg-3">
								Ninguna partida cumple estos filtros.
							</div>
						) : (
							groups.map((group) => {
								const gs = summarize(group.games)
								return (
									<section key={group.day || "results"}>
										{group.day && (
											<header className="mb-2 flex items-baseline justify-between px-1">
												<h3 className="text-[13px] font-semibold first-letter:uppercase">
													{group.day}
												</h3>
												<span className="num text-[12px] text-fg-3">
													{gs.wins}V {gs.losses}D · {fixed(gs.kd)} K/D ·{" "}
													{gs.acs.toFixed(0)} ACS
													{gs.perfN ? ` · ${gs.perf.toFixed(0)} PS` : ""}
												</span>
											</header>
										)}
										<ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
											{group.games.map((g) => (
												<MatchRow
													key={g.id}
													game={g}
													onOpen={onOpen}
													i={index++}
													showDate={!byDate}
												/>
											))}
										</ul>
									</section>
								)
							})
						)}

						{games.length < total && !loading && (
							<button
								onClick={loadMore}
								disabled={loadingMore}
								className="pressable mx-auto inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-5 py-2.5 text-[13px] font-medium text-fg-2 ring-1 ring-line hover:bg-white/[0.08] hover:text-fg disabled:opacity-60"
							>
								{loadingMore && <Loader2 size={14} className="animate-spin" />}
								Cargar más · quedan {total - games.length}
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

function MatchRow({
	game: g,
	onOpen,
	i,
	showDate = false,
}: {
	game: Game
	onOpen: (g: Game) => void
	i: number
	showDate?: boolean
}) {
	const map = useCatalog().maps[g.map.toLowerCase()]
	const tone = g.result === "D" ? "draw" : g.result === "W" ? "win" : "loss"

	return (
		<motion.li
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ ...spring, delay: Math.min(i % PAGE, 12) * 0.025 }}
		>
			<button
				onClick={() => onOpen(g)}
				className="pressable group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] bg-white/[0.03] py-3 pr-3 pl-4 text-left ring-1 ring-line transition-colors hover:bg-white/[0.055] sm:gap-5 sm:pr-4"
			>
				<div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30 transition-opacity duration-500 group-hover:opacity-45">
					<Img src={map?.listIcon} className="h-full w-full object-cover" />
					<div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0d] via-[#0b0b0d]/80 to-transparent" />
				</div>
				<span
					className={clsx(
						"absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full",
						tone === "win" ? "bg-win" : tone === "loss" ? "bg-loss" : "bg-draw",
					)}
				/>

				<div className="relative">
					<AgentIcon name={g.agent} size={46} />
					{g.d?.mvp === 1 && (
						<span
							className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-black ring-2 ring-bg"
							title="MVP de la partida"
						>
							<Trophy size={11} strokeWidth={2.5} />
						</span>
					)}
					{g.d?.mvp === 2 && (
						<span
							className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-fg-2 text-black ring-2 ring-bg"
							title="MVP del equipo"
						>
							<Medal size={11} strokeWidth={2.5} />
						</span>
					)}
				</div>

				<div className="relative min-w-0 flex-1 sm:w-[130px] sm:flex-none">
					<div className="truncate font-semibold tracking-[-0.01em]">
						{g.map}
					</div>
					<div className="truncate text-[12px] text-fg-3">
						{g.mode} ·{" "}
						{showDate ? shortDate(g.startedAt) : clockTime(g.startedAt)}
					</div>
				</div>

				<div className="relative w-[50px] shrink-0 sm:w-[84px]">
					<div
						className={clsx(
							"num text-[17px] font-semibold tracking-[-0.02em]",
							tone === "win"
								? "text-win"
								: tone === "loss"
									? "text-loss"
									: "text-fg-2",
						)}
					>
						{g.my}
						<span className="mx-0.5 text-fg-4">:</span>
						{g.their}
					</div>
					<div className="text-[11px] text-fg-3">
						{g.d?.durationMs ? duration(g.d.durationMs) : " "}
					</div>
				</div>

				<div className="relative w-[78px] shrink-0 whitespace-nowrap sm:w-[96px]">
					<div className="num text-[14px] font-semibold sm:text-[15px]">
						{g.kills}
						<span className="text-fg-4"> / </span>
						<span className="text-fg-2">{g.deaths}</span>
						<span className="text-fg-4"> / </span>
						{g.assists}
					</div>
					<div
						className={clsx(
							"num text-[11px]",
							kdOf(g) >= 1 ? "text-fg-2" : "text-fg-3",
						)}
					>
						{fixed(kdOf(g))} K/D
					</div>
				</div>

				<div className="relative hidden grid-cols-3 gap-5 md:grid">
					<Metric label="ACS" value={acsOf(g).toFixed(0)} />
					<Metric label="HS%" value={pct(hsOf(g))} />
					<Metric label="ADR" value={adrOf(g).toFixed(0)} />
				</div>

				<div className="relative flex shrink-0 items-center gap-3 sm:ml-auto">
					<span className="hidden sm:inline">
						<PerfBadge
							score={g.d?.perf?.score}
							grade={g.d?.perf?.grade}
							size="sm"
						/>
					</span>
					{g.rr !== undefined && (
						<span
							className={clsx(
								"num w-9 text-right text-[13px] font-semibold sm:w-12",
								g.rr >= 0 ? "text-win" : "text-loss",
							)}
						>
							{signed(g.rr)}
						</span>
					)}
					<ChevronRight
						size={16}
						className="hidden text-fg-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-fg-2 sm:block"
					/>
				</div>
			</button>
		</motion.li>
	)
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="w-11">
			<div className="num text-[14px] font-medium">{value}</div>
			<div className="text-[10px] tracking-wide text-fg-3 uppercase">
				{label}
			</div>
		</div>
	)
}
