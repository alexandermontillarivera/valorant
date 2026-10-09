import { useCallback, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"
import { filterGames, summarize } from "@/lib/stats"
import { CatalogProvider, Segmented, spring } from "@/components/ui/primitives"
import { Hero } from "@/components/player/Hero"
import { Overview } from "@/components/player/Overview"
import { Combat } from "@/components/player/Combat"
import { MatchList } from "@/components/player/MatchList"
import { MatchSheet } from "@/components/player/MatchSheet"
import { Agents, Maps, Seasons, Weapons } from "@/components/player/Breakdown"
import type { Catalog } from "@/interfaces/catalog"
import type { Dashboard } from "@/interfaces/dashboard"
import type { Game } from "@/interfaces/game"
import type { Period } from "@/interfaces/stats"

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

const QUEUE_LABELS: Record<string, string> = {
	competitive: "Competitivo",
	unrated: "No clasif.",
	swiftplay: "Swiftplay",
	premier: "Premier",
	spikerush: "Spike Rush",
	deathmatch: "Deathmatch",
	teamdeathmatch: "TDM",
	escalation: "Escalation",
	allrandomonesite: "ARAO",
	knockout: "Knockout",
	custom: "Personalizada",
	unknown: "Otros",
	all: "Todo",
}

const PERIODS: { value: Period; label: string }[] = [
	{ value: "all", label: "Todo" },
	{ value: "act", label: "Acto actual" },
	{ value: "50", label: "Últimas 50" },
	{ value: "20", label: "Últimas 20" },
]

interface Props {
	data: Dashboard
	catalog: Catalog
	initialTab?: string
	initialMode?: string
	initialPeriod?: string
}

export default function PlayerApp({
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

	const queues = useMemo(() => {
		const counts = new Map<string, number>()
		for (const g of data.games)
			counts.set(g.queue, (counts.get(g.queue) ?? 0) + 1)
		const modeName = new Map(data.games.map((g) => [g.queue, g.mode]))
		const order = Object.keys(QUEUE_LABELS)
		const present = [...counts.keys()].sort(
			(a, b) =>
				(order.indexOf(a) + 1 || order.length + 1) -
					(order.indexOf(b) + 1 || order.length + 1) ||
				counts.get(b)! - counts.get(a)!,
		)
		return [...present, "all"].map((q) => ({
			value: q,
			label: QUEUE_LABELS[q] ?? modeName.get(q) ?? q,
		}))
	}, [data.games])

	const games = useMemo(
		() => filterGames(data.games, queue, period),
		[data.games, queue, period],
	)
	const summary = useMemo(() => summarize(games), [games])
	const close = useCallback(() => setOpen(null), [])

	return (
		<CatalogProvider value={catalog}>
			<main className="mx-auto max-w-[1240px] px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
				<Hero profile={data.profile} summary={summary} sync={data.sync} />

				<div
					id="tabs"
					className="sticky top-[env(safe-area-inset-top,0px)] z-20 -mx-4 mt-6 mb-3 px-4 py-2.5 sm:-mx-6 sm:px-6"
				>
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-bg/90 to-transparent" />
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
						{games.length} partidas
						{summary.detailed < games.length &&
							` · ${summary.detailed} con detalle`}
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
							<Overview
								games={games}
								summary={summary}
								rrHistory={data.rrHistory}
								onOpen={setOpen}
								onTab={setTab}
							/>
						)}
						{tab === "combat" && <Combat games={games} summary={summary} />}
						{tab === "matches" && <MatchList games={games} onOpen={setOpen} />}
						{tab === "agents" && <Agents games={games} />}
						{tab === "maps" && <Maps games={games} />}
						{tab === "weapons" && <Weapons games={games} />}
						{tab === "seasons" && (
							<Seasons
								profile={data.profile}
								games={data.games.filter((g) => g.queue === "competitive")}
							/>
						)}
					</motion.div>
				</AnimatePresence>
			</main>

			<MatchSheet game={open} puuid={data.profile.puuid} onClose={close} />
		</CatalogProvider>
	)
}
