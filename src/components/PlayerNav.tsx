import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, ChevronDown, ChevronLeft, Search, Swords } from "lucide-react"
import clsx from "clsx"
import { spring } from "@/components/ui/primitives"
import type { TrackedPlayer } from "@/interfaces/players"

const normalize = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")

/** Back to profiles, switch profile and jump to versus. Hidden when there's only one profile. */
export function PlayerNav({
	players,
	current,
}: {
	players: TrackedPlayer[]
	current?: string
}) {
	if (players.length < 2) return null
	const versus = current === "versus"
	const button =
		"pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 ring-line transition-colors"

	return (
		<nav className="mb-4 flex items-center gap-2">
			<a
				href="/"
				className={clsx(
					button,
					"bg-white/[0.04] pl-2.5 text-fg-2 hover:bg-white/[0.08] hover:text-fg",
				)}
			>
				<ChevronLeft size={16} />
				<span className="hidden sm:inline">Perfiles</span>
			</a>
			<Switcher players={players} current={versus ? undefined : current} />
			<a
				href={versus || !current ? "/versus" : `/versus?a=${current}`}
				aria-current={versus ? "page" : undefined}
				className={clsx(
					button,
					"ml-auto",
					versus
						? "bg-white/[0.1] text-fg ring-line-strong"
						: "bg-white/[0.04] text-fg-2 hover:bg-white/[0.08] hover:text-fg",
				)}
			>
				<Swords size={15} />
				<span className="hidden sm:inline">
					{versus ? "Versus" : "Comparar"}
				</span>
			</a>
		</nav>
	)
}

function Switcher({
	players,
	current,
}: {
	players: TrackedPlayer[]
	current?: string
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [cursor, setCursor] = useState(0)
	const root = useRef<HTMLDivElement>(null)
	const input = useRef<HTMLInputElement>(null)
	const active = players.find((p) => p.slug === current)
	const searchable = players.length > 6

	const list = useMemo(() => {
		const q = normalize(query.trim())
		return q
			? players.filter((p) => normalize(`${p.name}#${p.tag}`).includes(q))
			: players
	}, [players, query])

	useEffect(() => {
		if (!open) return
		setQuery("")
		setCursor(
			Math.max(
				0,
				players.findIndex((p) => p.slug === current),
			),
		)
		if (searchable) requestAnimationFrame(() => input.current?.focus())
		const onDown = (e: PointerEvent) =>
			root.current?.contains(e.target as Node) || setOpen(false)
		document.addEventListener("pointerdown", onDown)
		return () => document.removeEventListener("pointerdown", onDown)
	}, [open])

	const go = (p: TrackedPlayer | undefined) => {
		if (!p) return
		setOpen(false)
		if (p.slug !== current) location.href = `/p/${p.slug}`
	}

	const onKey = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") setOpen(false)
		else if (e.key === "ArrowDown") {
			e.preventDefault()
			if (!open) setOpen(true)
			else setCursor((c) => Math.min(list.length - 1, c + 1))
		} else if (e.key === "ArrowUp") {
			e.preventDefault()
			setCursor((c) => Math.max(0, c - 1))
		} else if (e.key === "Enter" && open) {
			e.preventDefault()
			go(list[cursor])
		}
	}

	return (
		<div ref={root} className="relative min-w-0" onKeyDown={onKey}>
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="pressable inline-flex h-9 max-w-full min-w-0 items-center gap-2 rounded-full bg-white/[0.04] pr-3 pl-3.5 text-[13px] font-medium ring-1 ring-line transition-colors hover:bg-white/[0.08]"
			>
				<span className="truncate">
					{active ? (
						<PlayerName player={active} />
					) : (
						<span className="text-fg-2">Ver perfil</span>
					)}
				</span>
				<span className="num shrink-0 rounded-full bg-white/[0.07] px-1.5 text-[11px] text-fg-3">
					{players.length}
				</span>
				<ChevronDown
					size={15}
					className={clsx(
						"shrink-0 text-fg-3 transition-transform duration-300",
						open && "rotate-180",
					)}
				/>
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -6, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.98 }}
						transition={{ ...spring, duration: 0.25 }}
						style={{ transformOrigin: "top left" }}
						className="absolute top-11 left-0 z-50 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-elevated shadow-2xl ring-1 ring-line-strong"
					>
						{searchable && (
							<div className="flex items-center gap-2 border-b border-line px-3.5">
								<Search size={14} className="shrink-0 text-fg-3" />
								<input
									ref={input}
									value={query}
									onChange={(e) => {
										setQuery(e.target.value)
										setCursor(0)
									}}
									placeholder="Buscar perfil"
									className="h-11 w-full bg-transparent text-[13px] outline-none placeholder:text-fg-4"
								/>
							</div>
						)}
						<ul
							role="listbox"
							className="max-h-[min(360px,60vh)] overflow-y-auto p-1.5"
						>
							{list.map((p, i) => (
								<li
									key={p.slug}
									role="option"
									aria-selected={p.slug === current}
								>
									<a
										href={`/p/${p.slug}`}
										onMouseEnter={() => setCursor(i)}
										onClick={(e) => {
											e.preventDefault()
											go(p)
										}}
										className={clsx(
											"flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] transition-colors",
											i === cursor && "bg-white/[0.06]",
										)}
									>
										<span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg-2 uppercase">
											{[...p.name][0]}
										</span>
										<span className="min-w-0 flex-1 truncate font-medium">
											<PlayerName player={p} />
										</span>
										{p.slug === current && (
											<Check size={14} className="shrink-0 text-fg-2" />
										)}
									</a>
								</li>
							))}
							{!list.length && (
								<li className="px-3 py-6 text-center text-[13px] text-fg-3">
									Sin resultados
								</li>
							)}
						</ul>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

/** bdi keeps right-to-left names from swapping places with the tag. */
function PlayerName({ player }: { player: TrackedPlayer }) {
	return (
		<>
			<bdi>{player.name}</bdi>
			<span className="font-normal text-fg-3">#{player.tag}</span>
		</>
	)
}
