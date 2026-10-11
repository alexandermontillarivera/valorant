import { motion } from "motion/react"
import { ArrowUpRight, Braces, Loader2, Swords } from "lucide-react"
import { cardArt, fixed, pct } from "@/lib/format"
import { perfColor } from "@/components/ui/perf"
import { Form } from "@/components/ui/Form"
import {
	CatalogProvider,
	Img,
	RankIcon,
	spring,
	tierColor,
	useCatalog,
} from "@/components/ui/primitives"
import type { Catalog } from "@/interfaces/catalog"
import type { ProfileCard } from "@/interfaces/versus"

export default function Profiles({
	cards,
	catalog,
}: {
	cards: ProfileCard[]
	catalog: Catalog
}) {
	return (
		<CatalogProvider value={catalog}>
			<main className="mx-auto max-w-[1240px] px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
				<motion.header
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={spring}
					className="mb-8 flex flex-wrap items-end justify-between gap-4"
				>
					<div>
						<div className="eyebrow mb-2">{cards.length} perfiles</div>
						<h1 className="display text-[34px] font-semibold sm:text-[48px]">
							Perfiles
						</h1>
					</div>
					<div className="flex items-center gap-2">
						<a
							href="/docs"
							className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-white/[0.06] px-4 text-[13px] font-medium text-fg-2 ring-1 ring-line transition-colors hover:bg-white/[0.1] hover:text-fg"
						>
							<Braces size={14} /> API
						</a>
						<a
							href="/versus"
							className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-fg px-4 text-[13px] font-semibold text-bg transition-opacity hover:opacity-90"
						>
							<Swords size={15} /> Versus
						</a>
					</div>
				</motion.header>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{cards.map((c, i) => (
						<motion.div
							key={c.slug}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.05 * i }}
						>
							<Card card={c} />
						</motion.div>
					))}
				</div>
			</main>
		</CatalogProvider>
	)
}

function Card({ card }: { card: ProfileCard }) {
	const catalog = useCatalog()
	const { profile: p, summary: s } = card
	const color = p ? tierColor(catalog, p.rank.tier) : "#a1a1a6"

	return (
		<a
			href={`/p/${card.slug}`}
			className="group pressable relative block overflow-hidden rounded-[26px] ring-1 ring-line transition-shadow hover:ring-line-strong"
		>
			<div className="absolute inset-0">
				{p && (
					<Img
						src={cardArt(p.cardId)}
						className="h-full w-full scale-110 object-cover opacity-30 blur-2xl saturate-150 transition-opacity duration-500 group-hover:opacity-45"
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/70 to-bg" />
				<div
					className="absolute inset-0"
					style={{
						background: `radial-gradient(70% 80% at 90% 0%, ${color}24, transparent 70%)`,
					}}
				/>
			</div>

			<div className="relative flex flex-col gap-5 p-5">
				<div className="flex items-center gap-3.5">
					<div className="h-14 w-14 shrink-0 overflow-hidden rounded-[18px] bg-white/5 ring-1 ring-white/10">
						{p && (
							<Img
								src={cardArt(p.cardId, "smallart")}
								className="h-full w-full object-cover"
							/>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="truncate text-[19px] font-semibold tracking-[-0.02em]">
							{p?.name ?? card.name}
							<span className="font-normal text-fg-3">
								#{p?.tag ?? card.tag}
							</span>
						</div>
						<div className="text-[12px] text-fg-3 uppercase">
							{p ? `${p.region} · nivel ${p.level}` : "—"}
						</div>
					</div>
					<ArrowUpRight
						size={18}
						className="shrink-0 text-fg-4 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
					/>
				</div>

				{!card.ok || !p ? (
					<div className="flex h-[108px] items-center gap-2 text-[13px] text-fg-3">
						<Loader2 size={14} className="animate-spin" />
						{card.message ?? "Sincronizando…"}
					</div>
				) : (
					<>
						<div className="flex items-center gap-3">
							<RankIcon tier={p.rank.tier} size={44} />
							<div>
								<div className="text-[15px] font-semibold">{p.rank.name}</div>
								<div className="num text-[12px] text-fg-3">
									{p.rank.rr} RR
									{p.peak && ` · peak ${p.peak.name}`}
								</div>
							</div>
						</div>
						<div className="grid grid-cols-4 gap-2 border-t border-line pt-4">
							<Stat
								label="Perf."
								value={s && s.perfN ? String(Math.round(s.perf)) : "—"}
								color={s && s.perfN ? perfColor(s.perf) : undefined}
							/>
							<Stat label="Win%" value={s?.games ? pct(s.winRate) : "—"} />
							<Stat label="K/D" value={s?.games ? fixed(s.kd) : "—"} />
							<Stat
								label="ACS"
								value={s?.games ? String(Math.round(s.acs)) : "—"}
							/>
						</div>
						<div className="flex items-center justify-between text-[12px] text-fg-3">
							<span>
								Acto actual · {s?.games ?? 0}{" "}
								{s?.games === 1 ? "partida" : "partidas"}
							</span>
							<Form results={card.form ?? []} />
						</div>
					</>
				)}
			</div>
		</a>
	)
}

function Stat({
	label,
	value,
	color,
}: {
	label: string
	value: string
	color?: string
}) {
	return (
		<div>
			<div className="eyebrow">{label}</div>
			<div
				className="num mt-0.5 text-[18px] font-semibold tracking-[-0.02em]"
				style={color ? { color } : undefined}
			>
				{value}
			</div>
		</div>
	)
}
