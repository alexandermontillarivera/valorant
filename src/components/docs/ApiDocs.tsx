import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import { FileJson, Globe2, Lock, Unlock, Zap } from "lucide-react"
import { CopyButton, Endpoint } from "@/components/docs/Endpoint"
import { SchemaView } from "@/components/docs/SchemaView"
import type { OpenApiSpec } from "@/interfaces/openapi"

export default function ApiDocs({ spec }: { spec: OpenApiSpec }) {
	const base = spec.servers[0]?.url ?? ""
	const [origin, setOrigin] = useState("")
	const [defaults, setDefaults] = useState<Record<string, string>>({})
	const [active, setActive] = useState<string | null>(null)

	useEffect(() => {
		setOrigin(location.origin)
		fetch(`${base}/matches?limit=1`)
			.then((r) => r.json())
			.then((j) => j.data?.[0]?.id && setDefaults({ id: j.data[0].id }))
			.catch(() => {})
	}, [base])

	const groups = useMemo(
		() =>
			spec.tags.map((tag) => ({
				...tag,
				endpoints: Object.entries(spec.paths).filter(([, p]) =>
					p.get.tags.includes(tag.name),
				),
			})),
		[spec],
	)

	useEffect(() => {
		const sections = [...document.querySelectorAll("section[id]")]
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries.find((e) => e.isIntersecting)
				if (visible) setActive(visible.target.id)
			},
			{ rootMargin: "-20% 0px -70% 0px" },
		)
		sections.forEach((s) => io.observe(s))
		return () => io.disconnect()
	}, [])

	const baseUrl = `${origin}${base}`

	return (
		<div className="mx-auto flex max-w-[1400px] gap-10 px-4 sm:px-6">
			<aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto py-10 lg:block">
				<a
					href="/"
					className="text-[13px] text-fg-3 transition-colors hover:text-fg"
				>
					← Volver al dashboard
				</a>
				<nav className="mt-8 grid gap-6">
					{groups.map((g) => (
						<div key={g.name}>
							<div className="eyebrow mb-2">{g.name}</div>
							<ul className="grid gap-0.5">
								{g.endpoints.map(([path, p]) => (
									<li key={path}>
										<a
											href={`#${p.get.operationId}`}
											className={clsx(
												"flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
												active === p.get.operationId
													? "bg-white/[0.07] text-fg"
													: "text-fg-3 hover:text-fg",
											)}
										>
											<span className="font-mono text-[9.5px] font-semibold text-win">
												GET
											</span>
											<span className="truncate">{p.get.summary}</span>
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
					<div>
						<div className="eyebrow mb-2">Referencia</div>
						<a
							href="#errores"
							className="block rounded-lg px-2 py-1.5 text-[13px] text-fg-3 hover:text-fg"
						>
							Errores
						</a>
					</div>
				</nav>
			</aside>

			<main className="min-w-0 flex-1 pb-32">
				<header className="relative pt-14 pb-12">
					<div className="pointer-events-none absolute -top-20 left-0 h-[360px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,70,85,0.12),transparent)]" />
					<a
						href="/"
						className="relative text-[13px] text-fg-3 hover:text-fg lg:hidden"
					>
						← Volver al dashboard
					</a>
					<p className="eyebrow relative mt-6 lg:mt-0">
						Versión {spec.info.version}
					</p>
					<h1 className="display relative mt-2 text-[44px] font-semibold sm:text-[56px]">
						{spec.info.title}
					</h1>
					<p className="relative mt-4 max-w-[640px] text-[16px] leading-relaxed text-fg-3">
						{spec.info.description}
					</p>

					<div className="relative mt-6 flex flex-wrap gap-2">
						{[
							{ icon: <Unlock size={12} />, label: "Sin autenticación" },
							{ icon: <Globe2 size={12} />, label: "CORS abierto" },
							{ icon: <Lock size={12} />, label: "Solo lectura" },
							{ icon: <Zap size={12} />, label: "Caché de 30 s" },
						].map((b) => (
							<span
								key={b.label}
								className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[12px] text-fg-2 ring-1 ring-line"
							>
								{b.icon}
								{b.label}
							</span>
						))}
					</div>

					<div className="relative mt-8 flex max-w-[640px] items-center gap-3 rounded-2xl bg-white/[0.04] py-2 pr-2 pl-4 ring-1 ring-line">
						<span className="eyebrow">Base URL</span>
						<code className="min-w-0 flex-1 truncate font-mono text-[13px]">
							{baseUrl || base}
						</code>
						<CopyButton text={baseUrl} />
						<a
							href={`${base}/openapi.json`}
							target="_blank"
							className="pressable inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-fg-3 hover:bg-white/[0.06] hover:text-fg"
						>
							<FileJson size={13} /> OpenAPI
						</a>
					</div>
				</header>

				{groups.map((g) => (
					<div key={g.name}>
						<div className="mt-6 flex items-baseline gap-3 border-t border-line-strong pt-10">
							<h2 className="text-[13px] font-semibold tracking-wide text-fg-2 uppercase">
								{g.name}
							</h2>
							<span className="text-[13px] text-fg-4">{g.description}</span>
						</div>
						{g.endpoints.map(([path, p]) => (
							<Endpoint
								key={path}
								path={path}
								op={p.get}
								schemas={spec.components.schemas}
								origin={origin}
								base={base}
								defaults={defaults}
							/>
						))}
					</div>
				))}

				<section
					id="errores"
					className="scroll-mt-24 border-t border-line-strong pt-14"
				>
					<h2 className="display text-[28px] font-semibold">Errores</h2>
					<p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-fg-3">
						Todas las respuestas de error tienen la misma forma, con el código
						HTTP y un mensaje legible.
					</p>
					<div className="mt-6 grid gap-6 xl:grid-cols-2">
						<SchemaView
							schema={spec.components.schemas.Error}
							schemas={spec.components.schemas}
						/>
						<ul className="grid content-start gap-2 text-[13px]">
							{[
								["400", "Parámetro con un valor no válido"],
								["404", "La partida no existe o aún no tiene detalle"],
								["503", "Todavía no hay datos sincronizados"],
							].map(([code, text]) => (
								<li
									key={code}
									className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-line"
								>
									<span className="num rounded-md bg-loss/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-loss">
										{code}
									</span>
									<span className="text-fg-2">{text}</span>
								</li>
							))}
						</ul>
					</div>
				</section>
			</main>
		</div>
	)
}
