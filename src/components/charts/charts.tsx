import {
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import clsx from "clsx"
import { spring } from "@/components/ui/primitives"
import type { BarDatum, LinePoint } from "@/interfaces/charts"

function useWidth<T extends HTMLElement>() {
	const ref = useRef<T>(null)
	const [width, setWidth] = useState(0)
	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		setWidth(el.clientWidth)
		const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
		ro.observe(el)
		return () => ro.disconnect()
	}, [])
	return [ref, width] as const
}

function smoothPath(pts: [number, number][]) {
	if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : ""
	const n = pts.length
	const dx: number[] = []
	const m: number[] = []
	for (let i = 0; i < n - 1; i++) {
		dx.push(pts[i + 1][0] - pts[i][0])
		m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1))
	}
	const t: number[] = [m[0]]
	for (let i = 1; i < n - 1; i++)
		t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
	t.push(m[n - 2])
	let d = `M${pts[0][0]},${pts[0][1]}`
	for (let i = 0; i < n - 1; i++) {
		const h = dx[i] / 3
		d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`
	}
	return d
}

function Tooltip({
	x,
	width,
	children,
}: {
	x: number
	width: number
	children: ReactNode
}) {
	const left = Math.max(70, Math.min(width - 70, x))
	return (
		<motion.div
			initial={{ opacity: 0, y: 4, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1, left }}
			exit={{ opacity: 0, y: 4, scale: 0.98 }}
			transition={{ ...spring, duration: 0.25 }}
			className="glass pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl px-3 py-2 text-[12px] whitespace-nowrap shadow-2xl ring-1 ring-line-strong"
		>
			{children}
		</motion.div>
	)
}

export function AreaChart({
	points,
	height = 220,
	color = "#f5f5f7",
	bands = [],
	formatY = (v) => String(Math.round(v)),
}: {
	points: LinePoint[]
	height?: number
	color?: string
	bands?: { y: number; label: string }[]
	formatY?: (v: number) => string
}) {
	const [ref, width] = useWidth<HTMLDivElement>()
	const [hover, setHover] = useState<number | null>(null)
	const pad = { top: 44, right: 12, bottom: 12, left: 12 }

	const { coords, path, area, yOf, visibleBands } = useMemo(() => {
		const ys = points.map((p) => p.y)
		let min = Math.min(...ys)
		let max = Math.max(...ys)
		const span = Math.max(20, max - min)
		min -= span * 0.15
		max += span * 0.15
		const w = Math.max(1, width - pad.left - pad.right)
		const h = height - pad.top - pad.bottom
		const yOf = (v: number) => pad.top + h - ((v - min) / (max - min)) * h
		const coords = points.map((p, i): [number, number] => [
			pad.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w),
			yOf(p.y),
		])
		const path = smoothPath(coords)
		const area = coords.length
			? `${path}L${coords.at(-1)![0]},${height}L${coords[0][0]},${height}Z`
			: ""
		return {
			coords,
			path,
			area,
			yOf,
			visibleBands: bands.filter((b) => b.y > min && b.y < max),
		}
	}, [points, width, height, bands])

	const onMove = (e: React.PointerEvent) => {
		if (!coords.length) return
		const x = e.clientX - e.currentTarget.getBoundingClientRect().left
		let best = 0
		for (let i = 1; i < coords.length; i++)
			if (Math.abs(coords[i][0] - x) < Math.abs(coords[best][0] - x)) best = i
		setHover(best)
	}

	const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`

	return (
		<div
			ref={ref}
			className="relative touch-pan-y select-none"
			style={{ height }}
			onPointerMove={onMove}
			onPointerDown={onMove}
			onPointerLeave={() => setHover(null)}
		>
			{width > 0 && (
				<svg
					width={width}
					height={height}
					className="absolute inset-0 overflow-visible"
				>
					<defs>
						<linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity="0.18" />
							<stop offset="100%" stopColor={color} stopOpacity="0" />
						</linearGradient>
					</defs>
					{visibleBands.map((b) => (
						<g key={b.y}>
							<line
								x1={0}
								x2={width}
								y1={yOf(b.y)}
								y2={yOf(b.y)}
								stroke="rgba(255,255,255,0.07)"
								strokeDasharray="2 4"
							/>
							<text
								x={width - 4}
								y={yOf(b.y) - 6}
								textAnchor="end"
								className="fill-fg-4 text-[10px] font-medium"
							>
								{b.label}
							</text>
						</g>
					))}
					<motion.path
						d={area}
						fill={`url(#${gid})`}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8, delay: 0.3 }}
					/>
					<motion.path
						d={path}
						fill="none"
						stroke={color}
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
					/>
					{hover !== null && coords[hover] && (
						<g>
							<line
								x1={coords[hover][0]}
								x2={coords[hover][0]}
								y1={pad.top - 6}
								y2={height}
								stroke="rgba(255,255,255,0.14)"
							/>
							<circle
								cx={coords[hover][0]}
								cy={coords[hover][1]}
								r={5}
								fill={color}
								stroke="var(--color-bg)"
								strokeWidth={2}
							/>
						</g>
					)}
					{hover === null && coords.length > 0 && (
						<circle
							cx={coords.at(-1)![0]}
							cy={coords.at(-1)![1]}
							r={4}
							fill={color}
							stroke="var(--color-bg)"
							strokeWidth={2}
						/>
					)}
				</svg>
			)}
			<AnimatePresence>
				{hover !== null && points[hover] && (
					<Tooltip key="tt" x={coords[hover]?.[0] ?? 0} width={width}>
						{points[hover].tooltip}
					</Tooltip>
				)}
			</AnimatePresence>
			{!points.length && (
				<div className="grid h-full place-items-center text-fg-3">
					Sin datos todavía
				</div>
			)}
			<span className="sr-only">
				{points.map((p) => formatY(p.y)).join(", ")}
			</span>
		</div>
	)
}

export function BarChart({
	data,
	height = 160,
	average,
	avgLabel,
}: {
	data: BarDatum[]
	height?: number
	average?: number
	avgLabel?: string
}) {
	const [ref, width] = useWidth<HTMLDivElement>()
	const [hover, setHover] = useState<number | null>(null)
	const top = 40
	const max = Math.max(1, ...data.map((d) => d.value), average ?? 0) * 1.08
	const gap = 4
	const bw = data.length
		? Math.max(3, (width - gap * (data.length - 1)) / data.length)
		: 0
	const h = height - top
	const yOf = (v: number) => top + h - (v / max) * h

	return (
		<div
			ref={ref}
			className="relative select-none"
			style={{ height }}
			onPointerLeave={() => setHover(null)}
		>
			{width > 0 && (
				<svg
					width={width}
					height={height}
					className="absolute inset-0 overflow-visible"
				>
					{data.map((d, i) => {
						const x = i * (bw + gap)
						const y = yOf(d.value)
						const active = hover === i
						return (
							<g
								key={i}
								onPointerEnter={() => setHover(i)}
								onClick={d.onClick}
								className={d.onClick ? "cursor-pointer" : undefined}
							>
								<rect
									x={x - gap / 2}
									y={top}
									width={bw + gap}
									height={h}
									fill="transparent"
								/>
								<motion.rect
									x={x}
									width={bw}
									rx={Math.min(4, bw / 2)}
									fill={d.color}
									initial={{ y: top + h, height: 0 }}
									animate={{
										y,
										height: top + h - y,
										opacity: hover === null || active ? 1 : 0.35,
									}}
									transition={{ ...spring, delay: i * 0.015 }}
								/>
							</g>
						)
					})}
					{average !== undefined && (
						<g className="pointer-events-none">
							<line
								x1={0}
								x2={width}
								y1={yOf(average)}
								y2={yOf(average)}
								stroke="rgba(255,255,255,0.35)"
								strokeDasharray="3 4"
							/>
							<text
								x={width}
								y={12}
								textAnchor="end"
								className="fill-fg-3 text-[10px] font-medium"
							>
								{avgLabel}
							</text>
						</g>
					)}
				</svg>
			)}
			<AnimatePresence>
				{hover !== null && data[hover] && (
					<Tooltip key="tt" x={hover * (bw + gap) + bw / 2} width={width}>
						{data[hover].tooltip}
					</Tooltip>
				)}
			</AnimatePresence>
		</div>
	)
}

export function Sparkline({
	values,
	color = "rgba(255,255,255,0.5)",
	className,
}: {
	values: number[]
	color?: string
	className?: string
}) {
	const w = 100
	const h = 28
	if (values.length < 2) return <div className={className} />
	const min = Math.min(...values)
	const max = Math.max(...values)
	const pts = values.map((v, i): [number, number] => [
		(i / (values.length - 1)) * w,
		h - 2 - ((v - min) / (max - min || 1)) * (h - 4),
	])
	return (
		<motion.div
			className={className}
			initial={{ clipPath: "inset(0 100% 0 0)" }}
			animate={{ clipPath: "inset(0 0% 0 0)" }}
			transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
		>
			<svg
				viewBox={`0 0 ${w} ${h}`}
				preserveAspectRatio="none"
				className="h-full w-full overflow-visible"
			>
				<path
					d={smoothPath(pts)}
					fill="none"
					stroke={color}
					strokeWidth={1.5}
					vectorEffect="non-scaling-stroke"
					strokeLinecap="round"
				/>
			</svg>
		</motion.div>
	)
}

export function Ring({
	value,
	size = 120,
	stroke = 10,
	color = "var(--color-win)",
	children,
}: {
	value: number
	size?: number
	stroke?: number
	color?: string
	children?: ReactNode
}) {
	const r = (size - stroke) / 2
	const c = 2 * Math.PI * r
	return (
		<div
			className="relative grid place-items-center"
			style={{ width: size, height: size }}
		>
			<svg width={size} height={size} className="-rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="rgba(255,255,255,0.07)"
					strokeWidth={stroke}
				/>
				<motion.circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={color}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={c}
					initial={{ strokeDashoffset: c }}
					animate={{
						strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))),
					}}
					transition={{ type: "spring", bounce: 0, duration: 1.2 }}
				/>
			</svg>
			<div className="absolute inset-0 grid place-items-center text-center">
				{children}
			</div>
		</div>
	)
}
