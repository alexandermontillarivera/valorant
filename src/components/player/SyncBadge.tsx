import { motion } from "motion/react"
import clsx from "clsx"
import { ago } from "@/lib/format"
import { spring } from "@/components/ui/primitives"
import type { SyncStatus } from "@/interfaces/dashboard"

export function SyncBadge({ sync: s }: { sync: SyncStatus }) {
	const progress = s.detailable ? s.detailed / s.detailable : 1
	const label = s.rateLimited
		? "Esperando al límite de la API"
		: s.working
			? `Sincronizando · ${s.detailed}/${s.detailable} con detalle`
			: `Al día${s.lastSyncAt ? ` · ${ago(s.lastSyncAt)}` : ""}`

	return (
		<span
			className={clsx(
				"num inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
				s.rateLimited ? "bg-gold/10 text-gold" : "bg-white/[0.06]",
			)}
			title={`${s.known} de ${s.total} partidas en el historial · ${s.rrPoints} cambios de RR`}
		>
			{s.working ? (
				<svg width="12" height="12" viewBox="0 0 14 14" className="-rotate-90">
					<circle
						cx="7"
						cy="7"
						r="5.5"
						fill="none"
						stroke="rgba(255,255,255,0.12)"
						strokeWidth="2"
					/>
					<motion.circle
						cx="7"
						cy="7"
						r="5.5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeDasharray={34.6}
						animate={{ strokeDashoffset: 34.6 * (1 - progress) }}
						transition={spring}
					/>
				</svg>
			) : (
				<span
					className={clsx(
						"h-1.5 w-1.5 rounded-full",
						s.rateLimited ? "bg-gold" : "bg-win",
					)}
				/>
			)}
			{label}
		</span>
	)
}
