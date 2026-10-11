import { useCallback, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"
import { useView } from "@/hooks/useView"
import { PlayerContext } from "@/hooks/usePlayer"
import { PlayerNav } from "@/components/PlayerNav"
import {
	Block,
	ErrorBox,
	GridSkeleton,
	OverviewSkeleton,
	TableSkeleton,
	TwoColumnSkeleton,
} from "@/components/ui/Skeleton"
import { CatalogProvider, Segmented, spring } from "@/components/ui/primitives"
import { Hero } from "@/components/player/Hero"
import { Overview } from "@/components/player/Overview"
import { Combat } from "@/components/player/Combat"
import { MatchList } from "@/components/player/MatchList"
import { MatchSheet } from "@/components/player/MatchSheet"
import { Agents, Maps, Seasons, Weapons } from "@/components/player/Breakdown"
import type { Catalog } from "@/interfaces/catalog"
import type {
	AgentsView,
	CombatView,
	GroupsView,
	OverviewView,
	Shell,
	SummaryView,
	WeaponsView,
} from "@/interfaces/views"
import type { Game } from "@/interfaces/game"
import type { Period } from "@/interfaces/stats"
import { PERIODS, queueOptions } from "@/lib/filters"
import type { TrackedPlayer } from "@/interfaces/players"

const TABS = [
	{ value: "overview", label: "Resumen" },
	{ value: "combat", label: "Combate" },
	{ value: "matches", label: "Partidas" },
	{ value: "agents", label: "Agentes" },
	{ value: "maps", label: "Mapas" },
	{ value: "weapons", label: "Armas" },
	{ value: "seasons", label: "Temporadas" },
] as const
type Tab = (typeof TABS)[number]["value"]

interface Props {
	slug: string
	players: TrackedPlayer[]
	data: Shell
	catalog: Catalog
	initialTab?: string
	initialMode?: string
	initialPeriod?: string
}

export default function PlayerApp(props: Props) {
	return (
		<PlayerContext.Provider value={props.slug}>
			<Dashboard {...props} />
		</PlayerContext.Provider>
	)
}

function Dashboard({
	slug,
	players,
	data,
	catalog,
	initialTab,
	initialMode,
	initialPeriod,
}: Props) {
	const [queue, setQueue] = useState(initialMode ?? "competitive")
	const [period, setPeriod] = useState<Period>(
		PERIODS.some((p) => p.value === initialPeriod)
			? (initialPeriod as Period)
			: "all",
	)
	const [tab, setTabState] = useState<Tab>(
		TABS.some((t) => t.value === initialTab) ? (initialTab as Tab) : "overview",
	)
	const [open, setOpen] = useState<Game | null>(null)

	const syncUrl = (key: string, value: string, fallback: string) => {
		const url = new URL(location.href)
		value === fallback
			? url.searchParams.delete(key)
			: url.searchParams.set(key, value)
		history.replaceState(history.state, "", url)
	}

	const setTab = (t: string) => {
		setTabState(t as Tab)
		syncUrl("tab", t, "overview")
		const rail = document.getElementById("tabs")
		if (rail)
			window.scrollTo({
				top: Math.min(window.scrollY, rail.offsetTop - 80),
				behavior: "smooth",
			})
	}

	const queues = useMemo(() => queueOptions(data.queues), [data.queues])

	const filters = useMemo(() => ({ mode: queue, period }), [queue, period])
	const summary = useView<SummaryView>("summary", filters).data?.summary
	const close = useCallback(() => setOpen(null), [])

	return (
		<CatalogProvider value={catalog}>
			<main className="mx-auto max-w-[1240px] px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
				<PlayerNav players={players} current={slug} />
				<Hero profile={data.profile} summary={summary} sync={data.sync} />

				<div
					id="tabs"
					className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 mt-6 mb-3 px-4 py-2.5 sm:-mx-6 sm:px-6"
				>
					<div className="pointer-events-none absolute inset-0 bg-bg/85 backdrop-blur-xl" />
					<div className="relative -mx-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
						<Segmented
							value={tab}
							onChange={setTab}
							options={TABS.map((t) => ({ ...t }))}
						/>
					</div>
				</div>

				<div className="mb-5 flex flex-wrap items-center gap-2">
					<div className="max-w-full overflow-x-auto [scrollbar-width:none]">
						<Segmented
							size="sm"
							value={queue}
							onChange={(q) => {
								setQueue(q)
								syncUrl("mode", q, "competitive")
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
								syncUrl("period", p, "all")
							}}
							options={PERIODS}
						/>
					</div>
					<span className="num ml-auto text-[12px] text-fg-3">
						{summary ? (
							<>
								{summary.games} {summary.games === 1 ? "partida" : "partidas"}
								{summary.detailed < summary.games &&
									` · ${summary.detailed} con detalle`}
							</>
						) : (
							<Block className="h-3 w-28" />
						)}
					</span>
				</div>

				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={tab + queue + period}
						initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
						transition={{ ...spring, duration: 0.35 }}
					>
						{tab === "overview" && (
							<Loaded<OverviewView>
								view="overview"
								params={filters}
								skeleton={<OverviewSkeleton />}
								ready={!!summary}
							>
								{(v) => (
									<Overview
										summary={summary!}
										view={v}
										onOpen={setOpen}
										onTab={setTab}
									/>
								)}
							</Loaded>
						)}
						{tab === "combat" && (
							<Loaded<CombatView>
								view="combat"
								params={filters}
								skeleton={<OverviewSkeleton />}
								ready={!!summary}
							>
								{(v) => <Combat summary={summary!} view={v} />}
							</Loaded>
						)}
						{tab === "matches" && (
							<MatchList filters={filters} onOpen={setOpen} />
						)}
						{tab === "agents" && (
							<Loaded<AgentsView>
								view="agents"
								params={filters}
								skeleton={<TableSkeleton />}
							>
								{(v) => <Agents view={v} />}
							</Loaded>
						)}
						{tab === "maps" && (
							<Loaded<GroupsView>
								view="maps"
								params={filters}
								skeleton={<GridSkeleton />}
							>
								{(v) => <Maps view={v} filters={filters} />}
							</Loaded>
						)}
						{tab === "weapons" && (
							<Loaded<WeaponsView>
								view="weapons"
								params={filters}
								skeleton={<TwoColumnSkeleton />}
							>
								{(v) => <Weapons view={v} />}
							</Loaded>
						)}
						{tab === "seasons" && (
							<Loaded<GroupsView>
								view="seasons"
								params={{}}
								skeleton={<GridSkeleton />}
							>
								{(v) => <Seasons profile={data.profile} view={v} />}
							</Loaded>
						)}
					</motion.div>
				</AnimatePresence>
			</main>

			<MatchSheet game={open} puuid={data.profile.puuid} onClose={close} />
		</CatalogProvider>
	)
}

function Loaded<T>({
	view,
	params,
	skeleton,
	ready = true,
	children,
}: {
	view: string
	params: Record<string, string>
	skeleton: ReactNode
	ready?: boolean
	children: (data: T) => ReactNode
}) {
	const { data, error } = useView<T>(view, params)
	if (error) return <ErrorBox message={error} />
	if (!data || !ready) return <>{skeleton}</>
	return <>{children(data)}</>
}
