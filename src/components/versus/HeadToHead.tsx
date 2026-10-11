import { motion } from "motion/react"
import { Handshake, Swords } from "lucide-react"
import clsx from "clsx"
import { acsOf } from "@/lib/stats"
import { fixed, pct, shortDate } from "@/lib/format"
import { AgentIcon, Panel, spring } from "@/components/ui/primitives"
import { COLOR_A, COLOR_B } from "@/components/versus/metrics"
import type { Game } from "@/interfaces/game"
import type { Summary } from "@/interfaces/stats"
import type { Pairing, SharedGame, VersusView } from "@/interfaces/versus"

export function HeadToHead({ view }: { view: VersusView }) {
	const { a, b, together, against } = view
	return (
		<div className="grid gap-3 sm:gap-4 md:grid-cols-2">
			<Panel
				title={
					<span className="inline-flex items-center gap-1.5">
						<Handshake size={14} /> Juntos
					</span>
				}
				action={<Count n={together.games} />}
			>
				{together.games ? (
					<>
						<div className="flex items-end justify-between gap-4">
							<div>
								<div className="num text-[34px] leading-none font-semibold tracking-[-0.03em]">
									<span className="text-win">{together.a.wins}</span>
									<span className="text-fg-4"> – </span>
									<span className="text-loss">{together.a.losses}</span>
								</div>
								<div className="mt-1.5 text-[12px] text-fg-3">
									{pct(together.a.winRate)} de victorias en equipo
								</div>
							</div>
							<Carry
								pairing={together}
								names={[a.profile.name, b.profile.name]}
							/>
						</div>
						<Duel pairing={together} />
						<Recent games={together.recent} mode="together" />
					</>
				) : (
					<Nothing text="Todavía no hay partidas juntos con estos filtros." />
				)}
			</Panel>

			<Panel
				title={
					<span className="inline-flex items-center gap-1.5">
						<Swords size={14} /> Enfrentados
					</span>
				}
				action={<Count n={against.games} />}
			>
				{against.games ? (
					<>
						<div className="flex items-end justify-between gap-4">
							<div className="num text-[34px] leading-none font-semibold tracking-[-0.03em]">
								<span style={{ color: COLOR_A }}>{against.a.wins}</span>
								<span className="text-fg-4"> – </span>
								<span style={{ color: COLOR_B }}>{against.b.wins}</span>
							</div>
							<div className="text-right text-[12px] text-fg-3">
								{against.a.wins === against.b.wins
									? "Empate en el cara a cara"
									: `${against.a.wins > against.b.wins ? a.profile.name : b.profile.name} domina el cara a cara`}
							</div>
						</div>
						<Duel pairing={against} />
						<Recent games={against.recent} mode="against" />
					</>
				) : (
					<Nothing text="Aún no os habéis enfrentado con estos filtros." />
				)}
			</Panel>
		</div>
	)
}

function Count({ n }: { n: number }) {
	return (
		<span className="num text-[12px] text-fg-3">
			{n} {n === 1 ? "partida" : "partidas"}
		</span>
	)
}

function Nothing({ text }: { text: string }) {
	return (
		<div className="grid h-40 place-items-center text-center text-[13px] text-fg-3">
			{text}
		</div>
	)
}

/** Who carried more often when playing on the same team. */
function Carry({
	pairing,
	names,
}: {
	pairing: Pairing
	names: [string, string]
}) {
	const diff = pairing.a.acs - pairing.b.acs
	if (Math.abs(diff) < 1) return null
	const lead = diff > 0
	return (
		<div className="text-right text-[12px] text-fg-3">
			<span className="font-medium" style={{ color: lead ? COLOR_A : COLOR_B }}>
				{lead ? names[0] : names[1]}
			</span>{" "}
			lleva al equipo
			<div className="num">+{Math.round(Math.abs(diff))} ACS de media</div>
		</div>
	)
}

const DUEL: {
	label: string
	get: (s: Summary) => number | null
	fmt: (v: number) => string
}[] = [
	{ label: "ACS", get: (s) => s.acs, fmt: (v) => String(Math.round(v)) },
	{ label: "K/D", get: (s) => s.kd, fmt: (v) => fixed(v) },
	{ label: "Daño/ronda", get: (s) => s.adr, fmt: (v) => String(Math.round(v)) },
	{
		label: "Perf.",
		get: (s) => (s.perfN ? s.perf : null),
		fmt: (v) => String(Math.round(v)),
	},
	{ label: "HS%", get: (s) => s.hs, fmt: (v) => pct(v) },
]

function Duel({ pairing }: { pairing: Pairing }) {
	return (
		<div className="mt-5 grid grid-cols-5 gap-2 border-t border-line pt-4">
			{DUEL.map((d, i) => {
				const x = d.get(pairing.a)
				const y = d.get(pairing.b)
				const share = x !== null && y !== null && x + y > 0 ? x / (x + y) : 0.5
				return (
					<div key={d.label} className="min-w-0">
						<div className="eyebrow truncate">{d.label}</div>
						<div className="num mt-1 flex items-baseline justify-between gap-1 text-[13px] font-semibold">
							<span style={{ color: COLOR_A }}>
								{x === null ? "—" : d.fmt(x)}
							</span>
							<span style={{ color: COLOR_B }}>
								{y === null ? "—" : d.fmt(y)}
							</span>
						</div>
						<div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-white/[0.05]">
							<motion.div
								style={{ background: COLOR_A }}
								initial={{ width: "50%" }}
								animate={{ width: `${share * 100}%` }}
								transition={{ ...spring, delay: 0.04 * i }}
							/>
							<div className="flex-1" style={{ background: COLOR_B }} />
						</div>
					</div>
				)
			})}
		</div>
	)
}

function Line({ g, color }: { g: Game; color: string }) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<AgentIcon name={g.agent} size={24} />
			<div className="min-w-0 leading-tight">
				<div className="num truncate text-[12px] font-medium">
					{g.kills}/{g.deaths}/{g.assists}
				</div>
				<div className="num text-[11px]" style={{ color }}>
					{Math.round(acsOf(g))} ACS
				</div>
			</div>
		</div>
	)
}

function Recent({
	games,
	mode,
}: {
	games: SharedGame[]
	mode: "together" | "against"
}) {
	return (
		<ul className="mt-4 grid gap-1">
			{games.map((s) => {
				const result = s.a.result
				const tag =
					mode === "together"
						? { W: "V", L: "D", D: "E" }[result]
						: result === "W"
							? "A"
							: result === "L"
								? "B"
								: "="
				return (
					<li
						key={s.id}
						className="grid grid-cols-[28px_1fr_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
					>
						<span
							className={clsx(
								"grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold",
								mode === "together" &&
									(result === "W"
										? "bg-win/15 text-win"
										: result === "L"
											? "bg-loss/15 text-loss"
											: "bg-white/5 text-fg-3"),
							)}
							style={
								mode === "against" && result !== "D"
									? {
											background: `${result === "W" ? COLOR_A : COLOR_B}26`,
											color: result === "W" ? COLOR_A : COLOR_B,
										}
									: undefined
							}
							title={
								mode === "together"
									? undefined
									: result === "W"
										? "Ganó el jugador 1"
										: result === "L"
											? "Ganó el jugador 2"
											: "Empate"
							}
						>
							{tag}
						</span>
						<Line g={s.a} color={COLOR_A} />
						<Line g={s.b} color={COLOR_B} />
						<div className="text-right leading-tight">
							<div className="text-[12px] font-medium">{s.map}</div>
							<div className="num text-[11px] text-fg-3">
								{s.a.my}–{s.a.their} · {shortDate(s.startedAt)}
							</div>
						</div>
					</li>
				)
			})}
		</ul>
	)
}
