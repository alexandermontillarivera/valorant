import { motion } from "motion/react"
import { Braces, TrendingDown, TrendingUp, Crown, Globe2 } from "lucide-react"
import clsx from "clsx"
import { perfColor } from "@/components/ui/perf"
import { cardArt, signed } from "@/lib/format"
import { SyncBadge } from "@/components/player/SyncBadge"
import { Block } from "@/components/ui/Skeleton"
import {
	AnimatedNumber,
	Img,
	RankIcon,
	spring,
	tierColor,
	useCatalog,
} from "@/components/ui/primitives"
import type { Profile } from "@/interfaces/player"
import type { Summary } from "@/interfaces/stats"
import type { SyncStatus } from "@/interfaces/dashboard"

export function Hero({
	profile,
	summary,
	sync,
}: {
	profile: Profile
	summary?: Summary
	sync: SyncStatus
}) {
	const catalog = useCatalog()
	const color = tierColor(catalog, profile.rank.tier)
	const up = profile.rank.lastChange >= 0

	return (
		<section className="relative overflow-hidden rounded-[28px] ring-1 ring-line">
			<div className="absolute inset-0">
				<Img
					src={cardArt(profile.cardId)}
					className="h-full w-full scale-110 object-cover opacity-40 blur-2xl saturate-150"
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/70 to-bg" />
				<div
					className="absolute inset-0"
					style={{
						background: `radial-gradient(60% 90% at 85% 10%, ${color}26, transparent 70%)`,
					}}
				/>
			</div>

			<div className="relative flex flex-col gap-6 p-6 sm:p-8">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={spring}
					className="flex min-w-0 items-end gap-4 sm:gap-5"
				>
					<div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[22px] bg-white/5 shadow-2xl ring-1 ring-white/10 sm:h-[104px] sm:w-[104px]">
						<Img
							src={cardArt(profile.cardId, "smallart")}
							className="h-full w-full object-cover"
						/>
						<span className="glass num absolute right-1.5 bottom-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-fg ring-1 ring-white/10">
							{profile.level}
						</span>
					</div>
					<div className="min-w-0">
						<div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-fg-3">
							<span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 uppercase">
								<Globe2 size={12} /> {profile.region}
							</span>
							<SyncBadge sync={sync} />
							<a
								href="/docs"
								className="pressable inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 transition-colors hover:bg-white/[0.1] hover:text-fg"
							>
								<Braces size={12} /> API
							</a>
						</div>
						<h1 className="display text-[30px] font-semibold [overflow-wrap:anywhere] sm:truncate sm:text-[48px]">
							<bdi>{profile.name}</bdi>
							<span className="font-normal text-fg-3">#{profile.tag}</span>
						</h1>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring, delay: 0.08 }}
					className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-stretch"
				>
					<div className="glass flex items-center gap-4 rounded-[20px] py-3 pr-5 pl-3 ring-1 ring-white/[0.08]">
						<RankIcon tier={profile.rank.tier} size={68} />
						<div className="min-w-[150px]">
							<div className="eyebrow">Rango actual</div>
							<div className="text-[20px] font-semibold tracking-[-0.02em]">
								{profile.rank.name}
							</div>
							<div className="mt-2 flex items-center gap-2">
								<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
									<motion.div
										className="h-full rounded-full"
										style={{ background: color, transformOrigin: "left" }}
										initial={{ scaleX: 0 }}
										animate={{ scaleX: Math.min(1, profile.rank.rr / 100) }}
										transition={{ ...spring, duration: 1, delay: 0.2 }}
									/>
								</div>
								<span className="num text-[12px] font-medium text-fg-2">
									<AnimatedNumber value={profile.rank.rr} /> RR
								</span>
							</div>
							<div
								className={clsx(
									"mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium",
									up ? "text-win" : "text-loss",
								)}
							>
								{up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
								<span className="num">
									{signed(profile.rank.lastChange)} RR
								</span>
								<span className="font-normal text-fg-3">última partida</span>
							</div>
						</div>
					</div>

					{!summary && (
						<div className="glass flex w-[230px] flex-col justify-center gap-2 rounded-[20px] px-4 py-3 ring-1 ring-white/[0.08]">
							<Block className="h-2.5 w-28" />
							<Block className="h-7 w-16" />
							<Block className="h-2.5 w-24" />
						</div>
					)}
					{summary && summary.perfN > 0 && (
						<div className="glass flex items-center gap-4 rounded-[20px] py-3 pr-5 pl-4 ring-1 ring-white/[0.08]">
							<div>
								<div className="eyebrow">Performance Score</div>
								<div
									className="num text-[30px] leading-none font-semibold tracking-[-0.03em]"
									style={{ color: perfColor(summary.perf) }}
								>
									<AnimatedNumber value={summary.perf} />
								</div>
								<div className="mt-1.5 text-[12px] text-fg-3">
									media · {summary.perfN} partidas
								</div>
							</div>
							<div className="flex h-12 items-end gap-[3px]" aria-hidden>
								{(["distinction", "merit", "pass", "fail"] as const).map(
									(g) => {
										const n = summary.grades[g] ?? 0
										const max = Math.max(1, ...Object.values(summary.grades))
										const color = {
											distinction: "#ffd60a",
											merit: "#64d2ff",
											pass: "#a1a1a6",
											fail: "#ff5a5f",
										}[g]
										return (
											<motion.span
												key={g}
												title={`${n} · ${g}`}
												className="w-2 rounded-full"
												style={{ background: color, transformOrigin: "bottom" }}
												initial={{ scaleY: 0 }}
												animate={{
													scaleY: 1,
													height: `${Math.max(8, (n / max) * 100)}%`,
												}}
												transition={spring}
											/>
										)
									},
								)}
							</div>
						</div>
					)}

					{profile.peak && (
						<div className="glass flex items-center gap-3 rounded-[20px] py-3 pr-5 pl-3 ring-1 ring-white/[0.08]">
							<RankIcon tier={profile.peak.tier} size={48} />
							<div>
								<div className="eyebrow inline-flex items-center gap-1">
									<Crown size={11} className="text-gold" /> Peak
								</div>
								<div className="text-[15px] font-semibold tracking-[-0.01em]">
									{profile.peak.name}
								</div>
								<div className="text-[12px] text-fg-3 uppercase">
									{profile.peak.season}
								</div>
							</div>
						</div>
					)}
				</motion.div>
			</div>
		</section>
	)
}
