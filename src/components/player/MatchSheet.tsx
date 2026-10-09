import { useEffect, useMemo, useState } from "react"
import {
	AnimatePresence,
	motion,
	useDragControls,
	useReducedMotion,
	type PanInfo,
} from "motion/react"
import {
	Bomb,
	Clock3,
	Skull,
	Wrench,
	X,
	Flag,
	Medal,
	Trophy,
} from "lucide-react"
import clsx from "clsx"
import { lineFor, perfCategories } from "@/lib/stats"
import { roundSides } from "@/lib/sides"
import { weaponKey } from "@/lib/weapons"
import {
	PerfBadge,
	RatingArrow,
	gradeOf,
	perfColor,
} from "@/components/ui/perf"
import { clockTime, dayLabel, duration, fixed, pct, signed } from "@/lib/format"
import {
	AgentIcon,
	Img,
	RankIcon,
	Segmented,
	spring,
	useCatalog,
	useWeaponInfo,
} from "@/components/ui/primitives"
import type { Game } from "@/interfaces/game"
import type { KillEvent, Match, PlayerLine } from "@/interfaces/match"
import type { TeamId } from "@/interfaces/player"
import type { Line } from "@/interfaces/stats"

const ALLY = "var(--color-info)"
const ENEMY = "var(--color-accent)"

const project = (v: number, d = 0.998) => ((v / 1000) * d) / (1 - d)

export function MatchSheet({
	game,
	puuid,
	onClose,
}: {
	game: Game | null
	puuid: string
	onClose: () => void
}) {
	const controls = useDragControls()
	const reduce = useReducedMotion()
	const [match, setMatch] = useState<Match | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!game) return
		let alive = true
		setMatch(null)
		setError(null)
		fetch(`/api/match/${encodeURIComponent(game.id)}`)
			.then(async (res) => {
				const json = await res.json()
				if (!alive) return
				if (res.ok) setMatch(json)
				else setError(json.message ?? "No disponible")
			})
			.catch(() => alive && setError("No se pudo cargar la partida"))
		return () => {
			alive = false
		}
	}, [game])

	useEffect(() => {
		if (!game) return
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
		window.addEventListener("keydown", onKey)
		const prev = document.body.style.overflow
		document.body.style.overflow = "hidden"
		return () => {
			window.removeEventListener("keydown", onKey)
			document.body.style.overflow = prev
		}
	}, [game, onClose])

	const onDragEnd = (_: unknown, info: PanInfo) => {
		if (info.offset.y + project(info.velocity.y) > 220) onClose()
	}

	return (
		<AnimatePresence>
			{game && (
				<div
					className="fixed inset-0 z-50"
					role="dialog"
					aria-modal="true"
					aria-label={`Partida en ${game.map}`}
				>
					<motion.div
						className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						onClick={onClose}
					/>
					<motion.div
						className="absolute inset-x-0 bottom-0 mx-auto flex h-[94dvh] max-w-[1180px] flex-col overflow-hidden rounded-t-[30px] bg-elevated shadow-[0_-20px_80px_rgba(0,0,0,0.6)] ring-1 ring-line-strong"
						initial={reduce ? { opacity: 0 } : { y: "100%" }}
						animate={reduce ? { opacity: 1 } : { y: 0 }}
						exit={reduce ? { opacity: 0 } : { y: "100%" }}
						transition={{ type: "spring", bounce: 0, duration: 0.5 }}
						drag={reduce ? false : "y"}
						dragControls={controls}
						dragListener={false}
						dragConstraints={{ top: 0, bottom: 0 }}
						dragElastic={{ top: 0.04, bottom: 0.9 }}
						onDragEnd={onDragEnd}
					>
						<div
							className="absolute inset-x-0 top-0 z-20 flex h-6 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing"
							onPointerDown={(e) => controls.start(e)}
						>
							<span className="h-1.5 w-10 rounded-full bg-white/25" />
						</div>
						<button
							onClick={onClose}
							aria-label="Cerrar"
							className="glass pressable absolute top-4 right-4 z-20 grid h-9 w-9 place-items-center rounded-full text-fg-2 ring-1 ring-line-strong hover:text-fg"
						>
							<X size={16} />
						</button>
						<div className="flex-1 overflow-y-auto overscroll-contain">
							{match ? (
								<SheetBody
									match={match}
									puuid={puuid}
									rr={game.rr}
									onHeaderPointerDown={(e) => controls.start(e)}
								/>
							) : (
								<Pending
									game={game}
									error={error}
									onHeaderPointerDown={(e) => controls.start(e)}
								/>
							)}
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}

function Pending({
	game: g,
	error,
	onHeaderPointerDown,
}: {
	game: Game
	error: string | null
	onHeaderPointerDown: (e: React.PointerEvent) => void
}) {
	const catalog = useCatalog()
	const tone =
		g.result === "D" ? "Empate" : g.result === "W" ? "Victoria" : "Derrota"
	const rounds = Math.max(1, g.my + g.their)
	return (
		<div>
			<header
				className="relative touch-none overflow-hidden select-none"
				onPointerDown={onHeaderPointerDown}
			>
				<Img
					src={catalog.maps[g.map.toLowerCase()]?.splash}
					className="absolute inset-0 h-full w-full object-cover opacity-50"
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-elevated/30 via-elevated/70 to-elevated" />
				<div className="relative flex flex-col gap-6 px-6 pt-12 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-10">
					<div>
						<div className="eyebrow">
							{g.mode} · {dayLabel(g.startedAt)} · {clockTime(g.startedAt)}
						</div>
						<h2 className="display mt-1 text-[44px] font-semibold sm:text-[56px]">
							{g.map}
						</h2>
					</div>
					<div className="text-right">
						<div
							className={clsx(
								"text-[13px] font-semibold tracking-wide uppercase",
								g.result === "D"
									? "text-fg-2"
									: g.result === "W"
										? "text-win"
										: "text-loss",
							)}
						>
							{tone}
						</div>
						<div className="num display text-[52px] font-semibold">
							<span style={{ color: ALLY }}>{g.my}</span>
							<span className="mx-2 text-fg-4">:</span>
							<span style={{ color: ENEMY }}>{g.their}</span>
						</div>
					</div>
				</div>
			</header>
			<div className="grid gap-4 px-4 pb-12 sm:px-10">
				<div className="panel flex flex-wrap items-center gap-x-8 gap-y-4 p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<AgentIcon name={g.agent} size={48} />
						<div className="font-semibold">{g.agent}</div>
					</div>
					{[
						["K / D / A", `${g.kills} / ${g.deaths} / ${g.assists}`],
						["ACS", (g.score / rounds).toFixed(0)],
						["ADR", (g.dealt / rounds).toFixed(0)],
						["HS%", pct(g.head / Math.max(1, g.head + g.body + g.leg))],
					].map(([k, v]) => (
						<div key={k}>
							<div className="eyebrow">{k}</div>
							<div className="num text-[18px] font-semibold tracking-[-0.02em]">
								{v}
							</div>
						</div>
					))}
				</div>
				{error ? (
					<p className="panel py-10 text-center text-fg-3">{error}</p>
				) : (
					<div className="grid gap-3">
						<div className="skeleton h-24 rounded-[22px]" />
						<div className="skeleton h-72 rounded-[22px]" />
					</div>
				)}
			</div>
		</div>
	)
}

function SheetBody({
	match: m,
	puuid,
	rr,
	onHeaderPointerDown,
}: {
	match: Match
	puuid: string
	rr?: number
	onHeaderPointerDown: (e: React.PointerEvent) => void
}) {
	const catalog = useCatalog()
	const mePlayer = m.players.find((p) => p.puuid === puuid) ?? m.players[0]
	const me = lineFor(m, mePlayer)
	const enemy: TeamId = me.team === "Red" ? "Blue" : "Red"
	const o = {
		team: me.team,
		my: m.teams[me.team].rounds,
		their: m.teams[enemy].rounds,
		won: m.teams[me.team].won,
		draw: m.teams[me.team].rounds === m.teams[enemy].rounds,
	}
	const [round, setRound] = useState<number | null>(null)
	const [view, setView] = useState<"board" | "duels">("board")

	const teams = useMemo(() => {
		const lines = m.players
			.map((p) => lineFor(m, p))
			.sort((a, b) => b.score - a.score)
		return {
			ally: lines.filter((l) => l.team === o.team),
			enemy: lines.filter((l) => l.team === enemy),
		}
	}, [m, o.team, enemy])

	const byPuuid = useMemo(
		() => new Map(m.players.map((p) => [p.puuid, p])),
		[m],
	)
	const tone = o.draw ? "Empate" : o.won ? "Victoria" : "Derrota"

	return (
		<div>
			<header
				className="relative overflow-hidden touch-none select-none"
				onPointerDown={onHeaderPointerDown}
			>
				<Img
					src={catalog.maps[m.map.toLowerCase()]?.splash}
					className="absolute inset-0 h-full w-full object-cover opacity-50"
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-elevated/30 via-elevated/70 to-elevated" />
				<div className="relative flex flex-col gap-6 px-6 pt-12 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-10">
					<div>
						<div className="eyebrow">
							{m.mode} · {dayLabel(m.startedAt)} · {clockTime(m.startedAt)} ·{" "}
							{duration(m.durationMs)}
						</div>
						<h2 className="display mt-1 text-[44px] font-semibold sm:text-[56px]">
							{m.map}
						</h2>
					</div>
					<div className="flex items-end gap-6">
						<div className="text-right">
							<div
								className={clsx(
									"text-[13px] font-semibold tracking-wide uppercase",
									o.draw ? "text-fg-2" : o.won ? "text-win" : "text-loss",
								)}
							>
								{tone}
							</div>
							<div className="num display text-[52px] font-semibold">
								<span style={{ color: ALLY }}>{o.my}</span>
								<span className="mx-2 text-fg-4">:</span>
								<span style={{ color: ENEMY }}>{o.their}</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className="grid grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-12 sm:px-10">
				<div className="panel flex flex-wrap items-center gap-x-8 gap-y-4 p-4 sm:p-5">
					<div className="flex items-center gap-3">
						<AgentIcon name={me.agent} size={48} />
						<div>
							<div className="font-semibold">{me.agent}</div>
							<div className="text-[12px] text-fg-3">
								{m.mvp === puuid
									? "MVP de la partida"
									: m.teamMvp[me.team] === puuid
										? "MVP del equipo"
										: `#${me.placement} en la partida`}
							</div>
						</div>
					</div>
					{me.perf && (
						<div>
							<div className="eyebrow">Perf. Score</div>
							<PerfBadge
								score={me.perf.score}
								grade={me.perf.grade}
								size="md"
								className="mt-0.5"
							/>
						</div>
					)}
					{[
						["K / D / A", `${me.kills} / ${me.deaths} / ${me.assists}`],
						["K/D", fixed(me.kd)],
						["ACS", me.acs.toFixed(0)],
						["ADR", me.adr.toFixed(0)],
						["HS%", pct(me.hs)],
						["KAST", pct(me.kast)],
						["FK / FD", `${me.firstKills} / ${me.firstDeaths}`],
						...(rr !== undefined ? [["RR", signed(rr)]] : []),
					].map(([k, v]) => (
						<div key={k}>
							<div className="eyebrow">{k}</div>
							<div
								className={clsx(
									"num text-[18px] font-semibold tracking-[-0.02em]",
									k === "RR" && (rr! >= 0 ? "text-win" : "text-loss"),
								)}
							>
								{v}
							</div>
						</div>
					))}
				</div>

				{me.perf && <PerfPanel line={me} />}

				{m.rounds.length > 0 && (
					<section>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-[13px] font-semibold text-fg-2">Rondas</h3>
							<span className="text-[12px] text-fg-3">
								{round === null
									? "Toca una ronda para ver el kill feed"
									: `Ronda ${round + 1}`}
							</span>
						</div>
						<RoundTimeline
							match={m}
							team={o.team}
							selected={round}
							onSelect={(r) => setRound(r === round ? null : r)}
						/>
						<AnimatePresence mode="wait" initial={false}>
							{round !== null && (
								<motion.div
									key={round}
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={spring}
									className="overflow-hidden"
								>
									<KillFeed
										kills={m.kills.filter((k) => k.round === round)}
										byPuuid={byPuuid}
										ally={o.team}
										you={puuid}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</section>
				)}

				<section>
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-[13px] font-semibold text-fg-2">
							{view === "board" ? "Marcador" : "Duelos contra el equipo rival"}
						</h3>
						{m.kills.length > 0 && (
							<Segmented
								size="sm"
								value={view}
								onChange={setView}
								options={[
									{ value: "board", label: "Marcador" },
									{ value: "duels", label: "Duelos" },
								]}
							/>
						)}
					</div>
					{view === "board" ? (
						<div className="grid grid-cols-[minmax(0,1fr)] gap-4">
							<Scoreboard
								lines={teams.ally}
								color={ALLY}
								label="Tu equipo"
								score={o.my}
								you={puuid}
								mvp={m.mvp}
								teamMvp={m.teamMvp[o.team]}
							/>
							<Scoreboard
								lines={teams.enemy}
								color={ENEMY}
								label="Rival"
								score={o.their}
								you={puuid}
								mvp={m.mvp}
								teamMvp={m.teamMvp[enemy]}
							/>
						</div>
					) : (
						<Duels match={m} you={puuid} enemies={teams.enemy} />
					)}
				</section>
			</div>
		</div>
	)
}

const RESULT_ICON: Record<string, typeof Skull> = {
	Elimination: Skull,
	"Bomb detonated": Bomb,
	Detonate: Bomb,
	"Bomb defused": Wrench,
	Defuse: Wrench,
	"Round timer expired": Clock3,
	Timer: Clock3,
	Surrendered: Flag,
	Surrender: Flag,
}

function RoundTimeline({
	match: m,
	team,
	selected,
	onSelect,
}: {
	match: Match
	team: TeamId
	selected: number | null
	onSelect: (r: number) => void
}) {
	const sides = roundSides(m)
	return (
		<div className="overflow-x-auto pb-1">
			<div className="flex min-w-max gap-[3px]">
				{m.rounds.map((r, i) => {
					const won = r.winner === team
					const Icon = RESULT_ICON[r.result] ?? Skull
					const side = sides.attackers[i] === team ? "atk" : "def"
					return (
						<div
							key={i}
							className={clsx("flex", i > 0 && sides.pistol.has(i) && "ml-3")}
						>
							<button
								onClick={() => onSelect(i)}
								title={`Ronda ${i + 1} · ${side === "atk" ? "Ataque" : "Defensa"} · ${r.result}`}
								className={clsx(
									"pressable flex w-8 flex-col items-center gap-[3px] rounded-[10px] py-1 transition-colors",
									selected === i
										? "bg-white/[0.1] ring-1 ring-white/20"
										: "hover:bg-white/[0.05]",
								)}
							>
								<span
									className={clsx(
										"grid h-7 w-7 place-items-center rounded-[8px]",
										won
											? "bg-info/15 text-info"
											: "bg-white/[0.03] text-transparent",
									)}
								>
									<Icon size={13} />
								</span>
								<span
									className={clsx(
										"grid h-7 w-7 place-items-center rounded-[8px]",
										!won
											? "bg-accent/15 text-accent"
											: "bg-white/[0.03] text-transparent",
									)}
								>
									<Icon size={13} />
								</span>
								<span className="num text-[10px] text-fg-4">{i + 1}</span>
							</button>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function KillFeed({
	kills,
	byPuuid,
	ally,
	you,
}: {
	kills: KillEvent[]
	byPuuid: Map<string, PlayerLine>
	ally: TeamId
	you: string
}) {
	const weaponInfo = useWeaponInfo()
	if (!kills.length)
		return (
			<p className="py-4 text-center text-fg-3">
				Sin kills registradas en esta ronda.
			</p>
		)
	return (
		<ul className="mt-3 grid gap-1.5">
			{[...kills]
				.sort((a, b) => a.timeMs - b.timeMs)
				.map((k, i) => {
					const killer = byPuuid.get(k.killer)
					const victim = byPuuid.get(k.victim)
					const weapon = weaponInfo(
						weaponKey(k.weaponId, k.weapon, k.weaponType, killer?.agent),
					)
					return (
						<motion.li
							key={i}
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ ...spring, delay: i * 0.03 }}
							className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2 ring-1 ring-line"
						>
							<span className="num w-10 text-[12px] text-fg-3">
								{duration(k.timeMs)}
							</span>
							<Who p={killer} ally={ally} you={you} />
							<span className="flex h-6 min-w-16 items-center justify-center px-2">
								{!weapon.hidden && (
									<span title={weapon.name} className="flex items-center">
										<Img
											src={weapon.icon}
											alt={weapon.name}
											className={
												weapon.ability
													? "h-5 w-5 object-contain opacity-90"
													: "h-4 w-auto max-w-20 object-contain opacity-80"
											}
											fallback={
												<span className="text-[11px] text-fg-3">
													{weapon.name}
												</span>
											}
										/>
									</span>
								)}
							</span>
							<Who p={victim} ally={ally} you={you} dim />
						</motion.li>
					)
				})}
		</ul>
	)
}

function Who({
	p,
	ally,
	you,
	dim,
}: {
	p?: PlayerLine
	ally: TeamId
	you: string
	dim?: boolean
}) {
	if (!p) return <span className="text-fg-3">?</span>
	return (
		<span
			className={clsx(
				"flex w-36 min-w-0 items-center gap-2 sm:w-44",
				dim && "opacity-70",
			)}
		>
			<AgentIcon name={p.agent} size={24} />
			<span
				className={clsx(
					"truncate text-[13px]",
					p.puuid === you && "font-semibold",
				)}
				style={{ color: p.team === ally ? ALLY : ENEMY }}
			>
				{p.name}
			</span>
		</span>
	)
}

function Scoreboard({
	lines,
	color,
	label,
	score,
	you,
	mvp,
	teamMvp,
}: {
	lines: Line[]
	color: string
	label: string
	score: number
	you: string
	mvp: string | null
	teamMvp?: string
}) {
	const parties = new Map<string, number>()
	for (const l of lines)
		parties.set(l.partyId, (parties.get(l.partyId) ?? 0) + 1)
	const partyIds = [...parties.entries()]
		.filter(([, n]) => n > 1)
		.map(([id]) => id)

	const hasPerf = lines.some((l) => l.perf)
	const cols = [
		...(hasPerf ? ["PS"] : []),
		"ACS",
		"K",
		"D",
		"A",
		"+/−",
		"K/D",
		"ADR",
		"HS%",
		"KAST",
		"FK",
		"FD",
		"3K+",
	]
	return (
		<div className="panel overflow-hidden p-0">
			<div
				className="flex items-center justify-between px-4 py-3"
				style={{ boxShadow: `inset 3px 0 0 ${color}` }}
			>
				<span className="text-[13px] font-semibold" style={{ color }}>
					{label}
				</span>
				<span className="num text-[13px] text-fg-3">{score} rondas</span>
			</div>
			<div className="overflow-x-auto">
				<table className="num w-full min-w-[920px] table-fixed text-[13px]">
					<thead>
						<tr className="text-[10px] tracking-wider text-fg-3 uppercase">
							<th className="w-[34%] px-4 py-2 text-left font-medium">
								Jugador
							</th>
							{cols.map((c) => (
								<th key={c} className="px-2 py-2 text-right font-medium">
									{c}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{lines.map((l) => {
							const diff = l.kills - l.deaths
							const party = partyIds.indexOf(l.partyId)
							return (
								<tr
									key={l.puuid}
									className={clsx(
										"border-t border-line transition-colors hover:bg-white/[0.03]",
										l.puuid === you && "bg-white/[0.05]",
									)}
								>
									<td className="px-4 py-2.5">
										<div className="flex items-center gap-3">
											<AgentIcon name={l.agent} size={32} />
											<RankIcon tier={l.tier} size={22} />
											<span className="min-w-0 truncate font-sans">
												<span
													className={clsx(l.puuid === you && "font-semibold")}
												>
													{l.name}
												</span>
												<span className="text-fg-3">#{l.tag}</span>
											</span>
											{party >= 0 && (
												<span
													className="h-1.5 w-1.5 shrink-0 rounded-full"
													style={{
														background: ["#ffd60a", "#bf5af2", "#64d2ff"][
															party % 3
														],
													}}
													title="En grupo"
												/>
											)}
											{l.puuid === mvp ? (
												<span className="inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 text-[10px] font-semibold text-gold">
													<Trophy size={9} /> MVP
												</span>
											) : (
												l.puuid === teamMvp && (
													<span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-fg-2">
														<Medal size={9} /> MVP
													</span>
												)
											)}
										</div>
									</td>
									{hasPerf && (
										<td className="px-2 text-right">
											<span
												className="font-semibold"
												style={{
													color: l.perf ? perfColor(l.perf.score) : undefined,
												}}
											>
												{l.perf?.score ?? "—"}
											</span>
										</td>
									)}
									<td className="px-2 text-right font-semibold">
										{l.acs.toFixed(0)}
									</td>
									<td className="px-2 text-right">{l.kills}</td>
									<td className="px-2 text-right text-fg-2">{l.deaths}</td>
									<td className="px-2 text-right text-fg-2">{l.assists}</td>
									<td
										className={clsx(
											"px-2 text-right",
											diff > 0
												? "text-win"
												: diff < 0
													? "text-loss"
													: "text-fg-3",
										)}
									>
										{signed(diff)}
									</td>
									<td className="px-2 text-right">{fixed(l.kd)}</td>
									<td className="px-2 text-right">{l.adr.toFixed(0)}</td>
									<td className="px-2 text-right">{pct(l.hs)}</td>
									<td className="px-2 text-right">{pct(l.kast)}</td>
									<td className="px-2 text-right">{l.firstKills}</td>
									<td className="px-2 text-right text-fg-2">{l.firstDeaths}</td>
									<td className="px-4 text-right">{l.multiKills}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function Duels({
	match: m,
	you,
	enemies,
}: {
	match: Match
	you: string
	enemies: Line[]
}) {
	const rows = enemies.map((e) => ({
		e,
		kills: m.kills.filter((k) => k.killer === you && k.victim === e.puuid)
			.length,
		deaths: m.kills.filter((k) => k.killer === e.puuid && k.victim === you)
			.length,
	}))
	const max = Math.max(1, ...rows.map((r) => Math.max(r.kills, r.deaths)))
	return (
		<div className="panel grid gap-3 p-5">
			{rows.map(({ e, kills, deaths }, i) => (
				<div
					key={e.puuid}
					className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"
				>
					<div className="flex items-center justify-end gap-3">
						<span className="num text-[15px] font-semibold text-info">
							{kills}
						</span>
						<div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/[0.05]">
							<motion.div
								className="ml-auto h-full rounded-full bg-info"
								style={{ transformOrigin: "right" }}
								initial={{ scaleX: 0 }}
								animate={{ scaleX: kills / max }}
								transition={{ ...spring, delay: i * 0.04 }}
							/>
						</div>
					</div>
					<div className="flex w-44 items-center gap-2.5">
						<AgentIcon name={e.agent} size={30} />
						<span className="truncate text-[13px]">{e.name}</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/[0.05]">
							<motion.div
								className="h-full rounded-full bg-accent"
								style={{ transformOrigin: "left" }}
								initial={{ scaleX: 0 }}
								animate={{ scaleX: deaths / max }}
								transition={{ ...spring, delay: i * 0.04 }}
							/>
						</div>
						<span className="num text-[15px] font-semibold text-accent">
							{deaths}
						</span>
					</div>
				</div>
			))}
			<div className="mt-1 grid grid-cols-[1fr_auto_1fr] text-[11px] text-fg-3">
				<span className="text-right">Les mataste</span>
				<span className="w-44" />
				<span>Te mataron</span>
			</div>
		</div>
	)
}

function PerfPanel({ line }: { line: Line }) {
	const perf = line.perf!
	const grade = gradeOf(perf.grade)
	return (
		<section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr]">
			<div>
				<div className="eyebrow">Tu Performance Score</div>
				<div
					className="num mt-1 text-[48px] leading-none font-semibold tracking-[-0.04em]"
					style={{ color: perfColor(perf.score) }}
				>
					{perf.score}
				</div>
				<div
					className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium"
					style={{ color: grade.color, background: `${grade.color}1a` }}
				>
					{grade.label}
				</div>
			</div>
			<ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
				{perfCategories([perf.breakdown]).map((c) => {
					const v = perf.breakdown[c.key]
					return (
						<li
							key={c.key}
							className="flex items-center justify-between gap-3 border-b border-line pb-2 text-[13px]"
						>
							<span className="text-fg-2">{c.label}</span>
							<span className="flex items-center gap-2">
								<span className="num font-medium">
									{v === undefined
										? "—"
										: c.key === "damage"
											? v.toFixed(0)
											: fixed(v)}
								</span>
								<RatingArrow rating={perf.ratings[c.rating]} />
							</span>
						</li>
					)
				})}
			</ul>
		</section>
	)
}
