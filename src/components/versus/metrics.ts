import { fixed, pct } from "@/lib/format"
import type { Summary } from "@/interfaces/stats"
import type { VersusSide } from "@/interfaces/versus"

export const COLOR_A = "#ff4655"
export const COLOR_B = "#64d2ff"

export interface Metric {
	key: string
	label: string
	hint?: string
	get: (s: VersusSide) => number | null
	format: (v: number) => string
	lower?: boolean
}

const detailed = (f: (s: Summary) => number) => (v: VersusSide) =>
	v.summary.detailed ? f(v.summary) : null
const played = (f: (s: Summary) => number) => (v: VersusSide) =>
	v.summary.games ? f(v.summary) : null
const round = (v: number) => String(Math.round(v))
const clutchRate = (s: Summary) =>
	s.clutchWon.reduce((a, b) => a + b, 0) /
	Math.max(
		1,
		s.clutchAtt.reduce((a, b) => a + b, 0),
	)

export const METRIC_GROUPS: { title: string; metrics: Metric[] }[] = [
	{
		title: "Rendimiento",
		metrics: [
			{
				key: "perf",
				label: "Performance Score",
				get: (v) => (v.summary.perfN ? v.summary.perf : null),
				format: round,
			},
			{
				key: "win",
				label: "Victorias",
				get: played((s) => s.winRate),
				format: (v) => pct(v),
			},
			{
				key: "kd",
				label: "K/D",
				get: played((s) => s.kd),
				format: (v) => fixed(v),
			},
			{
				key: "kda",
				label: "KDA",
				get: played((s) => s.kda),
				format: (v) => fixed(v),
			},
			{
				key: "acs",
				label: "ACS",
				hint: "Puntuación de combate por ronda",
				get: played((s) => s.acs),
				format: round,
			},
			{
				key: "adr",
				label: "Daño por ronda",
				get: played((s) => s.adr),
				format: round,
			},
			{
				key: "delta",
				label: "Daño neto por ronda",
				hint: "Daño hecho menos daño recibido",
				get: played((s) => s.damageDelta),
				format: (v) => (v > 0 ? `+${Math.round(v)}` : round(v)),
			},
		],
	},
	{
		title: "Impacto",
		metrics: [
			{
				key: "kast",
				label: "KAST",
				hint: "Rondas con kill, asistencia, supervivencia o trade",
				get: detailed((s) => s.kast),
				format: (v) => pct(v),
			},
			{
				key: "fk",
				label: "Primeras kills por partida",
				get: detailed((s) => s.fkPerMatch),
				format: (v) => fixed(v, 1),
			},
			{
				key: "fd",
				label: "Primeras muertes por partida",
				get: detailed((s) => s.fdPerMatch),
				format: (v) => fixed(v, 1),
				lower: true,
			},
			{
				key: "fkr",
				label: "Duelos de apertura ganados",
				get: detailed((s) => s.fkRatio),
				format: (v) => pct(v),
			},
			{
				key: "mvp",
				label: "MVP de la partida",
				get: detailed((s) => s.mvps / s.detailed),
				format: (v) => pct(v),
			},
			{
				key: "clutch",
				label: "Clutches ganados",
				get: detailed(clutchRate),
				format: (v) => pct(v),
			},
			{
				key: "multi",
				label: "Rondas de 3+ kills por partida",
				get: detailed(
					(s) => (s.multi[1] + s.multi[2] + s.multi[3]) / s.detailed,
				),
				format: (v) => fixed(v, 1),
			},
		],
	},
	{
		title: "Precisión y lados",
		metrics: [
			{
				key: "hs",
				label: "Headshots",
				get: played((s) => s.hs),
				format: (v) => pct(v, 1),
			},
			{
				key: "atk",
				label: "Rondas ganadas atacando",
				get: detailed((s) => s.atkWinRate),
				format: (v) => pct(v),
			},
			{
				key: "def",
				label: "Rondas ganadas defendiendo",
				get: detailed((s) => s.defWinRate),
				format: (v) => pct(v),
			},
			{
				key: "traded",
				label: "Muertes tradeadas",
				get: detailed((s) => s.tradedPct),
				format: (v) => pct(v),
			},
		],
	},
	{
		title: "Consistencia",
		metrics: [
			{
				key: "sacs",
				label: "Variación de ACS",
				hint: "Desviación entre partidas; menos es más regular",
				get: (v) => (v.summary.games > 1 ? v.spread.acs : null),
				format: (v) => `±${Math.round(v)}`,
				lower: true,
			},
			{
				key: "sperf",
				label: "Variación de Performance",
				hint: "Desviación entre partidas; menos es más regular",
				get: (v) => v.spread.perf,
				format: (v) => `±${Math.round(v)}`,
				lower: true,
			},
			{
				key: "streak",
				label: "Mejor racha de victorias",
				get: played((s) => s.streak.longestWin),
				format: round,
			},
		],
	},
]

/** -1 = A wins, 1 = B wins, 0 = tie or not comparable. */
export function winner(m: Metric, a: VersusSide, b: VersusSide): -1 | 0 | 1 {
	const x = m.get(a)
	const y = m.get(b)
	if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y))
		return 0
	if (m.format(x) === m.format(y)) return 0
	return x > y !== !!m.lower ? -1 : 1
}
