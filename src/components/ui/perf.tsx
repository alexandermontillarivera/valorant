import clsx from "clsx"
import {
	ChevronDown,
	ChevronsDown,
	ChevronsUp,
	ChevronUp,
	Minus,
} from "lucide-react"

export const GRADES: Record<string, { label: string; color: string }> = {
	distinction: { label: "Distinción", color: "#ffd60a" },
	merit: { label: "Mérito", color: "#64d2ff" },
	pass: { label: "Aprobado", color: "#a1a1a6" },
	fail: { label: "Suspenso", color: "#ff5a5f" },
}
export const gradeOf = (g: string) =>
	GRADES[g] ?? { label: g || "—", color: "#6e6e73" }

export function perfColor(score: number) {
	if (score >= 420) return "#ffd60a"
	if (score >= 330) return "#64d2ff"
	if (score >= 230) return "#f5f5f7"
	if (score >= 150) return "#a1a1a6"
	return "#ff5a5f"
}

export function PerfBadge({
	score,
	grade,
	size = "md",
	className,
}: {
	score: number | null | undefined
	grade?: string
	size?: "sm" | "md" | "lg"
	className?: string
}) {
	if (score === null || score === undefined)
		return <span className={clsx("text-fg-4", className)}>—</span>
	const color = perfColor(score)
	return (
		<span
			className={clsx(
				"num inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-inset",
				size === "sm" && "h-6 min-w-10 px-2 text-[12px]",
				size === "md" && "h-7 min-w-12 px-2.5 text-[13px]",
				size === "lg" && "h-9 min-w-16 px-3 text-[16px]",
				className,
			)}
			style={{
				color,
				background: `${color}14`,
				boxShadow: `inset 0 0 0 1px ${color}33`,
			}}
			title={
				grade
					? `Performance Score · ${gradeOf(grade).label}`
					: "Performance Score"
			}
		>
			{score}
		</span>
	)
}

const RATING_ICON = {
	double_up: {
		Icon: ChevronsUp,
		color: "var(--color-win)",
		label: "Muy por encima",
	},
	up: { Icon: ChevronUp, color: "var(--color-win)", label: "Por encima" },
	neutral: { Icon: Minus, color: "var(--color-fg-3)", label: "En la media" },
	down: { Icon: ChevronDown, color: "var(--color-loss)", label: "Por debajo" },
	double_down: {
		Icon: ChevronsDown,
		color: "var(--color-loss)",
		label: "Muy por debajo",
	},
} as const

export function RatingArrow({
	rating,
	size = 14,
}: {
	rating?: string
	size?: number
}) {
	const r =
		RATING_ICON[(rating ?? "neutral") as keyof typeof RATING_ICON] ??
		RATING_ICON.neutral
	return <r.Icon size={size} style={{ color: r.color }} aria-label={r.label} />
}

export const RATING_META = RATING_ICON
