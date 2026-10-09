import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"
import { Check, Copy, Loader2, Play } from "lucide-react"
import { spring } from "@/components/ui/primitives"
import { JsonView } from "@/components/docs/JsonView"
import { SchemaView } from "@/components/docs/SchemaView"
import type {
	ApiOperation,
	ApiParameter,
	JsonSchema,
} from "@/interfaces/openapi"

interface Result {
	status: number
	ms: number
	bytes: number
	body: unknown
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
	const [done, setDone] = useState(false)
	return (
		<button
			type="button"
			onClick={() => {
				void navigator.clipboard.writeText(text)
				setDone(true)
				setTimeout(() => setDone(false), 1400)
			}}
			className="pressable inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-fg-3 hover:bg-white/[0.06] hover:text-fg"
			aria-label="Copiar"
		>
			{done ? <Check size={13} className="text-win" /> : <Copy size={13} />}
			{label}
		</button>
	)
}

function PathLabel({ path }: { path: string }) {
	return (
		<code className="font-mono text-[14px] break-all">
			{path.split(/(\{[^}]+\})/).map((part, i) =>
				part.startsWith("{") ? (
					<span key={i} className="text-gold">
						{part}
					</span>
				) : (
					<span key={i}>{part}</span>
				),
			)}
		</code>
	)
}

function ParamInput({
	param,
	value,
	onChange,
}: {
	param: ApiParameter
	value: string
	onChange: (v: string) => void
}) {
	const cls =
		"h-9 w-full rounded-xl bg-white/[0.05] px-3 font-mono text-[12.5px] text-fg ring-1 ring-line outline-none transition-shadow focus:ring-white/25"
	if (param.schema.enum)
		return (
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cls}
			>
				{!param.required && param.schema.default === undefined && (
					<option value="">—</option>
				)}
				{param.schema.enum.map((v) => (
					<option key={String(v)} value={String(v)}>
						{String(v)}
					</option>
				))}
			</select>
		)
	return (
		<input
			value={value}
			onChange={(e) => onChange(e.target.value)}
			inputMode={param.schema.type === "integer" ? "numeric" : undefined}
			placeholder={
				param.schema.default !== undefined ? String(param.schema.default) : ""
			}
			className={cls}
			spellCheck={false}
		/>
	)
}

export function Endpoint({
	path,
	op,
	schemas,
	origin,
	base,
	defaults,
}: {
	path: string
	op: ApiOperation
	schemas: Record<string, JsonSchema>
	origin: string
	base: string
	defaults: Record<string, string>
}) {
	const params = op.parameters ?? []
	const [values, setValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			params.map((p) => [
				p.name,
				defaults[p.name] ??
					(p.schema.default !== undefined ? String(p.schema.default) : ""),
			]),
		),
	)
	useEffect(() => {
		setValues((v) => {
			const next = { ...v }
			for (const [k, val] of Object.entries(defaults))
				if (!next[k]) next[k] = val
			return next
		})
	}, [defaults])

	const [result, setResult] = useState<Result | null>(null)
	const [loading, setLoading] = useState(false)
	const ref = useRef<HTMLElement>(null)

	const url = useMemo(() => {
		let p = path
		const qs = new URLSearchParams()
		for (const param of params) {
			const v = values[param.name]
			if (param.in === "path")
				p = p.replace(
					`{${param.name}}`,
					encodeURIComponent(v || `{${param.name}}`),
				)
			else if (v && String(param.schema.default) !== v) qs.set(param.name, v)
		}
		const q = qs.toString()
		return `${base}${p}${q ? `?${q}` : ""}`
	}, [path, params, values, base])

	const missingPath = params.some((p) => p.in === "path" && !values[p.name])

	const send = async () => {
		if (missingPath) return
		setLoading(true)
		const t = performance.now()
		try {
			const res = await fetch(url)
			const text = await res.text()
			let body: unknown = text
			try {
				body = JSON.parse(text)
			} catch {}
			setResult({
				status: res.status,
				ms: Math.round(performance.now() - t),
				bytes: text.length,
				body,
			})
		} catch (err) {
			setResult({ status: 0, ms: 0, bytes: 0, body: { error: String(err) } })
		} finally {
			setLoading(false)
		}
	}

	// Run each example once when it scrolls into view, so the docs always show live data.
	useEffect(() => {
		const el = ref.current
		if (!el || path === "/openapi.json") return
		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting && !result && !missingPath) {
					void send()
					io.disconnect()
				}
			},
			{ rootMargin: "200px" },
		)
		io.observe(el)
		return () => io.disconnect()
	}, [missingPath])

	const schema =
		op.responses["200"]?.content?.["application/json"]?.schema ?? null
	const curl = `curl "${origin}${url}"`

	return (
		<section
			ref={ref}
			id={op.operationId}
			className="scroll-mt-24 border-t border-line py-14 first:border-t-0 first:pt-4"
		>
			<div className="flex flex-wrap items-center gap-3">
				<span className="rounded-md bg-win/15 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-win">
					GET
				</span>
				<PathLabel path={path} />
			</div>
			<h2 className="display mt-3 text-[28px] font-semibold">{op.summary}</h2>
			<p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-fg-3">
				{op.description}
			</p>

			<div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
				<div className="grid content-start gap-8">
					{params.length > 0 && (
						<div>
							<h3 className="eyebrow mb-3">Parámetros</h3>
							<ul className="grid gap-4">
								{params.map((p) => (
									<li key={p.name} className="grid gap-1.5">
										<div className="flex flex-wrap items-baseline gap-2">
											<code className="font-mono text-[13px] font-medium">
												{p.name}
											</code>
											<span className="font-mono text-[11px] text-info">
												{p.schema.type}
											</span>
											<span className="text-[11px] text-fg-4">
												{p.in === "path" ? "ruta" : "query"}
												{p.required && " · obligatorio"}
												{p.schema.minimum !== undefined &&
													` · ${p.schema.minimum}–${p.schema.maximum ?? "∞"}`}
											</span>
										</div>
										<p className="text-[12.5px] text-fg-3">{p.description}</p>
										<ParamInput
											param={p}
											value={values[p.name] ?? ""}
											onChange={(v) =>
												setValues((s) => ({ ...s, [p.name]: v }))
											}
										/>
									</li>
								))}
							</ul>
						</div>
					)}

					{schema && (
						<div>
							<h3 className="eyebrow mb-3">Respuesta</h3>
							<SchemaView schema={schema} schemas={schemas} />
						</div>
					)}
				</div>

				<div className="xl:sticky xl:top-8 xl:self-start">
					<div className="overflow-hidden rounded-[20px] bg-[#0b0b0d] ring-1 ring-line-strong">
						<div className="flex items-center gap-2 border-b border-line px-3 py-2">
							<code className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-2">
								{curl}
							</code>
							<CopyButton text={curl} />
							<button
								type="button"
								onClick={send}
								disabled={loading || missingPath}
								className="pressable inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-1.5 text-[12px] font-medium text-bg disabled:opacity-40"
							>
								{loading ? (
									<Loader2 size={13} className="animate-spin" />
								) : (
									<Play size={12} fill="currentColor" />
								)}
								Probar
							</button>
						</div>

						<AnimatePresence mode="wait" initial={false}>
							{result ? (
								<motion.div
									key={`${result.status}-${result.ms}-${result.bytes}`}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									transition={{ ...spring, duration: 0.3 }}
								>
									<div className="flex items-center gap-3 px-4 pt-3 text-[11px]">
										<span
											className={clsx(
												"num rounded-md px-1.5 py-0.5 font-mono font-semibold",
												result.status >= 200 && result.status < 300
													? "bg-win/15 text-win"
													: "bg-loss/15 text-loss",
											)}
										>
											{result.status || "ERR"}
										</span>
										<span className="num text-fg-3">{result.ms} ms</span>
										<span className="num text-fg-3">
											{result.bytes > 1024
												? `${(result.bytes / 1024).toFixed(1)} KB`
												: `${result.bytes} B`}
										</span>
										<span className="ml-auto">
											<CopyButton
												text={JSON.stringify(result.body, null, 2)}
												label="JSON"
											/>
										</span>
									</div>
									<div className="max-h-[560px] overflow-auto px-3 py-3">
										<JsonView value={result.body} />
									</div>
								</motion.div>
							) : (
								<motion.div
									key="empty"
									className="grid h-40 place-items-center text-[13px] text-fg-4"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								>
									{missingPath
										? "Rellena los parámetros de ruta para probar"
										: loading
											? "Cargando…"
											: "Pulsa Probar para ver la respuesta real"}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>
		</section>
	)
}
