import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"
import { Loader2, UserRound, X } from "lucide-react"
import { useView } from "@/hooks/useView"
import { spring } from "@/components/ui/primitives"
import type { PlayerHit, PlayersView, SearchCriteria } from "@/interfaces/views"

export function PlayerPicker({
	value,
	onChange,
}: {
	value: SearchCriteria["player"]
	onChange: (p: SearchCriteria["player"]) => void
}) {
	const [text, setText] = useState("")
	const [query, setQuery] = useState("")
	const [open, setOpen] = useState(false)
	const [active, setActive] = useState(0)
	const input = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const t = setTimeout(() => setQuery(text.trim()), 180)
		return () => clearTimeout(t)
	}, [text])

	const { data } = useView<PlayersView>("players", { q: query }, open)
	const hits = data?.players ?? []
	useEffect(() => setActive(0), [query])

	const pick = (p: PlayerHit) => {
		onChange({ puuid: p.puuid, name: p.name, tag: p.tag })
		setText("")
		setOpen(false)
	}

	if (value)
		return (
			<span className="flex h-9 w-full items-center gap-2 rounded-xl bg-info/10 pr-1.5 pl-3 text-[13px] text-info ring-1 ring-info/25">
				<UserRound size={13} />
				<span className="min-w-0 flex-1 truncate">
					{value.name}
					<span className="text-info/60">#{value.tag}</span>
				</span>
				<button
					type="button"
					onClick={() => onChange(null)}
					className="pressable grid h-6 w-6 place-items-center rounded-full hover:bg-info/15"
					aria-label="Quitar jugador"
				>
					<X size={12} />
				</button>
			</span>
		)

	return (
		<div className="relative">
			<div className="flex h-9 items-center gap-2 rounded-xl bg-white/[0.05] px-3 ring-1 ring-line focus-within:ring-white/25">
				<UserRound size={13} className="text-fg-3" />
				<input
					ref={input}
					value={text}
					onChange={(e) => {
						setText(e.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setTimeout(() => setOpen(false), 120)}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault()
							setActive((i) => Math.min(hits.length - 1, i + 1))
						} else if (e.key === "ArrowUp") {
							e.preventDefault()
							setActive((i) => Math.max(0, i - 1))
						} else if (e.key === "Enter" && hits[active]) {
							e.preventDefault()
							pick(hits[active])
						} else if (e.key === "Escape") setOpen(false)
					}}
					placeholder="Buscar jugador…"
					className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-fg-4"
					spellCheck={false}
					autoComplete="off"
					aria-label="Filtrar por jugador"
				/>
				{open && !data && (
					<Loader2 size={13} className="animate-spin text-fg-3" />
				)}
			</div>

			<AnimatePresence>
				{open && hits.length > 0 && (
					<motion.ul
						initial={{ opacity: 0, y: -4, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -4, scale: 0.98 }}
						transition={{ ...spring, duration: 0.25 }}
						style={{ transformOrigin: "top left" }}
						className="absolute top-full left-0 z-40 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-elevated p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-line-strong"
					>
						{hits.map((p, i) => (
							<li key={p.puuid}>
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onMouseEnter={() => setActive(i)}
									onClick={() => pick(p)}
									className={clsx(
										"flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left",
										i === active && "bg-white/[0.07]",
									)}
								>
									<span className="min-w-0 truncate text-[13px]">
										{p.name}
										<span className="text-fg-3">#{p.tag}</span>
									</span>
									<span className="num shrink-0 text-[11px] text-fg-3">
										{p.games} {p.games === 1 ? "partida" : "partidas"}
										{p.asAlly > 0 && ` · ${p.asAlly} contigo`}
										{p.asEnemy > 0 && ` · ${p.asEnemy} contra`}
									</span>
								</button>
							</li>
						))}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	)
}
