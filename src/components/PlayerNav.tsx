import { motion } from "motion/react"
import { LayoutGrid, Swords } from "lucide-react"
import clsx from "clsx"
import { spring } from "@/components/ui/primitives"
import type { TrackedPlayer } from "@/interfaces/players"

/** Switches between tracked profiles and the versus screen. Hidden when there's only one profile. */
export function PlayerNav({
	players,
	current,
}: {
	players: TrackedPlayer[]
	current?: string
}) {
	if (players.length < 2) return null
	const item =
		"pressable relative isolate inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors"
	const active = (on: boolean) => (on ? "text-fg" : "text-fg-3 hover:text-fg-2")
	const pill = (
		<motion.span
			layoutId="player-nav"
			className="absolute inset-0 -z-10 rounded-full bg-white/[0.09] ring-1 ring-white/[0.08]"
			transition={spring}
		/>
	)
	return (
		<nav className="mb-4 flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
			<a
				href="/"
				className={clsx(item, active(!current))}
				aria-label="Perfiles"
			>
				{!current && pill}
				<LayoutGrid size={14} />
			</a>
			{players.map((p) => (
				<a
					key={p.slug}
					href={`/p/${p.slug}`}
					className={clsx(item, active(current === p.slug))}
				>
					{current === p.slug && pill}
					{p.name}
					<span className="font-normal text-fg-3">#{p.tag}</span>
				</a>
			))}
			<a
				href="/versus"
				className={clsx(item, "ml-auto", active(current === "versus"))}
			>
				{current === "versus" && pill}
				<Swords size={14} /> Versus
			</a>
		</nav>
	)
}
