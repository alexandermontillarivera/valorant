import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { ChevronRight, Medal, Trophy } from "lucide-react"
import clsx from "clsx"
import { acsOf, adrOf, hsOf, kdOf, summarize } from "@/lib/stats"
import { clockTime, dayLabel, duration, fixed, pct, signed } from "@/lib/format"
import { AgentIcon, Img, spring, useCatalog } from "@/components/ui/primitives"
import { PerfBadge } from "@/components/ui/perf"
import type { Game } from "@/interfaces/game"

const PAGE = 30

export function MatchList({
	games,
	onOpen,
}: {
	games: Game[]
	onOpen: (g: Game) => void
}) {
	const [shown, setShown] = useState(PAGE)

	const groups = useMemo(() => {
		const out: { day: string; games: Game[] }[] = []
		for (const g of games.slice(0, shown)) {
			const day = dayLabel(g.startedAt)
			if (out.at(-1)?.day === day) out.at(-1)!.games.push(g)
			else out.push({ day, games: [g] })
		}
		return out
	}, [games, shown])

	if (!games.length)
		return (
			<div className="panel py-24 text-center text-fg-3">
				No hay partidas con estos filtros.
			</div>
		)

	let index = 0
	return (
		<div className="grid grid-cols-[minmax(0,1fr)] gap-6">
			{groups.map((group) => {
				const s = summarize(group.games)
				return (
					<section key={group.day}>
						<header className="mb-2 flex items-baseline justify-between px-1">
							<h3 className="text-[13px] font-semibold first-letter:uppercase">
								{group.day}
							</h3>
							<span className="num text-[12px] text-fg-3">
								{s.wins}V {s.losses}D · {fixed(s.kd)} K/D · {s.acs.toFixed(0)}{" "}
								ACS{s.perfN ? ` · ${s.perf.toFixed(0)} PS` : ""}
							</span>
						</header>
						<ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
							{group.games.map((g) => (
								<MatchRow key={g.id} game={g} onOpen={onOpen} i={index++} />
							))}
						</ul>
					</section>
				)
			})}
			{shown < games.length && (
				<button
					onClick={() => setShown((n) => n + PAGE)}
					className="pressable mx-auto rounded-full bg-white/[0.05] px-5 py-2.5 text-[13px] font-medium text-fg-2 ring-1 ring-line hover:bg-white/[0.08] hover:text-fg"
				>
					Cargar más · quedan {games.length - shown}
				</button>
			)}
		</div>
	)
}

function MatchRow({
	game: g,
	onOpen,
	i,
}: {
	game: Game
	onOpen: (g: Game) => void
	i: number
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
						{g.mode} · {clockTime(g.startedAt)}
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
