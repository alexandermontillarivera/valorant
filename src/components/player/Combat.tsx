import { useMemo } from "react"
import { motion } from "motion/react"
import {
	Coins,
	Crosshair,
	Flame,
	HandCoins,
	ShieldCheck,
	Swords,
	Users,
	Zap,
} from "lucide-react"
import clsx from "clsx"
import { RATING_ORDER, byParty, perfBreakdown } from "@/lib/stats"
import { fixed, pct } from "@/lib/format"
import {
	Bar,
	Panel,
	RankIcon,
	spring,
	useTierName,
} from "@/components/ui/primitives"
import { GRADES, RATING_META, perfColor } from "@/components/ui/perf"
import { Ring } from "@/components/charts/charts"
import { Tile } from "@/components/player/Overview"
import type { Game } from "@/interfaces/game"
import type { Summary } from "@/interfaces/stats"
import type { CombatView } from "@/interfaces/views"

const stagger = (i: number) => ({
	initial: { opacity: 0, y: 14 },
	animate: { opacity: 1, y: 0 },
	transition: { ...spring, delay: 0.03 * i },
})

const RATING_COLOR: Record<(typeof RATING_ORDER)[number], string> = {
	double_down: "#ff5a5f",
	down: "rgba(255,90,95,0.45)",
	neutral: "rgba(255,255,255,0.18)",
	up: "rgba(50,213,131,0.5)",
	double_up: "#32d583",
}

export function Combat({
	summary: s,
	view,
}: {
	summary: Summary
	view: CombatView
}) {
	const nameOfTier = useTierName()
	const { breakdown, parties } = view

	if (!s.detailed) {
		return (
			<div className="panel py-24 text-center text-fg-3">
				Estas estadísticas salen del detalle ronda a ronda. Se están descargando
				en segundo plano: vuelve en unos minutos.
			</div>
		)
	}

	const clutchAtt = s.clutchAtt.reduce((a, b) => a + b, 0)
	const clutchWon = s.clutchWon.reduce((a, b) => a + b, 0)
	const gradeTotal = Math.max(
		1,
		Object.values(s.grades).reduce((a, b) => a + b, 0),
	)

	return (
		<div className="grid grid-cols-12 gap-3 sm:gap-4">
			<motion.div {...stagger(0)} className="col-span-12">
				<Panel
					title="Performance Score"
					action={
						<span className="text-[12px] text-fg-3">
							Métrica oficial de Riot · {s.perfN} partidas
						</span>
					}
				>
					{s.perfN ? (
						<div className="grid gap-8 lg:grid-cols-[260px_1fr]">
							<div className="flex flex-col items-center gap-5">
								<Ring
									value={s.perf / 500}
									size={170}
									stroke={11}
									color={perfColor(s.perf)}
								>
									<div>
										<div
											className="num text-[44px] leading-none font-semibold tracking-[-0.04em]"
											style={{ color: perfColor(s.perf) }}
										>
											{s.perf.toFixed(0)}
										</div>
										<div className="mt-1 text-[11px] text-fg-3">de 500</div>
									</div>
								</Ring>
								<div className="grid w-full gap-2">
									{Object.entries(GRADES).map(([key, g]) => {
										const n = s.grades[key] ?? 0
										return (
											<div
												key={key}
												className="flex items-center gap-3 text-[12px]"
											>
												<span className="w-20 text-fg-2">{g.label}</span>
												<Bar
													value={n / gradeTotal}
													color={g.color}
													className="flex-1"
												/>
												<span className="num w-8 text-right text-fg-3">
													{n}
												</span>
											</div>
										)
									})}
								</div>
							</div>

							<div>
								<div className="mb-3 grid grid-cols-[1fr_80px_minmax(0,1.4fr)] items-center gap-4 text-[10px] tracking-wider text-fg-3 uppercase">
									<span>Categoría</span>
									<span className="text-right">Media</span>
									<span>Valoración frente al lobby</span>
								</div>
								<ul className="grid gap-3">
									{breakdown.map((c, i) => {
										const total = Math.max(
											1,
											Object.values(c.dist).reduce((a, b) => a + b, 0),
										)
										const above = (c.dist.up + c.dist.double_up) / total
										return (
											<li
												key={c.key}
												className="grid grid-cols-[1fr_80px_minmax(0,1.4fr)] items-center gap-4"
											>
												<span className="text-[13px]">{c.label}</span>
												<span className="num text-right text-[13px] font-medium">
													{c.key === "damage" ? c.avg.toFixed(0) : fixed(c.avg)}
												</span>
												<div className="flex items-center gap-3">
													<div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
														{RATING_ORDER.map((r) => (
															<motion.span
																key={r}
																title={`${RATING_META[r].label}: ${c.dist[r]}`}
																style={{ background: RATING_COLOR[r] }}
																initial={{ width: 0 }}
																animate={{
																	width: `${(c.dist[r] / total) * 100}%`,
																}}
																transition={{ ...spring, delay: 0.05 * i }}
															/>
														))}
													</div>
													<span
														className={clsx(
															"num w-10 text-right text-[12px]",
															above >= 0.5 ? "text-win" : "text-fg-3",
														)}
													>
														{pct(above)}
													</span>
												</div>
											</li>
										)
									})}
								</ul>
								<div className="mt-4 flex flex-wrap gap-3 text-[11px] text-fg-3">
									{RATING_ORDER.map((r) => (
										<span key={r} className="flex items-center gap-1.5">
											<span
												className="h-2 w-2 rounded-[3px]"
												style={{ background: RATING_COLOR[r] }}
											/>
											{RATING_META[r].label}
										</span>
									))}
									<span className="ml-auto">
										% = partidas por encima del lobby
									</span>
								</div>
							</div>
						</div>
					) : (
						<p className="py-10 text-center text-fg-3">
							Riot solo incluye el Performance Score en las partidas recientes;
							ninguna de este filtro lo tiene.
						</p>
					)}
				</Panel>
			</motion.div>

			<motion.div {...stagger(1)} className="col-span-12 md:col-span-6">
				<Panel
					className="h-full"
					title={
						<Title icon={<Flame size={14} className="text-accent" />}>
							Multikills
						</Title>
					}
				>
					<div className="grid grid-cols-4 gap-2">
						{(["2K", "3K", "4K", "ACE"] as const).map((label, i) => (
							<div
								key={label}
								className={clsx(
									"rounded-2xl p-3 text-center ring-1 ring-line",
									i === 3 ? "bg-accent/[0.08]" : "bg-white/[0.035]",
								)}
							>
								<div className="num text-[26px] font-semibold tracking-[-0.03em]">
									{s.multi[i]}
								</div>
								<div
									className={clsx(
										"text-[11px] font-medium",
										i === 3 ? "text-accent" : "text-fg-3",
									)}
								>
									{label}
								</div>
								<div className="num mt-1 text-[10px] text-fg-4">
									{fixed(s.multi[i] / Math.max(1, s.detailed), 2)}/partida
								</div>
							</div>
						))}
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(2)} className="col-span-12 md:col-span-6">
				<Panel
					className="h-full"
					title={
						<Title icon={<Crosshair size={14} className="text-info" />}>
							Clutches
						</Title>
					}
					action={
						<span className="num text-[12px] text-fg-3">
							{clutchWon}/{clutchAtt} ·{" "}
							{pct(clutchWon / Math.max(1, clutchAtt))}
						</span>
					}
				>
					<ul className="grid gap-2.5">
						{s.clutchAtt.map((att, i) => (
							<li
								key={i}
								className="grid grid-cols-[44px_1fr_70px] items-center gap-3 text-[13px]"
							>
								<span className="font-medium">1v{i + 1}</span>
								<Bar
									value={s.clutchWon[i] / Math.max(1, att)}
									color="var(--color-info)"
									delay={i * 0.04}
								/>
								<span className="num text-right text-fg-2">
									{s.clutchWon[i]}/{att}
								</span>
							</li>
						))}
					</ul>
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(3)}
				className="col-span-12 md:col-span-6 lg:col-span-4"
			>
				<Panel
					className="h-full"
					title={<Title icon={<Swords size={14} />}>Duelos de apertura</Title>}
				>
					<div className="flex items-end justify-between">
						<div>
							<div className="num text-[34px] font-semibold tracking-[-0.03em]">
								{pct(s.fkRatio)}
							</div>
							<div className="text-[12px] text-fg-3">ganados</div>
						</div>
						<div className="num text-right text-[13px]">
							<div>
								<span className="text-win">{fixed(s.fkPerMatch, 1)}</span>{" "}
								<span className="text-fg-3">FK/partida</span>
							</div>
							<div>
								<span className="text-loss">{fixed(s.fdPerMatch, 1)}</span>{" "}
								<span className="text-fg-3">FD/partida</span>
							</div>
						</div>
					</div>
					<div className="mt-4 flex h-2 overflow-hidden rounded-full">
						<motion.span
							className="bg-win"
							initial={{ width: 0 }}
							animate={{ width: `${s.fkRatio * 100}%` }}
							transition={spring}
						/>
						<span className="flex-1 bg-loss/70" />
					</div>
					<div className="mt-5 grid grid-cols-2 gap-2">
						<Tile label="Trade kills" value={s.tradeKills} />
						<Tile label="Muertes tradeadas" value={pct(s.tradedPct)} />
					</div>
				</Panel>
			</motion.div>

			<motion.div
				{...stagger(4)}
				className="col-span-12 md:col-span-6 lg:col-span-4"
			>
				<Panel
					className="h-full"
					title={
						<Title icon={<Coins size={14} className="text-gold" />}>
							Economía
						</Title>
					}
					action={
						<span className="num text-[12px] text-fg-3">
							Econ rating {s.econ.toFixed(0)}
						</span>
					}
				>
					<ul className="grid gap-2.5">
						{(
							[
								["pistol", "Pistolas"],
								["eco", "Eco"],
								["force", "Force / half"],
								["full", "Full buy"],
							] as const
						).map(([k, label], i) => {
							const [won, total] = s.buys[k]
							return (
								<li
									key={k}
									className="grid grid-cols-[90px_1fr_76px] items-center gap-3 text-[13px]"
								>
									<span className="text-fg-2">{label}</span>
									<Bar
										value={won / Math.max(1, total)}
										color={
											won / Math.max(1, total) >= 0.5
												? "var(--color-win)"
												: "var(--color-fg)"
										}
										delay={i * 0.04}
									/>
									<span className="num text-right">
										{pct(won / Math.max(1, total))}{" "}
										<span className="text-fg-4">· {total}</span>
									</span>
								</li>
							)
						})}
					</ul>
					<div className="mt-5 grid grid-cols-2 gap-2">
						<Tile
							icon={<ShieldCheck size={13} className="text-win" />}
							label="Rondas flawless"
							value={s.flawless}
						/>
						<Tile
							icon={<HandCoins size={13} className="text-gold" />}
							label="Rondas thrifty"
							value={s.thrifty}
						/>
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(5)} className="col-span-12 lg:col-span-4">
				<Panel
					className="h-full"
					title={
						<Title icon={<Zap size={14} className="text-info" />}>
							Utilidad
						</Title>
					}
					action={<span className="text-[12px] text-fg-3">usos por ronda</span>}
				>
					<div className="grid grid-cols-4 gap-2">
						{(["c", "q", "e", "x"] as const).map((k) => (
							<div
								key={k}
								className="rounded-2xl bg-white/[0.035] p-3 text-center ring-1 ring-line"
							>
								<div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[11px] font-semibold uppercase">
									{k}
								</div>
								<div className="num text-[18px] font-semibold">
									{fixed(s.castsPerRound[k], 2)}
								</div>
							</div>
						))}
					</div>
					<div className="mt-4 grid grid-cols-3 gap-2">
						<Tile label="Plantas" value={s.plants} />
						<Tile label="Defuses" value={s.defuses} />
						<Tile label="Fuego amigo" value={s.friendlyFire} />
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(6)} className="col-span-12 md:col-span-6">
				<Panel className="h-full" title="Nivel de tus lobbies">
					<div className="grid grid-cols-2 gap-3">
						{(
							[
								["Aliados", s.allyTier],
								["Rivales", s.enemyTier],
							] as const
						).map(([label, tier]) => (
							<div
								key={label}
								className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3 ring-1 ring-line"
							>
								<RankIcon tier={Math.round(tier)} size={44} />
								<div>
									<div className="text-[11px] text-fg-3">{label} (media)</div>
									<div className="font-semibold">
										{tier ? nameOfTier(Math.round(tier)) : "—"}
									</div>
								</div>
							</div>
						))}
					</div>
				</Panel>
			</motion.div>

			<motion.div {...stagger(7)} className="col-span-12 md:col-span-6">
				<Panel
					className="h-full"
					title={<Title icon={<Users size={14} />}>Solo vs en grupo</Title>}
				>
					<ul className="grid gap-2.5">
						{parties.map((p, i) => (
							<li
								key={p.key}
								className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-[13px]"
							>
								<span className="text-fg-2">{p.key}</span>
								<Bar
									value={p.winRate}
									color={
										p.winRate >= 0.5 ? "var(--color-win)" : "var(--color-loss)"
									}
									delay={i * 0.04}
								/>
								<span className="num text-right">
									{pct(p.winRate)}{" "}
									<span className="text-fg-4">
										· {p.games} · {fixed(p.kd)} K/D
									</span>
								</span>
							</li>
						))}
					</ul>
				</Panel>
			</motion.div>
		</div>
	)
}

function Title({
	icon,
	children,
}: {
	icon: React.ReactNode
	children: React.ReactNode
}) {
	return (
		<span className="inline-flex items-center gap-1.5">
			{icon}
			{children}
		</span>
	)
}
