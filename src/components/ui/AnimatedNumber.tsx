import { useEffect, useRef } from "react"
import { animate, useReducedMotion } from "motion/react"

export function AnimatedNumber({
	value,
	format = (v) => v.toFixed(0),
	className,
}: {
	value: number
	format?: (v: number) => string
	className?: string
}) {
	const ref = useRef<HTMLSpanElement>(null)
	const from = useRef(0)
	const reduce = useReducedMotion()

	useEffect(() => {
		const el = ref.current
		if (!el || !Number.isFinite(value)) return
		if (reduce) {
			el.textContent = format(value)
			from.current = value
			return
		}
		// Start from whatever is on screen right now, so an interrupted count re-targets smoothly.
		const controls = animate(from.current, value, {
			type: "spring",
			bounce: 0,
			duration: 0.9,
			onUpdate: (v) => {
				from.current = v
				el.textContent = format(v)
			},
		})
		return () => controls.stop()
	}, [value, reduce])

	return (
		<span ref={ref} className={className}>
			{format(reduce && Number.isFinite(value) ? value : 0)}
		</span>
	)
}
