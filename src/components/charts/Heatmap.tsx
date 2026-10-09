import { useId, useMemo } from "react"
import { motion } from "motion/react"
import { Img } from "@/components/ui/primitives"
import type { MapInfo } from "@/interfaces/catalog"

export function Heatmap({
	map,
	points,
	show,
}: {
	map: MapInfo
	points: [number, number, 0 | 1][]
	show: "kills" | "deaths" | "both"
}) {
	const id = useId().replace(/[^a-zA-Z0-9]/g, "")
	const dots = useMemo(
		() =>
			points
				.filter(
					(p) =>
						show === "both" || (show === "kills" ? p[2] === 0 : p[2] === 1),
				)
				.map(([x, y, kind]) => ({
					u: y * map.xMul + map.xAdd,
					v: x * map.yMul + map.yAdd,
					kind,
				}))
				.filter((d) => d.u > 0 && d.u < 1 && d.v > 0 && d.v < 1),
		[points, show, map],
	)

	return (
		<div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[22px] bg-white/[0.02] ring-1 ring-line">
			<Img
				src={map.minimap}
				alt={`Minimapa de ${map.name}`}
				className="absolute inset-0 h-full w-full object-contain opacity-55"
			/>
			<svg viewBox="0 0 1000 1000" className="absolute inset-0 h-full w-full">
				<defs>
					<radialGradient id={`k${id}`}>
						<stop offset="0%" stopColor="#32d583" stopOpacity="0.55" />
						<stop offset="100%" stopColor="#32d583" stopOpacity="0" />
					</radialGradient>
					<radialGradient id={`d${id}`}>
						<stop offset="0%" stopColor="#ff4655" stopOpacity="0.55" />
						<stop offset="100%" stopColor="#ff4655" stopOpacity="0" />
					</radialGradient>
				</defs>
				<g style={{ mixBlendMode: "screen" }}>
					{dots.map((d, i) => (
						<circle
							key={`g${i}`}
							cx={d.u * 1000}
							cy={d.v * 1000}
							r={34}
							fill={`url(#${d.kind === 0 ? "k" : "d"}${id})`}
						/>
					))}
				</g>
				{dots.map((d, i) => (
					<motion.circle
						key={i}
						cx={d.u * 1000}
						cy={d.v * 1000}
						r={5}
						fill={d.kind === 0 ? "#32d583" : "#ff4655"}
						stroke="rgba(0,0,0,0.6)"
						strokeWidth={1.5}
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 0.9, scale: 1 }}
						transition={{
							type: "spring",
							bounce: 0,
							duration: 0.4,
							delay: Math.min(i, 200) * 0.002,
						}}
					/>
				))}
			</svg>
			{!dots.length && (
				<div className="absolute inset-0 grid place-items-center text-[13px] text-fg-3">
					Sin posiciones registradas
				</div>
			)}
		</div>
	)
}
