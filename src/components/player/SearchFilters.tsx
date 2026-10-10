import { useEffect, useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"
import clsx from "clsx"
import { Segmented } from "@/components/ui/primitives"
import { PlayerPicker } from "@/components/player/PlayerPicker"
import type {
	SearchCondition,
	SearchCriteria,
	SearchMetric,
} from "@/interfaces/views"

export const EMPTY_CRITERIA: SearchCriteria = {
	q: "",
	player: null,
	side: "any",
	agent: "",
	map: "",
	result: "",
	mvp: "",
	from: "",
	to: "",
	sort: "date",
	conditions: [],
}

const METRICS: { value: SearchMetric; label: string; step: number }[] = [
	{ value: "kills", label: "Kills", step: 1 },
	{ value: "deaths", label: "Muertes", step: 1 },
	{ value: "assists", label: "Asistencias", step: 1 },
	{ value: "kd", label: "K/D", step: 0.1 },
	{ value: "acs", label: "ACS", step: 10 },
	{ value: "adr", label: "ADR", step: 10 },
	{ value: "hs", label: "HS %", step: 1 },
	{ value: "perf", label: "Perf. Score", step: 10 },
	{ value: "rr", label: "RR", step: 1 },
]

export function isEmpty(c: SearchCriteria) {
	return (
		JSON.stringify({ ...c, sort: "date" }) === JSON.stringify(EMPTY_CRITERIA)
	)
}

export function activeCount(c: SearchCriteria) {
	return (
		[c.player, c.result, c.agent, c.map, c.mvp, c.from, c.to].filter(Boolean)
			.length + c.conditions.length
	)
}

const field =
	"h-9 w-full rounded-xl bg-white/[0.05] px-3 text-[13px] text-fg ring-1 ring-line outline-none transition-shadow focus:ring-white/25"

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
			<h3 className="eyebrow">{title}</h3>
			{children}
		</section>
	)
}

/** Number box that commits after a short pause, so typing "25" doesn't search for "2" first. */
function NumberBox({
	value,
	onCommit,
	step,
	placeholder,
	label,
}: {
	value: number | undefined
	onCommit: (v: number | undefined) => void
	step: number
	placeholder: string
	label: string
}) {
	const [text, setText] = useState(value === undefined ? "" : String(value))
	useEffect(() => setText(value === undefined ? "" : String(value)), [value])
	useEffect(() => {
		const t = setTimeout(() => {
			const next = text === "" ? undefined : Number(text)
			if (next !== value && (next === undefined || Number.isFinite(next)))
				onCommit(next)
		}, 400)
		return () => clearTimeout(t)
	}, [text])
	return (
		<input
			type="number"
			step={step}
			value={text}
			onChange={(e) => setText(e.target.value)}
			placeholder={placeholder}
			aria-label={label}
			className="num h-8 w-full min-w-0 [appearance:textfield] rounded-lg bg-white/[0.03] px-2 text-center text-[12.5px] ring-1 ring-line outline-none placeholder:text-fg-4 focus:bg-white/[0.06] focus:ring-white/25 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
		/>
	)
}

export function SearchBar({
	criteria: c,
	onChange,
}: {
	criteria: SearchCriteria
	onChange: (c: SearchCriteria) => void
}) {
	const [text, setText] = useState(c.q)
	useEffect(() => setText(c.q), [c.q])
	useEffect(() => {
		const t = setTimeout(() => text !== c.q && onChange({ ...c, q: text }), 250)
		return () => clearTimeout(t)
	}, [text])

	return (
		<div className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-4 ring-1 ring-line focus-within:ring-white/25">
			<Search size={15} className="text-fg-3" />
			<input
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder="Buscar por mapa, agente, modo o jugador…"
				className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-fg-4"
				spellCheck={false}
				aria-label="Buscar partidas"
			/>
			{text && (
				<button
					type="button"
					onClick={() => setText("")}
					className="pressable text-fg-3 hover:text-fg"
					aria-label="Borrar búsqueda"
				>
					<X size={14} />
				</button>
			)}
		</div>
	)
}

export function FilterPanel({
	criteria: c,
	onChange,
	facets,
}: {
	criteria: SearchCriteria
	onChange: (c: SearchCriteria) => void
	facets?: { agents: string[]; maps: string[] }
}) {
	const set = <K extends keyof SearchCriteria>(k: K, v: SearchCriteria[K]) =>
		onChange({ ...c, [k]: v })

	const bound = (metric: SearchMetric, op: SearchCondition["op"]) =>
		c.conditions.find((x) => x.metric === metric && x.op === op)?.value

	const setBound = (
		metric: SearchMetric,
		op: SearchCondition["op"],
		value: number | undefined,
	) =>
		set("conditions", [
			...c.conditions.filter((x) => !(x.metric === metric && x.op === op)),
			...(value === undefined ? [] : [{ metric, op, value }]),
		])

	return (
		<div className="panel grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4">
			<div className="flex items-center justify-between">
				<h2 className="text-[13px] font-semibold">Filtros</h2>
				{activeCount(c) > 0 && (
					<button
						type="button"
						onClick={() =>
							onChange({ ...EMPTY_CRITERIA, q: c.q, sort: c.sort })
						}
						className="pressable text-[12px] text-fg-3 hover:text-fg"
					>
						Limpiar
					</button>
				)}
			</div>

			<Section title="Jugador">
				<PlayerPicker value={c.player} onChange={(p) => set("player", p)} />
				{c.player && (
					<Segmented
						size="sm"
						value={c.side}
						onChange={(v) => set("side", v)}
						className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-1.5"
						options={[
							{ value: "any", label: "Cualquiera" },
							{ value: "ally", label: "Conmigo" },
							{ value: "enemy", label: "Contra" },
						]}
					/>
				)}
			</Section>

			<Section title="Resultado">
				<Segmented
					size="sm"
					value={c.result}
					onChange={(v) => set("result", v)}
					className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-1.5"
					options={[
						{ value: "", label: "Todos" },
						{ value: "W", label: "Victoria" },
						{ value: "L", label: "Derrota" },
						{ value: "D", label: "Empate" },
					]}
				/>
			</Section>

			<Section title="Estadísticas">
				<div className="grid grid-cols-[minmax(0,1fr)_60px_60px] items-center gap-x-2 gap-y-1.5">
					<span />
					<span className="text-center text-[10px] tracking-wide text-fg-4 uppercase">
						Mín.
					</span>
					<span className="text-center text-[10px] tracking-wide text-fg-4 uppercase">
						Máx.
					</span>
					{METRICS.map((m) => (
						<Row
							key={m.value}
							label={m.label}
							active={
								bound(m.value, "gte") !== undefined ||
								bound(m.value, "lte") !== undefined
							}
						>
							<NumberBox
								value={bound(m.value, "gte")}
								onCommit={(v) => setBound(m.value, "gte", v)}
								step={m.step}
								placeholder="—"
								label={`${m.label} mínimo`}
							/>
							<NumberBox
								value={bound(m.value, "lte")}
								onCommit={(v) => setBound(m.value, "lte", v)}
								step={m.step}
								placeholder="—"
								label={`${m.label} máximo`}
							/>
						</Row>
					))}
				</div>
			</Section>

			<Section title="Agente y mapa">
				<select
					value={c.agent}
					onChange={(e) => set("agent", e.target.value)}
					className={field}
					aria-label="Agente"
				>
					<option value="">Todos los agentes</option>
					{facets?.agents.map((a) => (
						<option key={a} value={a}>
							{a}
						</option>
					))}
				</select>
				<select
					value={c.map}
					onChange={(e) => set("map", e.target.value)}
					className={field}
					aria-label="Mapa"
				>
					<option value="">Todos los mapas</option>
					{facets?.maps.map((m) => (
						<option key={m} value={m}>
							{m}
						</option>
					))}
				</select>
			</Section>

			<Section title="MVP">
				<Segmented
					size="sm"
					value={c.mvp}
					onChange={(v) => set("mvp", v)}
					className="w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-1.5"
					options={[
						{ value: "", label: "Da igual" },
						{ value: "match", label: "Partida" },
						{ value: "team", label: "Equipo" },
					]}
				/>
			</Section>

			<Section title="Fechas">
				<label className="grid gap-1">
					<span className="text-[11px] text-fg-3">Desde</span>
					<input
						type="date"
						value={c.from}
						onChange={(e) => set("from", e.target.value)}
						className={clsx(field, "[color-scheme:dark]")}
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-[11px] text-fg-3">Hasta</span>
					<input
						type="date"
						value={c.to}
						onChange={(e) => set("to", e.target.value)}
						className={clsx(field, "[color-scheme:dark]")}
					/>
				</label>
			</Section>
		</div>
	)
}

function Row({
	label,
	active,
	children,
}: {
	label: string
	active: boolean
	children: ReactNode
}) {
	return (
		<>
			<span
				className={clsx(
					"truncate text-[12.5px]",
					active ? "font-medium text-gold" : "text-fg-2",
				)}
			>
				{label}
			</span>
			{children}
		</>
	)
}
